"use server";

import { createAdminClient, createSessionClient } from "../lib/server/appwrite.ts";
import { resolveAppOrigin } from "../lib/server/app-origin.ts";
import { mapTenantDocument, normalizeTenantRole, tenantRoleForUser } from "../lib/server/auth-tenants.ts";
import { getAuthorizedTenantDocument } from "../lib/server/tenant-access.ts";
import { sanitizeNextPath } from "../lib/auth-redirect.ts";
import { isRateLimited, verifyTurnstileToken, isCaptchaRequired, validateTurnstileConfig, getClientIp } from "../lib/server/rate-limit.ts";
import { getHeaders, getCookies } from "../lib/server/headers-wrapper.ts";
import { ID, Permission, Role, type Models } from "node-appwrite";

export type AuthUser = {
  $id: string;
  email: string;
  name: string;
  prefs: {
    tenant_id?: string;
    role?: "admin" | "agent";
    [key: string]: unknown;
  };
};

export type AuthTenant = {
  $id: string;
  name: string;
  plan: string;
  balance: number;
  role: "admin" | "agent";
};
export async function loginWithMagicLink(
  email: string,
  options?: { captchaToken?: string; nextPath?: string }
) {
  const captchaToken = options?.captchaToken;
  const nextPath = options?.nextPath;

  // Validate email format and length before any other operations
  if (!email || typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Invalid email address format." };
  }

  // Resolve client IP
  const headersList = await getHeaders();
  const ip = await getClientIp(headersList);

  // A. Turnstile verification (Primary gatekeeper)
  if (isCaptchaRequired()) {
    const config = validateTurnstileConfig();
    if (!config.valid) {
      console.error(
        `[Turnstile] Misconfigured Turnstile environment variables. Site Key: ${config.siteKeySet ? "set" : "missing"}, Secret Key: ${config.secretKeySet ? "set" : "missing"}`
      );
      return { success: false, error: "Security check is misconfigured. Please contact support." };
    }

    if (!captchaToken) {
      return { success: false, error: "Security check is missing. Please complete the captcha." };
    }
    const isHuman = await verifyTurnstileToken(captchaToken, ip);
    if (!isHuman) {
      return { success: false, error: "Security check failed. Please try again." };
    }
  }

  // B. Rate limiting validation (Defense-in-depth, run only if captcha passed)
  const rateLimitResult = await isRateLimited(email, ip);
  if (rateLimitResult.limited) {
    return { success: false, error: rateLimitResult.reason };
  }

  const { account } = await createAdminClient();

  try {
    const headersList = await getHeaders();
    const origin = resolveAppOrigin(headersList);
    // Defense in depth: callers (login page, AuthAwareCta) already
    // sanitize `nextPath`, but re-sanitizing here means a future caller
    // that forgets won't quietly open-redirect.
    const safeNext = sanitizeNextPath(nextPath);
    const verifyUrl = safeNext
      ? `${origin}/verify?next=${encodeURIComponent(safeNext)}`
      : `${origin}/verify`;

    await account.createMagicURLToken({
      userId: ID.unique(),
      email,
      url: verifyUrl,
    });
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function verifyMagicLink(userId: string, secret: string) {
  const { account } = await createAdminClient();
  
  try {
    const session = await account.createSession({ userId, secret });
    const jar = await getCookies();

    // Purge any stale/blank session cookie before writing the new one.
    // Without this, browsers with a leftover blank cookie will have two
    // 'session' headers and the server may pick up the wrong one.
    jar.delete("session");
    jar.set("session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(session.expire),
    });

    const tenantResult = await ensureTenantForUser(userId);
    if (!tenantResult.success) {
      throw new Error(tenantResult.error);
    }
    
    const { users } = await createAdminClient();
    const user = await users.get(userId);
    return { success: true, user: serializeUser(user), tenant: tenantResult.tenant };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getCurrentUser(): Promise<{ success: true; user: AuthUser } | { success: false; error: string }> {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();
    return { success: true, user: serializeUser(user) };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getCurrentTenant(): Promise<{ success: true; tenant: AuthTenant } | { success: false; error: string }> {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();
    const prefs = user.prefs as AuthUser["prefs"];
    const tenantId = typeof prefs.tenant_id === "string" ? prefs.tenant_id : "";

    if (tenantId) {
      const tenant = await getAuthorizedTenantDocument(user.$id, tenantId);
      const role = normalizeTenantRole(prefs.role) ?? tenantRoleForUser(tenant, user.$id);
      return { success: true, tenant: mapTenantDocument(tenant, role) };
    }

    const tenantResult = await ensureTenantForUser(user.$id);

    if (!tenantResult.success) {
      throw new Error(tenantResult.error);
    }

    return { success: true, tenant: tenantResult.tenant };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function logoutSession() {
  try {
    const { account } = await createSessionClient();
    await account.deleteSession("current");
  } catch {
    // Expire the browser cookie even when the Appwrite session is already gone.
  }

  await clearSessionCookie();
  return { success: true };
}

async function clearSessionCookie() {
  const jar = await getCookies();
  // Belt-and-suspenders: delete + expire to handle both HttpOnly and any
  // client-visible duplicates that may have been created by old code.
  jar.delete("session");
  jar.set("session", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0, // Immediately expire
  });
}

export async function ensureTenant(userId: string) {
  try {
    const { account } = await createSessionClient();
    const currentUser = await account.get();
    if (currentUser.$id !== userId) {
      throw new Error("You cannot provision another operator.");
    }

    const result = await ensureTenantForUser(userId);
    if (!result.success) {
      throw new Error(result.error);
    }

    return { success: true, tenantId: result.tenant.$id };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

async function ensureTenantForUser(userId: string): Promise<{ success: true; tenant: AuthTenant } | { success: false; error: string }> {
  try {
    const { users, databases } = await createAdminClient();
    const user = await users.get(userId);
    const prefs = user.prefs as AuthUser["prefs"];
    let tenantId = typeof prefs.tenant_id === "string" ? prefs.tenant_id : "";
    let role: AuthTenant["role"] = normalizeTenantRole(prefs.role) ?? "agent";

    if (!tenantId) {
      tenantId = ID.unique();
      role = "admin";

      await databases.createDocument(
        databaseId(),
        tenantsCollectionId(),
        tenantId,
        {
          name: "My Workspace",
          plan: "free",
          credits: 100,
        },
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ],
      );

      await users.updatePrefs(userId, {
        ...prefs,
        tenant_id: tenantId,
        role,
      });
    }

    const tenant = await getAuthorizedTenantDocument(userId, tenantId);
    const inferredRole = tenantRoleForUser(tenant, userId);
    role = normalizeTenantRole(prefs.role) ?? inferredRole;
    if (!normalizeTenantRole(prefs.role)) {
      await users.updatePrefs(userId, {
        ...prefs,
        tenant_id: tenantId,
        role,
      });
    }
    return {
      success: true,
      tenant: mapTenantDocument(tenant, role),
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

function serializeUser(user: Models.User<Models.Preferences>): AuthUser {
  const prefs = user.prefs as AuthUser["prefs"];
  return {
    $id: user.$id,
    email: user.email,
    name: user.name,
    prefs: {
      ...prefs,
      tenant_id: typeof prefs.tenant_id === "string" ? prefs.tenant_id : undefined,
      role: prefs.role === "admin" || prefs.role === "agent" ? prefs.role : undefined,
    },
  };
}

function databaseId() {
  return process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "agentdesk";
}

function tenantsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_TENANTS_COLLECTION_ID || process.env.APPWRITE_TENANTS_COLLECTION_ID || "tenants";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Authentication request failed.";
}

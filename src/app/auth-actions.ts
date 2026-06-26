"use server";

import { createAdminClient, createSessionClient } from "@/lib/server/appwrite";
import { resolveAppOrigin } from "@/lib/server/app-origin";
import { mapTenantDocument, normalizeTenantRole, tenantRoleForUser } from "@/lib/server/auth-tenants";
import { getAuthorizedTenantDocument } from "@/lib/server/tenant-access";
import { sanitizeNextPath } from "@/lib/auth-redirect";
import { incrementCacheKey } from "@/lib/server/monitor-cache";
import { cookies, headers } from "next/headers";
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

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const rawIp = headersList.get("cf-connecting-ip") ||
                headersList.get("x-real-ip") ||
                headersList.get("x-forwarded-for") ||
                "";
  
  if (!rawIp) {
    return "unknown-ip";
  }

  // Treat comma-separated lists (e.g. from multiple proxies) by taking the first IP (leftmost)
  return rawIp.split(",")[0].trim();
}

async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Enforce configuration consistency
  if (siteKey || secretKey) {
    if (!siteKey || !secretKey) {
      console.error(
        `[Turnstile] Misconfigured Turnstile environment variables. Site Key: ${siteKey ? "set" : "missing"}, Secret Key: ${secretKey ? "set" : "missing"}`
      );
      return false; // Fail-closed
    }
  } else {
    // Both keys are missing. Fail-closed in production, allow bypass in local dev
    if (process.env.NODE_ENV === "production") {
      console.error("[Turnstile] CAPTCHA keys are missing in production environment.");
      return false; // Fail-closed
    }
    return true; // Pass in local development if not configured
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });

    const outcome = await res.json();
    
    if (!outcome.success) {
      console.warn("[Turnstile] Verification failed. Error codes:", outcome["error-codes"]);
      return false;
    }

    if (outcome.action !== "login") {
      console.warn(`[Turnstile] Action mismatch. Expected 'login', got '${outcome.action}'`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return false; // Fail-closed
  }
}

async function isRateLimited(email: string, ip: string): Promise<{ limited: boolean; reason?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = `rate-limit:email:${normalizedEmail}`;
    const ipKey = `rate-limit:ip:${ip}`;

    // Check/Increment email limit: Max 4 requests per 10 minutes (600s)
    const emailCount = await incrementCacheKey(emailKey, 600);
    if (emailCount > 4) {
      return { limited: true, reason: "Too many login attempts. Please try again in 10 minutes." };
    }

    // Check/Increment IP limit: Max 5 requests per 10 minutes (600s)
    const ipCount = await incrementCacheKey(ipKey, 600);
    if (ipCount > 5) {
      return { limited: true, reason: "Too many login attempts. Please try again in 10 minutes." };
    }

    return { limited: false };
  } catch (error) {
    console.error("Rate limiting check error (failing open):", error);
    return { limited: false };
  }
}

export async function loginWithMagicLink(email: string, captchaToken?: string, nextPath?: string) {
  // Validate email format and length before any other operations
  if (!email || typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Invalid email address format." };
  }

  // Resolve client IP
  const ip = await getClientIp();
  if (ip === "unknown-ip") {
    return { success: false, error: "Unable to verify client identity. Connection security check failed." };
  }

  // A. Turnstile verification (Primary gatekeeper)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const isCaptchaRequired = !!(siteKey || secretKey || process.env.NODE_ENV === "production");

  if (isCaptchaRequired) {
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
    const headersList = await headers();
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
    const jar = await cookies();

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
  const jar = await cookies();
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

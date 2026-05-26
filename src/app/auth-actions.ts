"use server";

import { createAdminClient, createSessionClient } from "@/lib/server/appwrite";
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

type TenantDocument = Models.Document & {
  name?: unknown;
  plan?: unknown;
  credits?: unknown;
  balance?: unknown;
};

export async function loginWithMagicLink(email: string) {
  const { account } = await createAdminClient();
  
  try {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") || "http";
    const dynamicOrigin = `${protocol}://${host}`;
    const origin = process.env.NEXT_PUBLIC_APP_URL || dynamicOrigin;
    
    await account.createMagicURLToken({
      userId: ID.unique(),
      email,
      url: `${origin}/verify`,
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
    let role = prefs.role === "admin" || prefs.role === "agent" ? prefs.role : "agent";

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

    const tenant = (await databases.getDocument(databaseId(), tenantsCollectionId(), tenantId)) as TenantDocument;
    return {
      success: true,
      tenant: {
        $id: tenant.$id,
        name: stringValue(tenant.name, "Workspace"),
        plan: stringValue(tenant.plan, "free"),
        balance: numberValue(tenant.credits ?? tenant.balance),
        role,
      },
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

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Authentication request failed.";
}

"use server";

import { createGuestClient } from "@/lib/server/appwrite";
import { cookies } from "next/headers";
import { ID } from "node-appwrite";

export async function loginWithMagicLink(email: string) {
  const { account } = await createGuestClient();
  
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await account.createMagicURLToken(
      ID.unique(),
      email,
      `${origin}/verify`
    );
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function verifyMagicLink(userId: string, secret: string) {
  const { account } = await createGuestClient();
  
  try {
    const session = await account.updateMagicURLSession(userId, secret);
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
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Authentication request failed.";
}

export async function clearSessionCookie() {
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

export async function setSessionCookie(secret: string) {
  (await cookies()).set("session", secret, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function syncSession(secret: string) {
  if (!secret) return { success: false };
  (await cookies()).set("session", secret, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { success: true };
}

export async function ensureTenant(userId: string) {
  try {
    const { createAdminClient } = await import("@/lib/server/appwrite");
    const adminClient = await createAdminClient();
    const adminUsers = adminClient.users;
    const adminDatabases = adminClient.databases;
    
    const user = await adminUsers.get(userId);
    
    if (!user.prefs.tenant_id) {
      const { ID, Permission, Role } = await import("node-appwrite");
      const tenantId = ID.unique();
      
      await adminDatabases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "agentdesk",
        process.env.NEXT_PUBLIC_APPWRITE_TENANTS_COLLECTION_ID || process.env.APPWRITE_TENANTS_COLLECTION_ID || "tenants",
        tenantId,
        {
          name: "My Workspace",
          plan: "free",
          credits: 100,
        },
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId))
        ]
      );
      
      await adminUsers.updatePrefs(userId, {
        ...user.prefs,
        tenant_id: tenantId,
        role: "admin"
      });
      
      return { success: true, tenantId };
    }
    
    return { success: true, tenantId: user.prefs.tenant_id };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

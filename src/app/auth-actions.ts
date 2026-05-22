"use server";

import { createAdminClient } from "@/lib/server/appwrite";
import { cookies } from "next/headers";
import { ID } from "node-appwrite";

export async function loginWithMagicLink(email: string) {
  const { account } = await createAdminClient();
  
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
  const { account } = await createAdminClient();
  
  try {
    const session = await account.createSession(userId, secret);
    
    (await cookies()).set("session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Authentication request failed.";
}

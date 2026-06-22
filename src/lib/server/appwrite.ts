"use server";
 
import { Client, Account, Databases, Storage, Users } from "node-appwrite";
 
export async function createSessionClient() {
  if (process.env.NODE_ENV === "test") {
    const dummyClient = new Client();
    return {
      get account() {
        return new Account(dummyClient);
      },
      get databases() {
        return new Databases(dummyClient);
      },
      get storage() {
        return new Storage(dummyClient);
      }
    };
  }

  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(projectId);

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  // Appwrite session secrets are long tokens (>10 chars). Filter out any blank/stale
  // phantom cookies that may have been left behind by incorrect client-side logout code.
  const MIN_SECRET_LENGTH = 10;
  const findValidSecret = (name: string) =>
    cookieStore.getAll(name).find((c: { name: string; value: string }) => c.value.length >= MIN_SECRET_LENGTH)?.value;

  const sessionSecret =
    findValidSecret("session") ??
    findValidSecret(`a_session_${projectId.toLowerCase()}`) ??
    findValidSecret(`a_session_${projectId.toLowerCase()}_legacy`);

  if (!sessionSecret) {
    throw new Error("No session. Received cookies: " + cookieStore.getAll().map((c: { name: string; value: string }) => c.name).join(", "));
  }

  client.setSession(sessionSecret);

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    }
  };
}

export async function createGuestClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "");

  return {
    get account() {
      return new Account(client);
    },
  };
}

/**
 * Module-level admin client singleton.
 *
 * The admin client carries only the API key (no per-request cookies), so it is
 * safe to share across calls within the same Node.js process.  Reusing the
 * underlying Client avoids repeated object construction on every server action
 * while keeping the per-request session client unchanged.
 */
let adminClient: {
  account: Account;
  databases: Databases;
  storage: Storage;
  users: Users;
} | null = null;

export async function createAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "")
    .setKey(process.env.APPWRITE_API_KEY || "");

  adminClient = {
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
  };

  return adminClient;
}

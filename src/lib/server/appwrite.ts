"use server";

import { Client, Account, Databases, Storage, Users } from "node-appwrite";
import { cookies } from "next/headers";

export async function createSessionClient() {
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(projectId);

  const cookieStore = await cookies();

  // Appwrite session secrets are long tokens (>10 chars). Filter out any blank/stale
  // phantom cookies that may have been left behind by incorrect client-side logout code.
  const MIN_SECRET_LENGTH = 10;
  const findValidSecret = (name: string) =>
    cookieStore.getAll(name).find(c => c.value.length >= MIN_SECRET_LENGTH)?.value;

  const sessionSecret =
    findValidSecret("session") ??
    findValidSecret(`a_session_${projectId.toLowerCase()}`) ??
    findValidSecret(`a_session_${projectId.toLowerCase()}_legacy`);

  if (!sessionSecret) {
    throw new Error("No session. Received cookies: " + cookieStore.getAll().map(c => c.name).join(", "));
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

export async function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "")
    .setKey(process.env.APPWRITE_API_KEY || "");

  return {
    get account() {
      return new Account(client);
    },
    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    },
    get users() {
      return new Users(client);
    },
  };
}

import { Client, Databases, Query } from "node-appwrite";
import { Redis as UpstashRedis } from "@upstash/redis";

const SESSION_STATUSES = new Set(["active", "paused_by_human", "closed"]);
const KEY_PREFIX = "agentdesk:session";

export function createSessionStore(options = {}) {
  if (options.sessionState) {
    return createMemorySessionStore(options.sessionState);
  }

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.info("Using Upstash Redis REST for websocket session state.");
    return createUpstashSessionStore(redis);
  }

  console.info("Using in-memory websocket session state. Set Upstash Redis REST env vars for durable shared state.");
  return createMemorySessionStore(new Map());
}

export function createMemorySessionStore(sessionState = new Map()) {
  return {
    type: "memory",
    sessionState,
    async get(room) {
      return sessionState.get(stateKey(room)) ?? null;
    },
    async set(room, state) {
      sessionState.set(stateKey(room), state);
    },
  };
}

function createUpstashSessionStore(redis) {
  return {
    type: "upstash",
    async get(room) {
      const value = await redis.get(stateKey(room));
      if (!value || typeof value !== "object") {
        return null;
      }

      return sanitizeState(room, value);
    },
    async set(room, state) {
      await redis.set(stateKey(room), state);
    },
  };
}

export async function readAppwriteSessionStatus(room) {
  const databases = createAppwriteDatabases();
  if (!databases) {
    return null;
  }

  const session = await findAppwriteSession(databases, room);
  return normalizeSessionStatus(session?.status);
}

export async function persistAppwriteSessionStatus(room, status) {
  if (!SESSION_STATUSES.has(status)) {
    throw new Error("Invalid session status.");
  }

  const databases = createAppwriteDatabases();
  if (!databases) {
    return null;
  }

  const session = await findAppwriteSession(databases, room);
  if (!session) {
    return null;
  }

  await databases.updateDocument(databaseId(), sessionsCollectionId(), session.$id, {
    status,
    updated: new Date().toISOString(),
  });

  return session.$id;
}

export function defaultSessionState(room) {
  return {
    tenant_id: room.tenant_id,
    session_id: room.session_id,
    status: "active",
    updated_by: "system",
    updated_at: new Date().toISOString(),
  };
}

export function stateKey(room) {
  return `${KEY_PREFIX}:${room.tenant_id}:${room.session_id}`;
}

function createAppwriteDatabases() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!endpoint || !projectId || !apiKey) {
    return null;
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

async function findAppwriteSession(databases, room) {
  const result = await databases.listDocuments(databaseId(), sessionsCollectionId(), [
    Query.equal("tenant_id", room.tenant_id),
    Query.equal("session_token", room.session_id),
    Query.limit(1),
  ]);

  return result.documents[0] ?? null;
}

function sanitizeState(room, value) {
  return {
    tenant_id: room.tenant_id,
    session_id: room.session_id,
    status: normalizeSessionStatus(value.status) ?? "active",
    updated_by: typeof value.updated_by === "string" ? value.updated_by : "system",
    updated_at: typeof value.updated_at === "string" ? value.updated_at : new Date().toISOString(),
  };
}

function normalizeSessionStatus(value) {
  return value === "paused_by_human" || value === "closed" ? value : value === "active" ? "active" : null;
}

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function sessionsCollectionId() {
  return process.env.APPWRITE_SESSIONS_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_SESSIONS_COLLECTION_ID ?? "sessions";
}

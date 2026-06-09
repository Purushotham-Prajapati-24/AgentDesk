import { Client, Databases, Operator, Query } from "node-appwrite";
import { Redis as UpstashRedis } from "@upstash/redis";
import { createHash } from "node:crypto";

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

  const previousStatus = normalizeSessionStatus(session.status) ?? "active";
  await databases.updateDocument(databaseId(), sessionsCollectionId(), session.$id, {
    status,
    updated: new Date().toISOString(),
  });
  await updateStatusRollupBestEffort(databases, session, previousStatus, status);

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

async function updateStatusRollupBestEffort(databases, session, previousStatus, nextStatus) {
  if (previousStatus === nextStatus || typeof session.tenant_id !== "string") {
    return;
  }

  try {
    const documentId = stableId(`tenant_${session.tenant_id}`);
    await ensureTenantRollup(databases, session.tenant_id, documentId);
    const now = new Date().toISOString();
    const update = {
      [statusCounterKey(previousStatus)]: Operator.increment(-1),
      [statusCounterKey(nextStatus)]: Operator.increment(1),
      updated: now,
    };
    if (nextStatus === "paused_by_human") {
      update.handoffs = Operator.increment(1);
    }
    await databases.updateDocument(databaseId(), tenantRollupsCollectionId(), documentId, update);
    await invalidateMonitorCache(session.tenant_id);
  } catch (error) {
    console.warn("[session-store] status rollup update failed", error);
  }
}

async function ensureTenantRollup(databases, tenantId, documentId) {
  try {
    await databases.getDocument(databaseId(), tenantRollupsCollectionId(), documentId);
  } catch (error) {
    if (error.code !== 404) {
      throw error;
    }

    try {
      await databases.createDocument(databaseId(), tenantRollupsCollectionId(), documentId, {
        tenant_id: tenantId,
        conversations: 0,
        active_sessions: 0,
        paused_sessions: 0,
        closed_sessions: 0,
        messages: 0,
        customer_messages: 0,
        bot_messages: 0,
        agent_messages: 0,
        handoffs: 0,
        document_storage_bytes: 0,
        credit_balance: 0,
        updated: new Date().toISOString(),
      });
    } catch (createError) {
      if (createError.code !== 409) {
        throw createError;
      }
    }
  }
}

async function invalidateMonitorCache(tenantId) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return;
  }

  const redis = new UpstashRedis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  for (const scope of ["conversations", "users", "analytics"]) {
    for await (const keys of scanKeys(redis, `monitor:${tenantId}:${scope}:*`)) {
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  }
}

async function* scanKeys(redis, pattern) {
  let cursor = "0";
  do {
    const result = await redis.scan(cursor, { match: pattern, count: 100 });
    cursor = String(result[0]);
    yield result[1] ?? [];
  } while (cursor !== "0");
}

function statusCounterKey(status) {
  return status === "paused_by_human" ? "paused_sessions" : `${status}_sessions`;
}

function stableId(value) {
  const clean = value.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const hash = createHash("sha1").update(value).digest("hex").slice(0, 10);
  return `${clean.slice(0, 25)}_${hash}`.slice(0, 36);
}

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function sessionsCollectionId() {
  return process.env.APPWRITE_SESSIONS_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_SESSIONS_COLLECTION_ID ?? "sessions";
}

function tenantRollupsCollectionId() {
  return process.env.APPWRITE_MONITOR_TENANT_ROLLUPS_COLLECTION_ID ?? "monitor_tenant_rollups";
}

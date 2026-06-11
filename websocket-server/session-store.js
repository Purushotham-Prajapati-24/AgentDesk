import { Client, Databases, ID, Operator, Query } from "node-appwrite";
import { Redis as UpstashRedis } from "@upstash/redis";
import { createHash } from "node:crypto";

const SESSION_STATUSES = new Set(["active", "paused_by_human", "closed"]);
const KEY_PREFIX = "agentdesk:session";
let monitorCacheRedis = null;

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

export async function persistAppwriteAgentMessage(room, content, createdAt) {
  const databases = createAppwriteDatabases();
  if (!databases) {
    throw new Error("Appwrite persistence is not configured.");
  }

  const session = await findAppwriteSession(databases, room);
  if (!session) {
    throw new Error("Session was not found in Appwrite.");
  }

  const message = await databases.createDocument(databaseId(), messagesCollectionId(), ID.unique(), {
    tenant_id: room.tenant_id,
    session_id: session.$id,
    sender: "agent",
    content: content.slice(0, 4000),
    tokens_used: 0,
    created: createdAt,
  });

  await updateAgentMessageRollupBestEffort(databases, session, content, createdAt);
  return message.$id;
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
    await ensureTenantRollup(databases, session.tenant_id, documentId, {
      [statusCounterKey(previousStatus)]: 1,
    });
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

async function updateAgentMessageRollupBestEffort(databases, session, content, createdAt) {
  if (typeof session.tenant_id !== "string") {
    return;
  }

  try {
    await databases.updateDocument(databaseId(), sessionsCollectionId(), session.$id, {
      message_count: Operator.increment(1),
      agent_message_count: Operator.increment(1),
      last_message_content: content.slice(0, 1000),
      last_sender: "agent",
      last_message_at: createdAt,
      updated: createdAt,
    });

    const tenantDocumentId = stableId(`tenant_${session.tenant_id}`);
    await ensureTenantRollup(databases, session.tenant_id, tenantDocumentId);
    await databases.updateDocument(databaseId(), tenantRollupsCollectionId(), tenantDocumentId, {
      messages: Operator.increment(1),
      agent_messages: Operator.increment(1),
      updated: new Date().toISOString(),
    });

    const date = dateKey(new Date(createdAt));
    const dailyDocumentId = stableId(`daily_${session.tenant_id}_${date}`);
    await ensureDailyRollup(databases, session.tenant_id, date, dailyDocumentId);
    await databases.updateDocument(databaseId(), dailyRollupsCollectionId(), dailyDocumentId, {
      messages: Operator.increment(1),
      agent_messages: Operator.increment(1),
      updated: new Date().toISOString(),
    });

    const botId = typeof session.bot_id === "string" ? session.bot_id : "";
    if (botId) {
      const botDocumentId = stableId(`bot_${session.tenant_id}_${botId}`);
      await ensureBotRollup(databases, session.tenant_id, botId, botDocumentId);
      await databases.updateDocument(databaseId(), botRollupsCollectionId(), botDocumentId, {
        messages: Operator.increment(1),
        updated: new Date().toISOString(),
      });
    }

    await invalidateMonitorCache(session.tenant_id);
  } catch (error) {
    console.warn("[session-store] agent message rollup update failed", error);
  }
}

async function ensureTenantRollup(databases, tenantId, documentId, counters = {}) {
  try {
    await databases.getDocument(databaseId(), tenantRollupsCollectionId(), documentId);
    return false;
  } catch (error) {
    if (error.code !== 404) {
      throw error;
    }

    try {
      await databases.createDocument(databaseId(), tenantRollupsCollectionId(), documentId, {
        tenant_id: tenantId,
        conversations: 0,
        active_sessions: counters.active_sessions ?? 0,
        paused_sessions: counters.paused_sessions ?? 0,
        closed_sessions: counters.closed_sessions ?? 0,
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
      return false;
    }
    return true;
  }
}

async function ensureDailyRollup(databases, tenantId, date, documentId) {
  try {
    await databases.getDocument(databaseId(), dailyRollupsCollectionId(), documentId);
    return false;
  } catch (error) {
    if (error.code !== 404) {
      throw error;
    }

    try {
      await databases.createDocument(databaseId(), dailyRollupsCollectionId(), documentId, {
        tenant_id: tenantId,
        date,
        messages: 0,
        customer_messages: 0,
        bot_messages: 0,
        agent_messages: 0,
        updated: new Date().toISOString(),
      });
    } catch (createError) {
      if (createError.code !== 409) {
        throw createError;
      }
      return false;
    }
    return true;
  }
}

async function ensureBotRollup(databases, tenantId, botId, documentId) {
  try {
    await databases.getDocument(databaseId(), botRollupsCollectionId(), documentId);
    return false;
  } catch (error) {
    if (error.code !== 404) {
      throw error;
    }

    try {
      await databases.createDocument(databaseId(), botRollupsCollectionId(), documentId, {
        tenant_id: tenantId,
        bot_id: botId,
        conversations: 0,
        messages: 0,
        updated: new Date().toISOString(),
      });
    } catch (createError) {
      if (createError.code !== 409) {
        throw createError;
      }
      return false;
    }
    return true;
  }
}

async function invalidateMonitorCache(tenantId) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return;
  }

  const redis = getMonitorCacheRedis();
  for (const scope of ["conversations", "users", "analytics"]) {
    for await (const keys of scanKeys(redis, `monitor:${cacheTenantPart(tenantId)}:${scope}:*`)) {
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  }
}

function getMonitorCacheRedis() {
  if (!monitorCacheRedis) {
    monitorCacheRedis = new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return monitorCacheRedis;
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

function cacheTenantPart(tenantId) {
  return createHash("sha1").update(tenantId).digest("hex").slice(0, 16);
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function sessionsCollectionId() {
  return process.env.APPWRITE_SESSIONS_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_SESSIONS_COLLECTION_ID ?? "sessions";
}

function messagesCollectionId() {
  return process.env.APPWRITE_MESSAGES_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID ?? "messages";
}

function tenantRollupsCollectionId() {
  return process.env.APPWRITE_MONITOR_TENANT_ROLLUPS_COLLECTION_ID ?? "monitor_tenant_rollups";
}

function dailyRollupsCollectionId() {
  return process.env.APPWRITE_MONITOR_DAILY_ROLLUPS_COLLECTION_ID ?? "monitor_daily_rollups";
}

function botRollupsCollectionId() {
  return process.env.APPWRITE_MONITOR_BOT_ROLLUPS_COLLECTION_ID ?? "monitor_bot_rollups";
}

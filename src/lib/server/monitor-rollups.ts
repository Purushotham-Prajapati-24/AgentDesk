import { ID, Operator, Query, type Models } from "node-appwrite";
import { createHash } from "node:crypto";

export type MonitorSessionStatus = "active" | "paused_by_human" | "closed";
export type MonitorSender = "customer" | "bot" | "agent" | "unknown";

export type MonitorConversationSummary = {
  id: string;
  tenantId: string;
  botId: string;
  sessionToken: string;
  status: MonitorSessionStatus;
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  lastSender: MonitorSender;
  messageCount: number;
};

export type RollupDatabases = {
  getDocument: (databaseId: string, collectionId: string, documentId: string) => Promise<Models.Document>;
  createDocument: (
    databaseId: string,
    collectionId: string,
    documentId: string,
    data: Record<string, unknown>,
    permissions?: string[],
  ) => Promise<Models.Document>;
  updateDocument: (
    databaseId: string,
    collectionId: string,
    documentId: string,
    data: Record<string, unknown>,
  ) => Promise<Models.Document>;
  listDocuments: (
    databaseId: string,
    collectionId: string,
    queries?: string[],
  ) => Promise<Models.DocumentList<Models.Document>>;
};

type SessionDocument = Models.Document & {
  tenant_id?: unknown;
  bot_id?: unknown;
  session_token?: unknown;
  status?: unknown;
  created?: unknown;
  updated?: unknown;
  message_count?: unknown;
  customer_message_count?: unknown;
  bot_message_count?: unknown;
  agent_message_count?: unknown;
  last_message_content?: unknown;
  last_sender?: unknown;
  last_message_at?: unknown;
};

type TenantRollupDocument = Models.Document & {
  tenant_id?: unknown;
  active_sessions?: unknown;
  paused_sessions?: unknown;
  closed_sessions?: unknown;
  conversations?: unknown;
  messages?: unknown;
  customer_messages?: unknown;
  bot_messages?: unknown;
  agent_messages?: unknown;
  handoffs?: unknown;
  document_storage_bytes?: unknown;
  credit_balance?: unknown;
  updated?: unknown;
};

type DailyRollupDocument = Models.Document & {
  date?: unknown;
  messages?: unknown;
};

type BotRollupDocument = Models.Document & {
  bot_id?: unknown;
  conversations?: unknown;
  messages?: unknown;
};

export async function recordSessionCreated(databases: RollupDatabases, session: SessionDocument) {
  const tenantId = stringValue(session.tenant_id, "");
  if (!tenantId) {
    return;
  }

  const status = sessionStatus(session.status);
  const now = new Date().toISOString();
  await Promise.all([
    incrementTenantRollup(databases, tenantId, {
      conversations: 1,
      [`${statusCounterKey(status)}`]: 1,
    }),
    stringValue(session.bot_id, "")
      ? incrementBotRollup(databases, tenantId, stringValue(session.bot_id, ""), { conversations: 1 })
      : Promise.resolve(),
    invalidateMonitorCache(tenantId, ["conversations", "users", "analytics"]),
  ]);

  await updateDocumentCompat(databases, sessionsCollectionId(), session.$id, {
    message_count: 0,
    customer_message_count: 0,
    bot_message_count: 0,
    agent_message_count: 0,
    last_message_content: "",
    last_sender: "unknown",
    last_message_at: "",
    updated: stringValue(session.updated, now),
  });
}

export async function recordSessionStatusChanged(
  databases: RollupDatabases,
  previousStatus: unknown,
  nextStatus: unknown,
  session: SessionDocument,
) {
  const tenantId = stringValue(session.tenant_id, "");
  if (!tenantId) {
    return;
  }

  const previous = sessionStatus(previousStatus);
  const next = sessionStatus(nextStatus);
  if (previous === next) {
    return;
  }

  await Promise.all([
    incrementTenantRollup(databases, tenantId, {
      [statusCounterKey(previous)]: -1,
      [statusCounterKey(next)]: 1,
      handoffs: next === "paused_by_human" ? 1 : 0,
    }),
    invalidateMonitorCache(tenantId, ["conversations", "users", "analytics"]),
  ]);
}

export async function recordMessageCreated(
  databases: RollupDatabases,
  session: SessionDocument,
  sender: Exclude<MonitorSender, "unknown">,
  content: string,
  createdAt: string,
) {
  const tenantId = stringValue(session.tenant_id, "");
  if (!tenantId) {
    return;
  }

  const botId = stringValue(session.bot_id, "");
  const senderCounter = senderCounterKey(sender);
  await Promise.all([
    updateDocumentCompat(databases, sessionsCollectionId(), session.$id, {
      message_count: Operator.increment(1),
      [senderCounter]: Operator.increment(1),
      last_message_content: content.slice(0, 1000),
      last_sender: sender,
      last_message_at: createdAt,
      updated: createdAt,
    }),
    incrementTenantRollup(databases, tenantId, {
      messages: 1,
      [tenantSenderCounterKey(sender)]: 1,
    }),
    incrementDailyRollup(databases, tenantId, dateKey(new Date(createdAt)), { messages: 1 }),
    botId ? incrementBotRollup(databases, tenantId, botId, { messages: 1 }) : Promise.resolve(),
    invalidateMonitorCache(tenantId, ["conversations", "users", "analytics"]),
  ]);
}

export async function recordDocumentStorageAdded(databases: RollupDatabases, tenantId: string, bytes: number) {
  if (!tenantId || !Number.isFinite(bytes) || bytes <= 0) {
    return;
  }

  await Promise.all([
    incrementTenantRollup(databases, tenantId, { document_storage_bytes: Math.round(bytes) }),
    invalidateMonitorCache(tenantId, ["analytics"]),
  ]);
}

export async function recordCreditLedgerEntry(databases: RollupDatabases, tenantId: string, amount: number) {
  if (!tenantId || !Number.isFinite(amount) || amount === 0) {
    return;
  }

  await Promise.all([
    incrementTenantRollup(databases, tenantId, { credit_balance: amount }),
    invalidateMonitorCache(tenantId, ["analytics"]),
  ]);
}

export async function getMonitorSnapshotFromRollups(databases: RollupDatabases, tenantId: string) {
  const tenantRollups = await databases.listDocuments(databaseId(), tenantRollupsCollectionId(), [
    Query.equal("tenant_id", tenantId),
    Query.limit(1),
  ]);
  const tenantRollup = tenantRollups.documents[0] as TenantRollupDocument | undefined;
  if (!tenantRollup) {
    return null;
  }

  const [dailyRollups, botRollups] = await Promise.all([
    databases.listDocuments(databaseId(), dailyRollupsCollectionId(), [
      Query.equal("tenant_id", tenantId),
      Query.orderDesc("date"),
      Query.limit(7),
    ]),
    databases.listDocuments(databaseId(), botRollupsCollectionId(), [
      Query.equal("tenant_id", tenantId),
      Query.orderDesc("conversations"),
      Query.limit(5),
    ]),
  ]);

  const conversations = numberValue(tenantRollup.conversations);
  const messages = numberValue(tenantRollup.messages);
  const activeSessions = numberValue(tenantRollup.active_sessions);
  const pausedSessions = numberValue(tenantRollup.paused_sessions);
  const closedSessions = numberValue(tenantRollup.closed_sessions);
  const customerMessages = numberValue(tenantRollup.customer_messages);
  const botMessages = numberValue(tenantRollup.bot_messages);
  const agentMessages = numberValue(tenantRollup.agent_messages);

  return {
    source: "rollup" as const,
    updatedAt: stringValue(tenantRollup.updated, tenantRollup.$updatedAt),
    totals: {
      activeSessions,
      conversations,
      messages,
      handoffs: numberValue(tenantRollup.handoffs) || pausedSessions,
      botReplies: botMessages,
      customerMessages,
      agentMessages,
      averageMessagesPerConversation: conversations > 0 ? Math.round((messages / conversations) * 10) / 10 : 0,
      documentStorageBytes: numberValue(tenantRollup.document_storage_bytes),
      creditBalance: numberValue(tenantRollup.credit_balance),
    },
    statusDistribution: [
      { label: "active" as const, value: activeSessions },
      { label: "paused_by_human" as const, value: pausedSessions },
      { label: "closed" as const, value: closedSessions },
    ],
    senderMix: [
      { label: "customer" as const, value: customerMessages },
      { label: "bot" as const, value: botMessages },
      { label: "agent" as const, value: agentMessages },
    ],
    recentActivity: buildRecentActivityFromRollups(dailyRollups.documents as DailyRollupDocument[]),
    topBots: (botRollups.documents as BotRollupDocument[]).map((rollup) => ({
      botId: stringValue(rollup.bot_id, "unassigned"),
      conversations: numberValue(rollup.conversations),
      messages: numberValue(rollup.messages),
    })),
  };
}

export function mapSessionSummary(session: SessionDocument): MonitorConversationSummary {
  const messageCount = numberValue(session.message_count);
  return {
    id: session.$id,
    tenantId: stringValue(session.tenant_id, ""),
    botId: stringValue(session.bot_id, ""),
    sessionToken: stringValue(session.session_token, session.$id),
    status: sessionStatus(session.status),
    createdAt: stringValue(session.created, session.$createdAt),
    updatedAt: stringValue(session.updated, session.$updatedAt),
    lastMessage: stringValue(session.last_message_content, "No messages recorded yet."),
    lastSender: messageCount > 0 ? messageSender(session.last_sender) : "unknown",
    messageCount,
  };
}

export async function invalidateMonitorCache(tenantId: string, scopes: Array<"conversations" | "users" | "analytics">) {
  await Promise.all(scopes.map((scope) => deleteCachedPrefix(monitorCachePrefix(tenantId, scope))));
}

export function monitorCachePrefix(tenantId: string, scope: "conversations" | "users" | "analytics") {
  return `monitor:${tenantId}:${scope}:`;
}

function buildRecentActivityFromRollups(rollups: DailyRollupDocument[]) {
  const byDate = new Map(rollups.map((rollup) => [stringValue(rollup.date, ""), numberValue(rollup.messages)]));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  return days.map((date) => {
    const key = dateKey(date);
    return {
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      value: byDate.get(key) ?? 0,
    };
  });
}

async function incrementTenantRollup(databases: RollupDatabases, tenantId: string, increments: Record<string, number>) {
  const documentId = tenantRollupId(tenantId);
  await ensureRollupDocument(databases, tenantRollupsCollectionId(), documentId, {
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
  await incrementDocument(databases, tenantRollupsCollectionId(), documentId, increments);
}

async function incrementDailyRollup(databases: RollupDatabases, tenantId: string, date: string, increments: Record<string, number>) {
  const documentId = dailyRollupId(tenantId, date);
  await ensureRollupDocument(databases, dailyRollupsCollectionId(), documentId, {
    tenant_id: tenantId,
    date,
    messages: 0,
    customer_messages: 0,
    bot_messages: 0,
    agent_messages: 0,
    updated: new Date().toISOString(),
  });
  await incrementDocument(databases, dailyRollupsCollectionId(), documentId, increments);
}

async function incrementBotRollup(databases: RollupDatabases, tenantId: string, botId: string, increments: Record<string, number>) {
  const documentId = botRollupId(tenantId, botId);
  await ensureRollupDocument(databases, botRollupsCollectionId(), documentId, {
    tenant_id: tenantId,
    bot_id: botId,
    conversations: 0,
    messages: 0,
    updated: new Date().toISOString(),
  });
  await incrementDocument(databases, botRollupsCollectionId(), documentId, increments);
}

async function ensureRollupDocument(
  databases: RollupDatabases,
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>,
) {
  try {
    await databases.getDocument(databaseId(), collectionId, documentId);
  } catch (error) {
    if (errorCode(error) !== 404) {
      throw error;
    }

    try {
      await databases.createDocument(databaseId(), collectionId, documentId, data);
    } catch (createError) {
      if (errorCode(createError) !== 409) {
        throw createError;
      }
    }
  }
}

async function incrementDocument(
  databases: RollupDatabases,
  collectionId: string,
  documentId: string,
  increments: Record<string, number>,
) {
  const data = Object.fromEntries(
    Object.entries(increments)
      .filter(([, value]) => Number.isFinite(value) && value !== 0)
      .map(([key, value]) => [key, Operator.increment(value)]),
  );
  data.updated = new Date().toISOString();
  await updateDocumentCompat(databases, collectionId, documentId, data);
}

async function updateDocumentCompat(
  databases: RollupDatabases,
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>,
) {
  const remaining = { ...data };

  while (Object.keys(remaining).length > 0) {
    try {
      return await databases.updateDocument(databaseId(), collectionId, documentId, remaining);
    } catch (error) {
      const unknownAttribute = getUnknownAttribute(error);
      if (!unknownAttribute || !(unknownAttribute in remaining)) {
        throw error;
      }

      delete remaining[unknownAttribute];
    }
  }
}

function tenantRollupId(tenantId: string) {
  return stableId(`tenant_${tenantId}`);
}

function dailyRollupId(tenantId: string, date: string) {
  return stableId(`daily_${tenantId}_${date}`);
}

function botRollupId(tenantId: string, botId: string) {
  return stableId(`bot_${tenantId}_${botId}`);
}

function stableId(value: string) {
  const clean = value.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const hash = createHash("sha1").update(value).digest("hex").slice(0, 10);
  return `${clean.slice(0, 25)}_${hash}`.slice(0, 36) || ID.unique();
}

function statusCounterKey(status: MonitorSessionStatus) {
  return status === "paused_by_human" ? "paused_sessions" : `${status}_sessions`;
}

function senderCounterKey(sender: Exclude<MonitorSender, "unknown">) {
  return `${sender}_message_count`;
}

function tenantSenderCounterKey(sender: Exclude<MonitorSender, "unknown">) {
  return `${sender}_messages`;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function sessionStatus(value: unknown): MonitorSessionStatus {
  return value === "paused_by_human" || value === "closed" ? value : "active";
}

function messageSender(value: unknown): MonitorSender {
  return value === "customer" || value === "bot" || value === "agent" ? value : "unknown";
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: unknown }).code) : 0;
}

async function deleteCachedPrefix(prefix: string) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return;
  }

  const keys = (await redisCommand<string[] | null>(["KEYS", `${prefix}*`])) ?? [];
  if (keys.length > 0) {
    await redisCommand(["DEL", ...keys]);
  }
}

async function redisCommand<T>(command: Array<string | number>): Promise<T> {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL ?? "", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) {
    throw new Error(`Upstash Redis command failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result as T;
}

function getUnknownAttribute(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  return error.message.match(/Unknown attribute: "([^"]+)"/)?.[1] ?? null;
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

function dailyRollupsCollectionId() {
  return process.env.APPWRITE_MONITOR_DAILY_ROLLUPS_COLLECTION_ID ?? "monitor_daily_rollups";
}

function botRollupsCollectionId() {
  return process.env.APPWRITE_MONITOR_BOT_ROLLUPS_COLLECTION_ID ?? "monitor_bot_rollups";
}

"use server";

import { Query, type Models } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/server/appwrite";

export type MonitorSessionStatus = "active" | "paused_by_human" | "closed";
export type MonitorSender = "customer" | "bot" | "agent" | "unknown";

export type MonitorConversation = {
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

export type MonitorMessage = {
  id: string;
  sender: Exclude<MonitorSender, "unknown">;
  content: string;
  createdAt: string;
};

export type MonitorUser = {
  id: string;
  sessionToken: string;
  lastSeenAt: string;
  firstSeenAt: string;
  conversations: number;
  messages: number;
  active: number;
  paused: number;
  closed: number;
  botIds: string[];
  agents: Array<{ id: string; name: string }>;
  lastMessage: string;
  lastStatus: MonitorSessionStatus;
};

export type MonitorAnalyticsSnapshot = {
  totals: {
    activeSessions: number;
    conversations: number;
    messages: number;
    handoffs: number;
    botReplies: number;
    customerMessages: number;
    agentMessages: number;
    averageMessagesPerConversation: number;
    documentStorageBytes: number;
    creditBalance: number;
  };
  statusDistribution: Array<{ label: MonitorSessionStatus; value: number }>;
  senderMix: Array<{ label: Exclude<MonitorSender, "unknown">; value: number }>;
  recentActivity: Array<{ label: string; value: number }>;
  topBots: Array<{ botId: string; conversations: number; messages: number }>;
  attentionConversations: MonitorConversation[];
};

type SessionDocument = Models.Document & {
  tenant_id?: unknown;
  bot_id?: unknown;
  session_token?: unknown;
  status?: unknown;
  created?: unknown;
  updated?: unknown;
};

type MessageDocument = Models.Document & {
  tenant_id?: unknown;
  session_id?: unknown;
  sender?: unknown;
  content?: unknown;
  created?: unknown;
};

type FileDocument = Models.Document & {
  file_size?: unknown;
};

type LedgerDocument = Models.Document & {
  amount?: unknown;
};

type BotDocument = Models.Document & {
  tenant_id?: unknown;
  name?: unknown;
};

const PAGE_LIMIT = 12;
const ANALYTICS_LIMIT = 100;
const MESSAGE_LIMIT = 120;

export async function getMonitorConversationList({
  tenantId,
  search = "",
  status = "all",
  cursor,
}: {
  tenantId: string;
  search?: string;
  status?: MonitorSessionStatus | "all";
  cursor?: string | null;
}): Promise<
  | { success: true; data: { conversations: MonitorConversation[]; nextCursor: string | null } }
  | { success: false; error: string }
> {
  try {
    const [{ account }, { databases }] = await Promise.all([createSessionClient(), createAdminClient()]);
    await assertTenantAccess(account, tenantId);

    const sessions = await fetchSessions(databases, tenantId, {
      limit: PAGE_LIMIT + 1,
      search,
      status,
      cursor,
    });
    const visibleSessions = sessions.documents.slice(0, PAGE_LIMIT) as SessionDocument[];
    const nextCursor = sessions.documents.length > PAGE_LIMIT ? visibleSessions.at(-1)?.$id ?? null : null;
    const conversations = await Promise.all(visibleSessions.map((session) => summarizeSession(databases, session, tenantId)));

    return { success: true, data: { conversations, nextCursor } };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to load monitor conversations." };
  }
}

export async function getMonitorConversationMessages({
  tenantId,
  sessionId,
}: {
  tenantId: string;
  sessionId: string;
}): Promise<{ success: true; data: { messages: MonitorMessage[] } } | { success: false; error: string }> {
  try {
    const [{ account }, { databases }] = await Promise.all([createSessionClient(), createAdminClient()]);
    await assertTenantAccess(account, tenantId);
    await assertSessionTenant(databases, tenantId, sessionId);

    const messages = await databases.listDocuments(databaseId(), messagesCollectionId(), [
      Query.equal("tenant_id", tenantId),
      Query.equal("session_id", sessionId),
      Query.orderAsc("created"),
      Query.limit(MESSAGE_LIMIT),
    ]);

    return {
      success: true,
      data: {
        messages: messages.documents.map((document) => mapMessage(document as MessageDocument)),
      },
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to load conversation messages." };
  }
}

export async function getMonitorUsers({
  tenantId,
  search = "",
  cursor,
}: {
  tenantId: string;
  search?: string;
  cursor?: string | null;
}): Promise<{ success: true; data: { users: MonitorUser[]; nextCursor: string | null } } | { success: false; error: string }> {
  try {
    const [{ account }, { databases }] = await Promise.all([createSessionClient(), createAdminClient()]);
    await assertTenantAccess(account, tenantId);

    const sessions = await fetchSessions(databases, tenantId, {
      limit: PAGE_LIMIT + 1,
      search,
      status: "all",
      cursor,
    });
    const visibleSessions = sessions.documents.slice(0, PAGE_LIMIT) as SessionDocument[];
    const nextCursor = sessions.documents.length > PAGE_LIMIT ? visibleSessions.at(-1)?.$id ?? null : null;
    const conversations = await Promise.all(visibleSessions.map((session) => summarizeSession(databases, session, tenantId)));
    const botNames = await getBotNames(
      databases,
      tenantId,
      Array.from(new Set(conversations.map((conversation) => conversation.botId).filter(Boolean))),
    );
    const users = conversations.map((conversation) => ({
      id: conversation.sessionToken,
      sessionToken: conversation.sessionToken,
      firstSeenAt: conversation.createdAt,
      lastSeenAt: conversation.updatedAt,
      conversations: 1,
      messages: conversation.messageCount,
      active: conversation.status === "active" ? 1 : 0,
      paused: conversation.status === "paused_by_human" ? 1 : 0,
      closed: conversation.status === "closed" ? 1 : 0,
      botIds: conversation.botId ? [conversation.botId] : [],
      agents: conversation.botId ? [{ id: conversation.botId, name: botNames.get(conversation.botId) ?? "Unnamed agent" }] : [],
      lastMessage: conversation.lastMessage,
      lastStatus: conversation.status,
    }));

    return { success: true, data: { users, nextCursor } };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to load monitor users." };
  }
}

export async function getMonitorAnalyticsSnapshot(
  tenantId: string,
): Promise<{ success: true; data: MonitorAnalyticsSnapshot } | { success: false; error: string }> {
  try {
    const [{ account }, { databases }] = await Promise.all([createSessionClient(), createAdminClient()]);
    await assertTenantAccess(account, tenantId);

    const [sessions, messages, files, ledger, activeSessions, pausedSessions, closedSessions, customerMessages, botMessages, agentMessages] = await Promise.all([
      fetchSessions(databases, tenantId, { limit: ANALYTICS_LIMIT, status: "all" }),
      databases.listDocuments(databaseId(), messagesCollectionId(), [
        Query.equal("tenant_id", tenantId),
        Query.orderDesc("created"),
        Query.limit(ANALYTICS_LIMIT),
      ]),
      databases.listDocuments(databaseId(), documentsCollectionId(), [Query.equal("tenant_id", tenantId), Query.limit(ANALYTICS_LIMIT)]),
      databases.listDocuments(databaseId(), ledgerCollectionId(), [
        Query.equal("tenant_id", tenantId),
        Query.orderDesc("created"),
        Query.limit(ANALYTICS_LIMIT),
      ]),
      countSessionsByStatus(databases, tenantId, "active"),
      countSessionsByStatus(databases, tenantId, "paused_by_human"),
      countSessionsByStatus(databases, tenantId, "closed"),
      countMessagesBySender(databases, tenantId, "customer"),
      countMessagesBySender(databases, tenantId, "bot"),
      countMessagesBySender(databases, tenantId, "agent"),
    ]);

    const sessionDocs = sessions.documents as SessionDocument[];
    const messageDocs = messages.documents as MessageDocument[];
    const conversations = await Promise.all(sessionDocs.slice(0, 8).map((session) => summarizeSession(databases, session, tenantId)));
    const statusDistribution = [
      { label: "active" as const, value: activeSessions },
      { label: "paused_by_human" as const, value: pausedSessions },
      { label: "closed" as const, value: closedSessions },
    ];
    const senderMix = [
      { label: "customer" as const, value: customerMessages },
      { label: "bot" as const, value: botMessages },
      { label: "agent" as const, value: agentMessages },
    ];
    const topBots = buildTopBots(sessionDocs, conversations);

    return {
      success: true,
      data: {
        totals: {
          activeSessions,
          conversations: sessions.total,
          messages: messages.total,
          handoffs: pausedSessions,
          botReplies: botMessages,
          customerMessages,
          agentMessages,
          averageMessagesPerConversation: sessions.total > 0 ? Math.round((messages.total / sessions.total) * 10) / 10 : 0,
          documentStorageBytes: files.documents.reduce((total, document) => total + numberValue((document as FileDocument).file_size), 0),
          creditBalance: ledger.documents.reduce((total, document) => total + numberValue((document as LedgerDocument).amount), 0),
        },
        statusDistribution,
        senderMix,
        recentActivity: buildRecentActivity(messageDocs),
        topBots,
        attentionConversations: conversations.filter((conversation) => conversation.status !== "closed").slice(0, 5),
      },
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to load monitor analytics." };
  }
}

async function fetchSessions(
  databases: Awaited<ReturnType<typeof createSessionClient>>["databases"],
  tenantId: string,
  {
    limit,
    search = "",
    status = "all",
    cursor,
  }: {
    limit: number;
    search?: string;
    status?: MonitorSessionStatus | "all";
    cursor?: string | null;
  },
) {
  const queries = [Query.equal("tenant_id", tenantId), Query.orderDesc("updated"), Query.limit(limit)];
  if (status !== "all") {
    queries.push(Query.equal("status", status));
  }
  if (cursor) {
    queries.push(Query.cursorAfter(cursor));
  }

  const trimmedSearch = search.trim();
  if (!trimmedSearch) {
    return databases.listDocuments(databaseId(), sessionsCollectionId(), queries);
  }

  try {
    return await databases.listDocuments(databaseId(), sessionsCollectionId(), [
      ...queries,
      Query.or([
        Query.contains("session_token", trimmedSearch),
        Query.contains("bot_id", trimmedSearch),
        Query.contains("status", trimmedSearch),
      ]),
    ]);
  } catch {
    return databases.listDocuments(databaseId(), sessionsCollectionId(), queries);
  }
}

async function countSessionsByStatus(
  databases: Awaited<ReturnType<typeof createSessionClient>>["databases"],
  tenantId: string,
  status: MonitorSessionStatus,
) {
  const sessions = await databases.listDocuments(databaseId(), sessionsCollectionId(), [
    Query.equal("tenant_id", tenantId),
    Query.equal("status", status),
    Query.limit(1),
  ]);

  return sessions.total;
}

async function countMessagesBySender(
  databases: Awaited<ReturnType<typeof createSessionClient>>["databases"],
  tenantId: string,
  sender: Exclude<MonitorSender, "unknown">,
) {
  const messages = await databases.listDocuments(databaseId(), messagesCollectionId(), [
    Query.equal("tenant_id", tenantId),
    Query.equal("sender", sender),
    Query.limit(1),
  ]);

  return messages.total;
}

async function summarizeSession(
  databases: Awaited<ReturnType<typeof createSessionClient>>["databases"],
  session: SessionDocument,
  tenantId: string,
): Promise<MonitorConversation> {
  const [lastMessages, messageCount] = await Promise.all([
    databases.listDocuments(databaseId(), messagesCollectionId(), [
      Query.equal("tenant_id", tenantId),
      Query.equal("session_id", session.$id),
      Query.orderDesc("created"),
      Query.limit(1),
    ]),
    databases.listDocuments(databaseId(), messagesCollectionId(), [
      Query.equal("tenant_id", tenantId),
      Query.equal("session_id", session.$id),
      Query.limit(1),
    ]),
  ]);

  const lastMessage = lastMessages.documents[0] as MessageDocument | undefined;
  return {
    id: session.$id,
    tenantId,
    botId: stringValue(session.bot_id, ""),
    sessionToken: stringValue(session.session_token, session.$id),
    status: sessionStatus(session.status),
    createdAt: stringValue(session.created, session.$createdAt),
    updatedAt: stringValue(session.updated, session.$updatedAt),
    lastMessage: stringValue(lastMessage?.content, "No messages recorded yet."),
    lastSender: messageSender(lastMessage?.sender),
    messageCount: messageCount.total,
  };
}

async function assertSessionTenant(
  databases: Awaited<ReturnType<typeof createSessionClient>>["databases"],
  tenantId: string,
  sessionId: string,
) {
  if (!isSafeId(sessionId)) {
    throw new Error("Invalid session ID.");
  }

  const session = (await databases.getDocument(databaseId(), sessionsCollectionId(), sessionId)) as SessionDocument;
  if (session.tenant_id !== tenantId) {
    throw new Error("Conversation does not belong to this tenant.");
  }
}

async function assertTenantAccess(account: Awaited<ReturnType<typeof createSessionClient>>["account"], tenantId: string) {
  if (!isSafeId(tenantId)) {
    throw new Error("Invalid tenant scope.");
  }

  const user = await account.get();
  const prefs = user.prefs as { tenant_id?: string };
  if (prefs.tenant_id !== tenantId) {
    throw new Error("You do not have access to this tenant.");
  }
}

async function getBotNames(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
  botIds: string[],
) {
  const entries = await Promise.all(
    botIds.map(async (botId) => {
      if (!isSafeId(botId)) {
        return null;
      }

      try {
        const bot = (await databases.getDocument(databaseId(), botsCollectionId(), botId)) as BotDocument;
        if (bot.tenant_id !== tenantId) {
          return null;
        }

        return [botId, stringValue(bot.name, "Unnamed agent")] as const;
      } catch {
        return [botId, "Unnamed agent"] as const;
      }
    }),
  );

  return new Map(entries.filter((entry): entry is readonly [string, string] => Boolean(entry)));
}

function buildRecentActivity(messages: MessageDocument[]) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const counts = new Map(days.map((date) => [dateKey(date), 0]));

  messages.forEach((message) => {
    const date = new Date(stringValue(message.created, message.$createdAt));
    const key = dateKey(date);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });

  return days.map((date) => ({
    label: date.toLocaleDateString("en-US", { weekday: "short" }),
    value: counts.get(dateKey(date)) ?? 0,
  }));
}

function buildTopBots(sessions: SessionDocument[], conversations: MonitorConversation[]) {
  const counts = new Map<string, { conversations: number; messages: number }>();
  sessions.forEach((session) => {
    const botId = stringValue(session.bot_id, "unassigned");
    const current = counts.get(botId) ?? { conversations: 0, messages: 0 };
    current.conversations += 1;
    counts.set(botId, current);
  });
  conversations.forEach((conversation) => {
    const botId = conversation.botId || "unassigned";
    const current = counts.get(botId) ?? { conversations: 0, messages: 0 };
    current.messages += conversation.messageCount;
    counts.set(botId, current);
  });

  return Array.from(counts.entries())
    .map(([botId, value]) => ({ botId, ...value }))
    .sort((a, b) => b.conversations - a.conversations)
    .slice(0, 5);
}

function mapMessage(document: MessageDocument): MonitorMessage {
  const sender = messageSender(document.sender);
  return {
    id: document.$id,
    sender: sender === "unknown" ? "bot" : sender,
    content: stringValue(document.content, ""),
    createdAt: stringValue(document.created, document.$createdAt),
  };
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

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function sessionsCollectionId() {
  return process.env.APPWRITE_SESSIONS_COLLECTION_ID ?? "sessions";
}

function messagesCollectionId() {
  return process.env.APPWRITE_MESSAGES_COLLECTION_ID ?? "messages";
}

function botsCollectionId() {
  return process.env.APPWRITE_BOTS_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_BOTS_COLLECTION_ID ?? "bots";
}

function documentsCollectionId() {
  return process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_COLLECTION_ID ?? "document_files";
}

function ledgerCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_LEDGER_COLLECTION_ID ?? "ledger";
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

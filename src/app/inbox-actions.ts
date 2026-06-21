"use server";

import { Query, type Models } from "node-appwrite";
import { createSessionClient } from "@/lib/server/appwrite";
import { getAuthorizedTenantDocument } from "@/lib/server/tenant-access";
import { mapSessionSummary } from "@/lib/server/monitor-rollups";

export type ConversationSummary = {
  id: string;
  tenantId: string;
  botId: string;
  sessionToken: string;
  status: "active" | "paused_by_human" | "closed";
  updatedAt: string;
  lastMessage: string;
  lastSender: "customer" | "bot" | "agent" | "unknown";
  messageCount: number;
};

export type ConversationMessage = {
  id: string;
  sender: "customer" | "bot" | "agent";
  content: string;
  createdAt: string;
};

type SessionDocument = Models.Document & {
  tenant_id?: unknown;
  bot_id?: unknown;
  session_token?: unknown;
  status?: unknown;
  updated?: unknown;
  message_count?: unknown;
  customer_message_count?: unknown;
  bot_message_count?: unknown;
  agent_message_count?: unknown;
  last_message_content?: unknown;
  last_sender?: unknown;
  last_message_at?: unknown;
};

type MessageDocument = Models.Document & {
  tenant_id?: unknown;
  session_id?: unknown;
  sender?: unknown;
  content?: unknown;
  created?: unknown;
};

const PAGE_LIMIT = 10;
// Load the most recent messages to show in the transcript view. Capped at 100
// to avoid large database load and payload size.
const MESSAGE_LIMIT = 100;

export async function listConversationSessions({
  tenantId,
  search = "",
  cursor,
}: {
  tenantId: string;
  search?: string;
  cursor?: string | null;
}): Promise<
  | { success: true; data: { sessions: ConversationSummary[]; nextCursor: string | null } }
  | { success: false; error: string }
> {
  try {
    const { account, databases } = await createSessionClient();
    await assertTenantAccess(account, tenantId);

    const sessions = await fetchSessions(databases, tenantId, search, cursor);
    const visibleSessions = sessions.documents.slice(0, PAGE_LIMIT) as SessionDocument[];
    const nextCursor = sessions.documents.length > PAGE_LIMIT ? visibleSessions.at(-1)?.$id ?? null : null;

    const summaries = visibleSessions.map(mapConversationSummary);
    return { success: true, data: { sessions: summaries, nextCursor } };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to load conversation history." };
  }
}

export async function listConversationMessages({
  tenantId,
  sessionId,
}: {
  tenantId: string;
  sessionId: string;
}): Promise<{ success: true; data: { messages: ConversationMessage[] } } | { success: false; error: string }> {
  try {
    const { account, databases } = await createSessionClient();
    await assertTenantAccess(account, tenantId);
    
    // Resolve session by ID or token, verifying it belongs to the tenant
    const session = await resolveSession(databases, tenantId, sessionId);

    const messages = await databases.listDocuments(databaseId(), messagesCollectionId(), [
      Query.equal("tenant_id", tenantId),
      Query.equal("session_id", session.$id),
      Query.orderDesc("created"),
      Query.limit(MESSAGE_LIMIT),
    ]);

    return {
      success: true,
      data: {
        messages: messages.documents.reverse().map((document) => mapMessage(document as MessageDocument)),
      },
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to load conversation messages." };
  }
}

async function fetchSessions(
  databases: Awaited<ReturnType<typeof createSessionClient>>["databases"],
  tenantId: string,
  search: string,
  cursor?: string | null,
) {
  const trimmedSearch = search.trim();
  const baseQueries = [Query.equal("tenant_id", tenantId), Query.orderDesc("updated"), Query.limit(PAGE_LIMIT + 1)];
  if (cursor) {
    baseQueries.push(Query.cursorAfter(cursor));
  }

  if (!trimmedSearch) {
    return databases.listDocuments(databaseId(), sessionsCollectionId(), baseQueries);
  }

  const searchQueries = [
    ...baseQueries,
    Query.or([
      Query.contains("session_token", trimmedSearch),
      Query.contains("bot_id", trimmedSearch),
      Query.contains("status", trimmedSearch),
    ]),
  ];

  try {
    return await databases.listDocuments(databaseId(), sessionsCollectionId(), searchQueries);
  } catch {
    return databases.listDocuments(databaseId(), sessionsCollectionId(), baseQueries);
  }
}

async function resolveSession(
  databases: Awaited<ReturnType<typeof createSessionClient>>["databases"],
  tenantId: string,
  sessionId: string,
) {
  if (!isSafeId(sessionId)) {
    throw new Error("Invalid session ID.");
  }

  // 1. Try fetching by document ID and tenant_id using listDocuments (to prevent cross-tenant probing)
  try {
    const result = await databases.listDocuments(databaseId(), sessionsCollectionId(), [
      Query.equal("$id", sessionId),
      Query.equal("tenant_id", tenantId),
      Query.limit(1),
    ]);
    if (result.documents.length > 0) {
      return result.documents[0] as SessionDocument;
    }
  } catch {
    // Suppress Appwrite error and fall back to session_token query
  }

  // 2. Query by session_token
  const result = await databases.listDocuments(databaseId(), sessionsCollectionId(), [
    Query.equal("tenant_id", tenantId),
    Query.equal("session_token", sessionId),
    Query.limit(1),
  ]);

  const session = result.documents[0] as SessionDocument | undefined;
  if (!session) {
    throw new Error("Conversation session was not found.");
  }

  return session;
}

async function assertTenantAccess(account: Awaited<ReturnType<typeof createSessionClient>>["account"], tenantId: string) {
  if (!isSafeId(tenantId)) {
    throw new Error("Invalid tenant scope.");
  }

  const user = await account.get();
  await getAuthorizedTenantDocument(user.$id, tenantId);
}

function mapMessage(document: MessageDocument): ConversationMessage {
  const sender = messageSender(document.sender);
  return {
    id: document.$id,
    sender: sender === "unknown" ? "bot" : sender,
    content: stringValue(document.content, ""),
    createdAt: stringValue(document.created, document.$createdAt),
  };
}

function mapConversationSummary(session: SessionDocument): ConversationSummary {
  const summary = mapSessionSummary(session);
  return {
    id: summary.id,
    tenantId: summary.tenantId,
    botId: summary.botId,
    sessionToken: summary.sessionToken,
    status: summary.status,
    updatedAt: summary.updatedAt,
    lastMessage: summary.lastMessage,
    lastSender: summary.lastSender,
    messageCount: summary.messageCount,
  };
}

function messageSender(value: unknown): ConversationSummary["lastSender"] {
  return value === "customer" || value === "bot" || value === "agent" ? value : "unknown";
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
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

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

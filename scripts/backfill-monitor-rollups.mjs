import { Client, Databases, Query } from "node-appwrite";
import { createHash } from "node:crypto";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;

const sessionsCollectionId = process.env.APPWRITE_SESSIONS_COLLECTION_ID || "sessions";
const messagesCollectionId = process.env.APPWRITE_MESSAGES_COLLECTION_ID || "messages";
const documentsCollectionId = process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID || "document_files";
const ledgerCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LEDGER_COLLECTION_ID || "ledger";
const tenantRollupsCollectionId = process.env.APPWRITE_MONITOR_TENANT_ROLLUPS_COLLECTION_ID || "monitor_tenant_rollups";
const dailyRollupsCollectionId = process.env.APPWRITE_MONITOR_DAILY_ROLLUPS_COLLECTION_ID || "monitor_daily_rollups";
const botRollupsCollectionId = process.env.APPWRITE_MONITOR_BOT_ROLLUPS_COLLECTION_ID || "monitor_bot_rollups";

const PAGE_LIMIT = 100;

if (!endpoint || !projectId || !apiKey || !databaseId) {
  throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and database ID are required.");
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

async function listAll(collectionId, queries = []) {
  const documents = [];
  let cursor = null;

  while (true) {
    const page = await databases.listDocuments(databaseId, collectionId, [
      ...queries,
      Query.limit(PAGE_LIMIT),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ]);
    documents.push(...page.documents);

    if (page.documents.length < PAGE_LIMIT) {
      return documents;
    }

    cursor = page.documents.at(-1)?.$id ?? null;
    if (!cursor) {
      return documents;
    }
  }
}

async function upsert(collectionId, documentId, data) {
  try {
    await databases.updateDocument(databaseId, collectionId, documentId, data);
  } catch (error) {
    if (error.code !== 404) {
      throw error;
    }
    await databases.createDocument(databaseId, collectionId, documentId, data);
  }
}

async function updateSessionSummary(session, messages) {
  const counts = {
    message_count: messages.length,
    customer_message_count: messages.filter((message) => message.sender === "customer").length,
    bot_message_count: messages.filter((message) => message.sender === "bot").length,
    agent_message_count: messages.filter((message) => message.sender === "agent").length,
  };
  const lastMessage = messages.at(-1);

  await databases.updateDocument(databaseId, sessionsCollectionId, session.$id, {
    ...counts,
    last_message_content: stringValue(lastMessage?.content, "").slice(0, 1000),
    last_sender: senderValue(lastMessage?.sender),
    last_message_at: stringValue(lastMessage?.created, ""),
  });
}

function zeroTenantRollup(tenantId) {
  return {
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
  };
}

async function run() {
  const tenantRollups = new Map();
  const dailyRollups = new Map();
  const botRollups = new Map();

  const sessions = await listAll(sessionsCollectionId);
  console.log(`Backfilling ${sessions.length} sessions...`);

  for (const session of sessions) {
    const tenantId = stringValue(session.tenant_id, "");
    if (!tenantId) {
      continue;
    }

    const messages = await listAll(messagesCollectionId, [
      Query.equal("tenant_id", tenantId),
      Query.equal("session_id", session.$id),
      Query.orderAsc("created"),
    ]);
    await updateSessionSummary(session, messages);

    const tenant = getOrCreate(tenantRollups, tenantId, () => zeroTenantRollup(tenantId));
    tenant.conversations += 1;
    tenant[statusCounterKey(session.status)] += 1;
    tenant.messages += messages.length;

    const botId = stringValue(session.bot_id, "unassigned");
    const bot = getOrCreate(botRollups, `${tenantId}:${botId}`, () => ({
      tenant_id: tenantId,
      bot_id: botId,
      conversations: 0,
      messages: 0,
      updated: new Date().toISOString(),
    }));
    bot.conversations += 1;
    bot.messages += messages.length;

    for (const message of messages) {
      const sender = senderValue(message.sender);
      if (sender !== "unknown") {
        tenant[`${sender}_messages`] += 1;
        const date = stringValue(message.created, message.$createdAt).slice(0, 10);
        const daily = getOrCreate(dailyRollups, `${tenantId}:${date}`, () => ({
          tenant_id: tenantId,
          date,
          messages: 0,
          customer_messages: 0,
          bot_messages: 0,
          agent_messages: 0,
          updated: new Date().toISOString(),
        }));
        daily.messages += 1;
        daily[`${sender}_messages`] += 1;
      }
    }
  }

  const documents = await listAll(documentsCollectionId);
  for (const document of documents) {
    const tenantId = stringValue(document.tenant_id, "");
    if (tenantId) {
      getOrCreate(tenantRollups, tenantId, () => zeroTenantRollup(tenantId)).document_storage_bytes += numberValue(document.file_size);
    }
  }

  const ledger = await listAll(ledgerCollectionId);
  for (const entry of ledger) {
    const tenantId = stringValue(entry.tenant_id, "");
    if (tenantId) {
      getOrCreate(tenantRollups, tenantId, () => zeroTenantRollup(tenantId)).credit_balance += numberValue(entry.amount);
    }
  }

  for (const [tenantId, rollup] of tenantRollups) {
    await upsert(tenantRollupsCollectionId, stableId(`tenant_${tenantId}`), rollup);
  }
  for (const [, rollup] of dailyRollups) {
    await upsert(dailyRollupsCollectionId, stableId(`daily_${rollup.tenant_id}_${rollup.date}`), rollup);
  }
  for (const [, rollup] of botRollups) {
    await upsert(botRollupsCollectionId, stableId(`bot_${rollup.tenant_id}_${rollup.bot_id}`), rollup);
  }

  console.log(`Backfill complete: ${tenantRollups.size} tenant rollups, ${dailyRollups.size} daily rollups, ${botRollups.size} bot rollups.`);
}

function getOrCreate(map, key, factory) {
  if (!map.has(key)) {
    map.set(key, factory());
  }
  return map.get(key);
}

function statusCounterKey(value) {
  return value === "paused_by_human" ? "paused_sessions" : value === "closed" ? "closed_sessions" : "active_sessions";
}

function senderValue(value) {
  return value === "customer" || value === "bot" || value === "agent" ? value : "unknown";
}

function stringValue(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stableId(value) {
  const clean = value.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const hash = createHash("sha1").update(value).digest("hex").slice(0, 10);
  return `${clean.slice(0, 25)}_${hash}`.slice(0, 36);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

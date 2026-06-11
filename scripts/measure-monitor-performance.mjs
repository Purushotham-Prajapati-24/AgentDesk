import { Client, Databases, Query } from "node-appwrite";
import { performance } from "node:perf_hooks";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;
const tenantId = process.env.MONITOR_MEASURE_TENANT_ID || process.env.NEXT_PUBLIC_APPWRITE_TENANT_ID;

const sessionsCollectionId = process.env.APPWRITE_SESSIONS_COLLECTION_ID || "sessions";
const messagesCollectionId = process.env.APPWRITE_MESSAGES_COLLECTION_ID || "messages";
const botsCollectionId = process.env.APPWRITE_BOTS_COLLECTION_ID || process.env.NEXT_PUBLIC_APPWRITE_BOTS_COLLECTION_ID || "bots";
const tenantRollupsCollectionId = process.env.APPWRITE_MONITOR_TENANT_ROLLUPS_COLLECTION_ID || "monitor_tenant_rollups";
const dailyRollupsCollectionId = process.env.APPWRITE_MONITOR_DAILY_ROLLUPS_COLLECTION_ID || "monitor_daily_rollups";
const botRollupsCollectionId = process.env.APPWRITE_MONITOR_BOT_ROLLUPS_COLLECTION_ID || "monitor_bot_rollups";

if (!endpoint || !projectId || !apiKey || !databaseId || !tenantId) {
  throw new Error("Set Appwrite env vars plus MONITOR_MEASURE_TENANT_ID before measuring monitor performance.");
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

async function measure(name, callback) {
  const start = performance.now();
  const result = await callback();
  const durationMs = Math.round((performance.now() - start) * 10) / 10;
  return { name, durationMs, ...result };
}

async function measureConversationList() {
  const sessions = await databases.listDocuments(databaseId, sessionsCollectionId, [
    Query.equal("tenant_id", tenantId),
    Query.orderDesc("updated"),
    Query.limit(13),
  ]);
  return {
    path: "rollup-session-summary",
    rows: Math.min(sessions.documents.length, 12),
  };
}

async function measureUsersList() {
  const [sessions, bots] = await Promise.all([
    databases.listDocuments(databaseId, sessionsCollectionId, [
      Query.equal("tenant_id", tenantId),
      Query.orderDesc("updated"),
      Query.limit(13),
    ]),
    databases.listDocuments(databaseId, botsCollectionId, [
      Query.equal("tenant_id", tenantId),
      Query.limit(100),
    ]),
  ]);
  return {
    path: "rollup-session-summary",
    rows: Math.min(sessions.documents.length, 12),
    botNames: bots.documents.length,
  };
}

async function measureAnalyticsSnapshot() {
  const rollup = await listDocumentsOrEmpty(tenantRollupsCollectionId, [
      Query.equal("tenant_id", tenantId),
      Query.limit(1),
    ]);
  if (rollup.documents.length > 0) {
    const [daily, bot] = await Promise.all([
      listDocumentsOrEmpty(dailyRollupsCollectionId, [
        Query.equal("tenant_id", tenantId),
        Query.orderDesc("date"),
        Query.limit(7),
      ]),
      listDocumentsOrEmpty(botRollupsCollectionId, [
        Query.equal("tenant_id", tenantId),
        Query.orderDesc("conversations"),
        Query.limit(5),
      ]),
    ]);
    return {
      path: "rollup",
      rows: 1,
      dailyRows: daily.documents.length,
      botRows: bot.documents.length,
    };
  }

  const [sessions, messages] = await Promise.all([
    databases.listDocuments(databaseId, sessionsCollectionId, [
      Query.equal("tenant_id", tenantId),
      Query.limit(100),
    ]),
    databases.listDocuments(databaseId, messagesCollectionId, [
      Query.equal("tenant_id", tenantId),
      Query.limit(100),
    ]),
  ]);
  return {
    path: "raw",
    rows: sessions.documents.length,
    messageRows: messages.documents.length,
  };
}

async function listDocumentsOrEmpty(collectionId, queries) {
  try {
    return await databases.listDocuments(databaseId, collectionId, queries);
  } catch (error) {
    if (error.code === 404) {
      return { total: 0, documents: [] };
    }
    throw error;
  }
}

const results = [
  await measure("getMonitorConversationList", measureConversationList),
  await measure("getMonitorUsers", measureUsersList),
  await measure("getMonitorAnalyticsSnapshot", measureAnalyticsSnapshot),
];

console.table(results);

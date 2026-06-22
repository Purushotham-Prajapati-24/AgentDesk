import { Client, Databases } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;

const sessionsCollectionId = process.env.APPWRITE_SESSIONS_COLLECTION_ID || "sessions";
const tenantRollupsCollectionId = process.env.APPWRITE_MONITOR_TENANT_ROLLUPS_COLLECTION_ID || "monitor_tenant_rollups";
const dailyRollupsCollectionId = process.env.APPWRITE_MONITOR_DAILY_ROLLUPS_COLLECTION_ID || "monitor_daily_rollups";
const botRollupsCollectionId = process.env.APPWRITE_MONITOR_BOT_ROLLUPS_COLLECTION_ID || "monitor_bot_rollups";

if (!endpoint || !projectId || !apiKey || !databaseId) {
  throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and database ID are required.");
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

async function ensureCollection(collectionId, name) {
  try {
    await databases.getCollection(databaseId, collectionId);
    console.log(`Collection ${collectionId} already exists.`);
  } catch (error) {
    if (error.code !== 404) {
      throw error;
    }

    console.log(`Creating collection ${collectionId}...`);
    await databases.createCollection(databaseId, collectionId, name, [], true, true);
  }
}

async function createStringAttribute(collectionId, key, size, required, defaultValue = undefined) {
  try {
    console.log(`Creating string attribute ${collectionId}.${key}...`);
    await databases.createStringAttribute(databaseId, collectionId, key, size, required, defaultValue);
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
  }
}

async function createIntegerAttribute(collectionId, key, required, defaultValue = undefined) {
  try {
    console.log(`Creating integer attribute ${collectionId}.${key}...`);
    await databases.createIntegerAttribute(databaseId, collectionId, key, required, undefined, undefined, defaultValue);
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
  }
}

async function createFloatAttribute(collectionId, key, required, defaultValue = undefined) {
  try {
    console.log(`Creating float attribute ${collectionId}.${key}...`);
    await databases.createFloatAttribute(databaseId, collectionId, key, required, undefined, undefined, defaultValue);
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
  }
}

async function createIndex(collectionId, key, type, attributes) {
  try {
    console.log(`Creating index ${collectionId}.${key}...`);
    await databases.createIndex(databaseId, collectionId, key, type, attributes);
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
  }
}

async function waitForAttributes(collectionId, keys) {
  const pending = new Set(keys);
  const deadline = Date.now() + 60000;

  while (pending.size > 0) {
    const collection = await databases.getCollection(databaseId, collectionId);
    const available = new Set((collection.attributes ?? []).filter((attribute) => attribute.status === "available").map((attribute) => attribute.key));

    for (const key of pending) {
      if (available.has(key)) {
        pending.delete(key);
      }
    }

    if (pending.size === 0) {
      return;
    }

    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for attributes on ${collectionId}: ${Array.from(pending).join(", ")}`);
    }

    console.log(`Waiting for ${collectionId} attributes: ${Array.from(pending).join(", ")}...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function addSessionSummaryFields() {
  await createIntegerAttribute(sessionsCollectionId, "message_count", false, 0);
  await createIntegerAttribute(sessionsCollectionId, "customer_message_count", false, 0);
  await createIntegerAttribute(sessionsCollectionId, "bot_message_count", false, 0);
  await createIntegerAttribute(sessionsCollectionId, "agent_message_count", false, 0);
  await createStringAttribute(sessionsCollectionId, "last_message_content", 1000, false, "");
  await createStringAttribute(sessionsCollectionId, "last_sender", 20, false, "unknown");
  await createStringAttribute(sessionsCollectionId, "last_message_at", 50, false, "");
}

async function addTenantRollupFields() {
  await ensureCollection(tenantRollupsCollectionId, "Monitor Tenant Rollups");
  await createStringAttribute(tenantRollupsCollectionId, "tenant_id", 160, true);
  await createIntegerAttribute(tenantRollupsCollectionId, "conversations", false, 0);
  await createIntegerAttribute(tenantRollupsCollectionId, "active_sessions", false, 0);
  await createIntegerAttribute(tenantRollupsCollectionId, "paused_sessions", false, 0);
  await createIntegerAttribute(tenantRollupsCollectionId, "closed_sessions", false, 0);
  await createIntegerAttribute(tenantRollupsCollectionId, "messages", false, 0);
  await createIntegerAttribute(tenantRollupsCollectionId, "customer_messages", false, 0);
  await createIntegerAttribute(tenantRollupsCollectionId, "bot_messages", false, 0);
  await createIntegerAttribute(tenantRollupsCollectionId, "agent_messages", false, 0);
  await createIntegerAttribute(tenantRollupsCollectionId, "handoffs", false, 0);
  await createIntegerAttribute(tenantRollupsCollectionId, "document_storage_bytes", false, 0);
  await createFloatAttribute(tenantRollupsCollectionId, "credit_balance", false, 0);
  await createStringAttribute(tenantRollupsCollectionId, "balance_reconciled_at", 50, false, "");
  await createStringAttribute(tenantRollupsCollectionId, "updated", 50, false, "");
}

async function addDailyRollupFields() {
  await ensureCollection(dailyRollupsCollectionId, "Monitor Daily Rollups");
  await createStringAttribute(dailyRollupsCollectionId, "tenant_id", 160, true);
  await createStringAttribute(dailyRollupsCollectionId, "date", 20, true);
  await createIntegerAttribute(dailyRollupsCollectionId, "messages", false, 0);
  await createIntegerAttribute(dailyRollupsCollectionId, "customer_messages", false, 0);
  await createIntegerAttribute(dailyRollupsCollectionId, "bot_messages", false, 0);
  await createIntegerAttribute(dailyRollupsCollectionId, "agent_messages", false, 0);
  await createStringAttribute(dailyRollupsCollectionId, "updated", 50, false, "");
}

async function addBotRollupFields() {
  await ensureCollection(botRollupsCollectionId, "Monitor Bot Rollups");
  await createStringAttribute(botRollupsCollectionId, "tenant_id", 160, true);
  await createStringAttribute(botRollupsCollectionId, "bot_id", 160, true);
  await createIntegerAttribute(botRollupsCollectionId, "conversations", false, 0);
  await createIntegerAttribute(botRollupsCollectionId, "messages", false, 0);
  await createStringAttribute(botRollupsCollectionId, "updated", 50, false, "");
}

async function addIndexes() {
  await waitForAttributes(sessionsCollectionId, ["tenant_id", "updated", "status", "session_token", "bot_id"]);
  await waitForAttributes(tenantRollupsCollectionId, ["tenant_id"]);
  await waitForAttributes(dailyRollupsCollectionId, ["tenant_id", "date"]);
  await waitForAttributes(botRollupsCollectionId, ["tenant_id", "bot_id"]);

  await createIndex(sessionsCollectionId, "tenant_id_idx", "key", ["tenant_id"]);
  await createIndex(sessionsCollectionId, "updated_idx", "key", ["updated"]);
  await createIndex(sessionsCollectionId, "status_idx", "key", ["status"]);
  await createIndex(sessionsCollectionId, "session_token_idx", "key", ["session_token"]);
  await createIndex(sessionsCollectionId, "bot_id_idx", "key", ["bot_id"]);
  await createIndex(tenantRollupsCollectionId, "tenant_id_unique", "unique", ["tenant_id"]);
  await createIndex(dailyRollupsCollectionId, "tenant_date_unique", "unique", ["tenant_id", "date"]);
  await createIndex(dailyRollupsCollectionId, "tenant_date_idx", "key", ["tenant_id", "date"]);
  await createIndex(botRollupsCollectionId, "tenant_bot_unique", "unique", ["tenant_id", "bot_id"]);
  await createIndex(botRollupsCollectionId, "tenant_id_idx", "key", ["tenant_id"]);
}

async function run() {
  await addSessionSummaryFields();
  await addTenantRollupFields();
  await addDailyRollupFields();
  await addBotRollupFields();

  await addIndexes();
  console.log("Monitor performance schema is ready.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

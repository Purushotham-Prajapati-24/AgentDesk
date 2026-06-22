/**
 * setup-tenant-indexes.mjs
 *
 * Adds `tenant_id` indexes to the collections that back the cockpit actions
 * (bots, ledger, document_files) so that Appwrite can serve tenant-scoped
 * queries via index rather than full collection scans.
 *
 * Follows the same conventions as setup-monitor-performance-schema.mjs:
 * - waitForAttributes polling before index creation
 * - 409-swallow on createIndex (idempotent re-runs)
 *
 * Usage:
 *   APPWRITE_API_KEY=xxx node scripts/setup-tenant-indexes.mjs
 */

import { Client, Databases } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;

const botsCollectionId = process.env.APPWRITE_BOTS_COLLECTION_ID || "bots";
const ledgerCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LEDGER_COLLECTION_ID || "ledger";
const documentsCollectionId = process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID || "document_files";
const webchatCollectionId = process.env.APPWRITE_WEBSITE_CHAT_CONFIG_COLLECTION_ID || "website_chat_config";

if (!endpoint || !projectId || !apiKey || !databaseId) {
  throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and database ID are required.");
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

// ---------------------------------------------------------------------------
// Helpers (mirrors setup-monitor-performance-schema.mjs)
// ---------------------------------------------------------------------------

async function createIndex(collectionId, key, type, attributes) {
  try {
    console.log(`Creating index ${collectionId}.${key}...`);
    await databases.createIndex(databaseId, collectionId, key, type, attributes);
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
    console.log(`  Index ${collectionId}.${key} already exists, skipping.`);
  }
}

async function waitForAttributes(collectionId, keys) {
  const pending = new Set(keys);
  const deadline = Date.now() + 60000;

  while (pending.size > 0) {
    const collection = await databases.getCollection(databaseId, collectionId);
    const available = new Set(
      (collection.attributes ?? [])
        .filter((attribute) => attribute.status === "available")
        .map((attribute) => attribute.key),
    );

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

// ---------------------------------------------------------------------------
// Index definitions
// ---------------------------------------------------------------------------

async function addBotIndexes() {
  await waitForAttributes(botsCollectionId, ["tenant_id"]);
  // Primary tenant lookup index for listBots / deleteBot queries
  await createIndex(botsCollectionId, "tenant_id_idx", "key", ["tenant_id"]);
}

async function addLedgerIndexes() {
  await waitForAttributes(ledgerCollectionId, ["tenant_id", "created"]);
  // Tenant-scoped ledger listing (billing page + backfill)
  await createIndex(ledgerCollectionId, "tenant_id_idx", "key", ["tenant_id"]);
  // Compound index for tenant + recent transactions sort (ORDER BY created DESC)
  await createIndex(ledgerCollectionId, "tenant_created_idx", "key", ["tenant_id", "created"]);
}

async function addDocumentIndexes() {
  await waitForAttributes(documentsCollectionId, ["tenant_id", "bot_id", "status"]);
  // Tenant-scoped document listing (upload + deleteBotDocuments)
  await createIndex(documentsCollectionId, "tenant_id_idx", "key", ["tenant_id"]);
  // Compound index for tenant + bot queries (ingest worker + bot-scoped listing)
  await createIndex(documentsCollectionId, "tenant_bot_idx", "key", ["tenant_id", "bot_id"]);
}

async function addWebchatIndexes() {
  await waitForAttributes(webchatCollectionId, ["tenant_id", "bot_id"]);
  // Tenant-scoped webchat config listing
  await createIndex(webchatCollectionId, "tenant_id_idx", "key", ["tenant_id"]);
  // Compound index for tenant + bot lookups
  await createIndex(webchatCollectionId, "tenant_bot_idx", "key", ["tenant_id", "bot_id"]);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  await addBotIndexes();
  await addLedgerIndexes();
  await addDocumentIndexes();
  await addWebchatIndexes();
  console.log("Tenant indexes are ready.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/**
 * backfill-billing-rollups.mjs
 *
 * Computes the full credit-balance and document-storage sum for every tenant
 * by paginating the ledger and document_files collections, then writes
 * `credit_balance`, `document_storage_bytes`, and `balance_reconciled_at`
 * into the existing `monitor_tenant_rollups` document.
 *
 * After this script runs, `getTenantBillingSnapshot()` will use the fast
 * rollup-backed path instead of paginating every ledger row.
 *
 * Usage:
 *   APPWRITE_API_KEY=xxx node scripts/backfill-billing-rollups.mjs
 */

import { Client, Databases, Query } from "node-appwrite";
import { createHash } from "node:crypto";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;

const ledgerCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LEDGER_COLLECTION_ID || "ledger";
const documentsCollectionId = process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID || "document_files";
const tenantRollupsCollectionId = process.env.APPWRITE_MONITOR_TENANT_ROLLUPS_COLLECTION_ID || "monitor_tenant_rollups";

const PAGE_LIMIT = 100;

if (!endpoint || !projectId || !apiKey || !databaseId) {
  throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and database ID are required.");
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

// ---------------------------------------------------------------------------
// Pagination helpers (mirrors backfill-monitor-rollups.mjs conventions)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Upsert helper — mirrors backfill-monitor-rollups.mjs conventions
// ---------------------------------------------------------------------------

async function upsert(collectionId, documentId, data) {
  try {
    await databases.updateDocument(databaseId, collectionId, documentId, data);
  } catch (error) {
    if (error.code !== 404) {
      throw error;
    }
    try {
      await databases.createDocument(databaseId, collectionId, documentId, data);
    } catch (createError) {
      if (createError.code !== 409) {
        throw createError;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function stringValue(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function documentStorageBytes(document) {
  if (document.file_type === "url" && typeof document.parsed_text === "string" && document.parsed_text.trim()) {
    return Buffer.byteLength(document.parsed_text, "utf8");
  }

  return numberValue(document.file_size);
}

/**
 * Deterministic document ID for a tenant rollup row.
 * Matches the scheme used in credits.ts:tenantRollupId() and
 * backfill-monitor-rollups.mjs:stableId().
 */
function tenantRollupDocId(tenantId) {
  const clean = tenantId.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const hash = createHash("sha1").update(`tenant_${tenantId}`).digest("hex").slice(0, 10);
  return `${clean.slice(0, 25)}_${hash}`.slice(0, 36);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  // 1. Discover all unique tenant IDs and compute per-tenant sums in one pass.
  const [ledgerRows, documentRows] = await Promise.all([
    listAll(ledgerCollectionId),
    listAll(documentsCollectionId),
  ]);

  const tenantIds = new Set();
  const ledgerBalances = new Map();
  const storageBytes = new Map();

  for (const row of ledgerRows) {
    const tid = stringValue(row.tenant_id, "");
    if (!tid) continue;
    tenantIds.add(tid);
    ledgerBalances.set(tid, (ledgerBalances.get(tid) ?? 0) + numberValue(row.amount));
  }

  for (const row of documentRows) {
    const tid = stringValue(row.tenant_id, "");
    if (!tid) continue;
    tenantIds.add(tid);
    storageBytes.set(tid, (storageBytes.get(tid) ?? 0) + documentStorageBytes(row));
  }

  console.log(`Found ${tenantIds.size} tenants across ${ledgerRows.length} ledger rows and ${documentRows.length} document rows.`);

  // 2. Upsert each tenant's rollup with reconciled billing fields.
  let updated = 0;
  const now = new Date().toISOString();

  for (const tenantId of tenantIds) {
    const creditBalance = ledgerBalances.get(tenantId) ?? 0;
    const docStorageBytes = storageBytes.get(tenantId) ?? 0;

    await upsert(tenantRollupsCollectionId, tenantRollupDocId(tenantId), {
      tenant_id: tenantId,
      credit_balance: creditBalance,
      document_storage_bytes: docStorageBytes,
      balance_reconciled_at: now,
      updated: now,
    });

    updated += 1;
    if (updated % 50 === 0) {
      console.log(`  Progress: ${updated}/${tenantIds.size} tenants reconciled...`);
    }
  }

  console.log(`Billing backfill complete: ${updated} tenant rollups updated with reconciled balances.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

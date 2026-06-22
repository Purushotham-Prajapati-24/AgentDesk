"use server";

import { Query, type Models } from "node-appwrite";
import { createAdminClient } from "@/lib/server/appwrite";
import { assertTenantAccess } from "@/lib/server/tenant-access";
import { documentStorageBytes, type FileDocument } from "@/lib/server/billing-helpers";
import { createHash } from "node:crypto";

export type LedgerTransaction = {
  id: string;
  amount: number;
  transactionType: string;
  description: string;
  created: string;
};

export type BillingSnapshot = {
  balance: number;
  transactions: LedgerTransaction[];
  stats: {
    activeSessions: number;
    activeSessionWindowMinutes: number;
    totalMessages: number;
    documentStorageBytes: number;
  };
};

type LedgerDocument = Models.Document & {
  tenant_id?: unknown;
  amount?: unknown;
  transaction_type?: unknown;
  description?: unknown;
  created?: unknown;
};

type TenantCreditsDocument = Models.Document & {
  credits?: unknown;
};

type TenantRollupDocument = Models.Document & {
  tenant_id?: unknown;
  credit_balance?: unknown;
  document_storage_bytes?: unknown;
  balance_reconciled_at?: unknown;
  updated?: unknown;
};

const PAGE_LIMIT = 100;
const DEFAULT_ACTIVE_SESSION_WINDOW_MINUTES = 30;

/**
 * Number of recent ledger transactions to display on the billing page when
 * the tenant rollup has been reconciled.  Keeping this bounded avoids the
 * unbounded pagination that caused the 2+ second billing spikes.
 */
const RECENT_TRANSACTIONS_LIMIT = 100;

export async function getTenantBillingSnapshot(tenantId: string): Promise<
  | { success: true; data: BillingSnapshot }
  | { success: false; error: string }
> {
  try {
    const [{ databases }] = await Promise.all([createAdminClient(), assertTenantAccess(tenantId)]);
    const activeSessionWindowMinutes = numberEnv(
      "BILLING_ACTIVE_SESSION_WINDOW_MINUTES",
      DEFAULT_ACTIVE_SESSION_WINDOW_MINUTES,
    );

    // Attempt the fast rollup-backed path first.  If the tenant rollup has been
    // reconciled (balance_reconciled_at is set), we can read precomputed totals
    // instead of paginating every ledger row and file row.
    const rollup = await readTenantRollup(databases, tenantId);
    if (rollup && rollup.balance_reconciled_at) {
      return getBillingSnapshotFromRollup(databases, tenantId, rollup, activeSessionWindowMinutes);
    }

    // Fallback: full paginate-and-sum.  This is the original path, used when
    // the tenant has not yet been reconciled (e.g. before backfill script runs).
    // New tenants reconcile nearly instantly since they have ~0 rows.
    return getBillingSnapshotFromFullPaginate(databases, tenantId, activeSessionWindowMinutes);
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to load billing data." };
  }
}

// ---------------------------------------------------------------------------
// Fast path: rollup-backed snapshot
// ---------------------------------------------------------------------------

async function getBillingSnapshotFromRollup(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
  rollup: { credit_balance: number; document_storage_bytes: number },
  activeSessionWindowMinutes: number,
): Promise<{ success: true; data: BillingSnapshot }> {
  const [tenantCredits, recentTransactions, activeSessionCount, messageCount] = await Promise.all([
    getTenantCredits(databases, tenantId),
    listRecentTransactions(databases, tenantId),
    countOpenRecentSessions(databases, tenantId, activeSessionWindowMinutes),
    countTenantDocuments(databases, messagesCollectionId(), tenantId),
  ]);

  return {
    success: true,
    data: {
      balance: tenantCredits + rollup.credit_balance,
      transactions: recentTransactions,
      stats: {
        activeSessions: activeSessionCount,
        activeSessionWindowMinutes,
        totalMessages: messageCount,
        documentStorageBytes: rollup.document_storage_bytes,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Fallback path: full paginate-and-sum + reconcile-then-persist
// ---------------------------------------------------------------------------

async function getBillingSnapshotFromFullPaginate(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
  activeSessionWindowMinutes: number,
): Promise<{ success: true; data: BillingSnapshot }> {
  const [tenantCredits, ledgerDocuments, activeSessionCount, messageCount, fileDocuments] = await Promise.all([
    getTenantCredits(databases, tenantId),
    listAllTenantDocuments<LedgerDocument>(databases, ledgerCollectionId(), tenantId, [Query.orderDesc("created")]),
    countOpenRecentSessions(databases, tenantId, activeSessionWindowMinutes),
    countTenantDocuments(databases, messagesCollectionId(), tenantId),
    listAllTenantDocuments<FileDocument>(databases, documentsCollectionId(), tenantId),
  ]);

  const transactions = ledgerDocuments.map(mapLedgerDocument);
  const computedBalance = calculateBalance(transactions);
  const computedStorageBytes = fileDocuments.reduce((total, document) => total + documentStorageBytes(document), 0);

  // Persist the computed totals into the rollup for future fast-path reads.
  // This is the reconcile-on-miss pattern: the first request after setup does
  // the full sum, writes it, and every subsequent request reads it instantly.
  await persistBillingRollup(databases, tenantId, computedBalance, computedStorageBytes);

  return {
    success: true,
    data: {
      balance: tenantCredits + computedBalance,
      transactions,
      stats: {
        activeSessions: activeSessionCount,
        activeSessionWindowMinutes,
        totalMessages: messageCount,
        documentStorageBytes: computedStorageBytes,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Lightweight credit-balance read (used by the chat debit gate)
// ---------------------------------------------------------------------------

export async function getTenantCreditBalance(tenantId: string): Promise<number> {
  try {
    const { databases } = await createAdminClient();
    await assertTenantAccess(tenantId);

    // Fast path: read the reconciled rollup balance directly (one getDocument).
    const rollup = await readTenantRollup(databases, tenantId);
    if (rollup && rollup.balance_reconciled_at) {
      const tenantCredits = await getTenantCredits(databases, tenantId);
      return tenantCredits + rollup.credit_balance;
    }

    // Fallback: full snapshot (necessary if not yet reconciled).
    const snapshot = await getTenantBillingSnapshot(tenantId);
    if (!snapshot.success) {
      throw new Error(snapshot.error);
    }
    return snapshot.data.balance;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Unable to read credit balance.");
  }
}

// ---------------------------------------------------------------------------
// Rollup read/write helpers
// ---------------------------------------------------------------------------

async function readTenantRollup(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
): Promise<{ credit_balance: number; document_storage_bytes: number; balance_reconciled_at: string | null } | null> {
  try {
    const response = await databases.listDocuments(databaseId(), tenantRollupsCollectionId(), [
      Query.equal("tenant_id", tenantId),
      Query.limit(1),
    ]);
    const document = response.documents[0] as TenantRollupDocument | undefined;
    if (!document) {
      return null;
    }

    return {
      credit_balance: numberValue(document.credit_balance),
      document_storage_bytes: numberValue(document.document_storage_bytes),
      balance_reconciled_at: typeof document.balance_reconciled_at === "string" ? document.balance_reconciled_at : null,
    };
  } catch {
    return null;
  }
}

async function persistBillingRollup(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
  creditBalance: number,
  documentStorageBytes: number,
) {
  try {
    const documentId = tenantRollupId(tenantId);
    const now = new Date().toISOString();

    const data: Record<string, unknown> = {
      credit_balance: creditBalance,
      document_storage_bytes: documentStorageBytes,
      balance_reconciled_at: now,
      updated: now,
    };

    // Try update first (rollup row already exists from monitor work).
    try {
      await databases.updateDocument(databaseId(), tenantRollupsCollectionId(), documentId, data);
      return;
    } catch (updateError) {
      // If the rollup document doesn't exist yet, create it.
      if (errorCode(updateError) !== 404) {
        throw updateError;
      }
    }

    try {
      await databases.createDocument(databaseId(), tenantRollupsCollectionId(), documentId, {
        tenant_id: tenantId,
        credit_balance: creditBalance,
        document_storage_bytes: documentStorageBytes,
        balance_reconciled_at: now,
        updated: now,
        // Include zero-init fields expected by monitor-rollups.ts
        conversations: 0,
        active_sessions: 0,
        paused_sessions: 0,
        closed_sessions: 0,
        messages: 0,
        customer_messages: 0,
        bot_messages: 0,
        agent_messages: 0,
        handoffs: 0,
      });
    } catch (createError) {
      // Two concurrent first-time reconcile requests may both reach createDocument.
      // The second gets a 409 (document already created by the winner).  This is
      // safe — swallow the 409; the rollup will be refreshed on next request.
      if (errorCode(createError) !== 409) {
        throw createError;
      }
    }
  } catch (error) {
    // Best-effort: don't block the billing page if rollup write fails.
    // The next request will reconcile again.
    console.warn("[credits] billing rollup persist failed", error);
  }
}

function tenantRollupId(tenantId: string) {
  const clean = tenantId.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const hash = createHash("sha1").update(`tenant_${tenantId}`).digest("hex").slice(0, 10);
  return `${clean.slice(0, 25)}_${hash}`.slice(0, 36);
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

async function listRecentTransactions(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
): Promise<LedgerTransaction[]> {
  const response = await databases.listDocuments(databaseId(), ledgerCollectionId(), [
    Query.equal("tenant_id", tenantId),
    Query.orderDesc("created"),
    Query.limit(RECENT_TRANSACTIONS_LIMIT),
  ]);
  return response.documents.map(mapLedgerDocument);
}

async function countTenantDocuments(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  collectionId: string,
  tenantId: string,
) {
  const response = await databases.listDocuments(databaseId(), collectionId, [
    Query.equal("tenant_id", tenantId),
    Query.limit(1),
  ]);

  return response.total;
}

async function listAllTenantDocuments<T extends Models.Document>(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  collectionId: string,
  tenantId: string,
  extraQueries: string[] = [],
) {
  const documents: T[] = [];
  let cursor: string | null = null;

  while (true) {
    const response: Models.DocumentList<Models.Document> = await databases.listDocuments(databaseId(), collectionId, [
      Query.equal("tenant_id", tenantId),
      ...extraQueries,
      Query.limit(PAGE_LIMIT),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ]);
    documents.push(...(response.documents as T[]));

    if (response.documents.length < PAGE_LIMIT) {
      return documents;
    }

    cursor = response.documents.at(-1)?.$id ?? null;
    if (!cursor) {
      return documents;
    }
  }
}

async function getTenantCredits(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
) {
  try {
    const tenant = (await databases.getDocument(databaseId(), tenantsCollectionId(), tenantId)) as TenantCreditsDocument;
    return numberValue(tenant.credits);
  } catch {
    return 0;
  }
}

async function countOpenRecentSessions(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
  windowMinutes: number,
) {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const sessions = await databases.listDocuments(databaseId(), sessionsCollectionId(), [
    Query.equal("tenant_id", tenantId),
    Query.equal("status", ["active", "paused_by_human"]),
    Query.greaterThanEqual("updated", cutoff),
    Query.limit(1),
  ]);

  return sessions.total;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function calculateBalance(transactions: LedgerTransaction[]) {
  return transactions.reduce((total, transaction) => total + transaction.amount, 0);
}

function mapLedgerDocument(document: LedgerDocument): LedgerTransaction {
  return {
    id: document.$id,
    amount: numberValue(document.amount),
    transactionType: stringValue(document.transaction_type, "UNKNOWN"),
    description: stringValue(document.description, "Ledger transaction"),
    created: stringValue(document.created, document.$createdAt),
  };
}

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function ledgerCollectionId() {
  // IMPORTANT: This must match the collection ID used by the chat debit writer
  // (src/app/api/chat/message/route.ts).  Both reader and writer fall back to
  // "ledger" when NEXT_PUBLIC_APPWRITE_LEDGER_COLLECTION_ID is unset.
  //
  // Note: the original default was "ledger_transactions".  It was changed to
  // "ledger" when the debit writer was updated.  All deployed environments set
  // NEXT_PUBLIC_APPWRITE_LEDGER_COLLECTION_ID explicitly, so the fallback only
  // affects local development where both reader and writer use the same value.
  return process.env.NEXT_PUBLIC_APPWRITE_LEDGER_COLLECTION_ID ?? "ledger";
}

function tenantsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_TENANTS_COLLECTION_ID ?? process.env.APPWRITE_TENANTS_COLLECTION_ID ?? "tenants";
}

function sessionsCollectionId() {
  return process.env.APPWRITE_SESSIONS_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_SESSIONS_COLLECTION_ID ?? "sessions";
}

function messagesCollectionId() {
  return process.env.APPWRITE_MESSAGES_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID ?? "messages";
}

function documentsCollectionId() {
  return process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_COLLECTION_ID ?? "document_files";
}

function tenantRollupsCollectionId() {
  return process.env.APPWRITE_MONITOR_TENANT_ROLLUPS_COLLECTION_ID ?? "monitor_tenant_rollups";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberEnv(key: string, fallback: number) {
  const parsed = Number.parseInt(process.env[key] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function errorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return 0;
  }

  const code = Number((error as { code?: unknown }).code);
  return Number.isFinite(code) ? code : 0;
}

"use server";

import { Query, type Models } from "node-appwrite";
import { createAdminClient, createSessionClient } from "@/lib/server/appwrite";
import { getAuthorizedTenantDocument } from "@/lib/server/tenant-access";

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

type FileDocument = Models.Document & {
  file_size?: unknown;
};

type TenantDocument = Models.Document & {
  credits?: unknown;
};

const PAGE_LIMIT = 100;
const DEFAULT_ACTIVE_SESSION_WINDOW_MINUTES = 30;

export async function getTenantBillingSnapshot(tenantId: string): Promise<
  | { success: true; data: BillingSnapshot }
  | { success: false; error: string }
> {
  try {
    const [{ account }, { databases }] = await Promise.all([createSessionClient(), createAdminClient()]);
    await assertTenantAccess(account, tenantId);
    const activeSessionWindowMinutes = numberEnv(
      "BILLING_ACTIVE_SESSION_WINDOW_MINUTES",
      DEFAULT_ACTIVE_SESSION_WINDOW_MINUTES,
    );

    const [tenantCredits, ledgerDocuments, activeSessionCount, messageCount, fileDocuments] = await Promise.all([
      getTenantCredits(databases, tenantId),
      listAllTenantDocuments<LedgerDocument>(databases, ledgerCollectionId(), tenantId, [Query.orderDesc("created")]),
      countOpenRecentSessions(databases, tenantId, activeSessionWindowMinutes),
      countTenantDocuments(databases, messagesCollectionId(), tenantId),
      listAllTenantDocuments<FileDocument>(databases, documentsCollectionId(), tenantId),
    ]);

    const transactions = ledgerDocuments.map(mapLedgerDocument);

    return {
      success: true,
      data: {
        balance: tenantCredits + calculateBalance(transactions),
        transactions,
        stats: {
          activeSessions: activeSessionCount,
          activeSessionWindowMinutes,
          totalMessages: messageCount,
          documentStorageBytes: fileDocuments.reduce((total, document) => total + numberValue(document.file_size), 0),
        },
      },
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to load billing data." };
  }
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
  databases: Awaited<ReturnType<typeof createSessionClient>>["databases"],
  tenantId: string,
) {
  try {
    const tenant = (await databases.getDocument(databaseId(), tenantsCollectionId(), tenantId)) as TenantDocument;
    return numberValue(tenant.credits);
  } catch {
    return 0;
  }
}

async function countOpenRecentSessions(
  databases: Awaited<ReturnType<typeof createSessionClient>>["databases"],
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

export async function getTenantCreditBalance(tenantId: string) {
  const snapshot = await getTenantBillingSnapshot(tenantId);
  if (!snapshot.success) {
    throw new Error(snapshot.error);
  }

  return snapshot.data.balance;
}

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

async function assertTenantAccess(account: Awaited<ReturnType<typeof createSessionClient>>["account"], tenantId: string) {
  if (!isSafeId(tenantId)) {
    throw new Error("Invalid tenant scope.");
  }

  const user = await account.get();
  await getAuthorizedTenantDocument(user.$id, tenantId);
}

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function ledgerCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_LEDGER_COLLECTION_ID ?? "ledger_transactions";
}

function tenantsCollectionId() {
  return process.env.APPWRITE_TENANTS_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_TENANTS_COLLECTION_ID ?? "tenants";
}

function sessionsCollectionId() {
  return process.env.APPWRITE_SESSIONS_COLLECTION_ID ?? "sessions";
}

function messagesCollectionId() {
  return process.env.APPWRITE_MESSAGES_COLLECTION_ID ?? "messages";
}

function documentsCollectionId() {
  return process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_COLLECTION_ID ?? "document_files";
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

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

"use server";

import { Query, type Models } from "node-appwrite";
import { createSessionClient } from "@/lib/server/appwrite";

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

const PAGE_LIMIT = 100;

export async function getTenantBillingSnapshot(tenantId: string): Promise<
  | { success: true; data: BillingSnapshot }
  | { success: false; error: string }
> {
  try {
    const { account, databases } = await createSessionClient();
    await assertTenantAccess(account, tenantId);

    const [ledger, sessions, messages, files] = await Promise.all([
      databases.listDocuments(databaseId(), ledgerCollectionId(), [
        Query.equal("tenant_id", tenantId),
        Query.orderDesc("created"),
        Query.limit(PAGE_LIMIT),
      ]),
      databases.listDocuments(databaseId(), sessionsCollectionId(), [
        Query.equal("tenant_id", tenantId),
        Query.equal("status", "active"),
        Query.limit(1),
      ]),
      databases.listDocuments(databaseId(), messagesCollectionId(), [Query.limit(1)]),
      databases.listDocuments(databaseId(), documentsCollectionId(), [Query.equal("tenant_id", tenantId), Query.limit(PAGE_LIMIT)]),
    ]);

    const transactions = ledger.documents.map((document) => mapLedgerDocument(document as LedgerDocument));

    return {
      success: true,
      data: {
        balance: calculateBalance(transactions),
        transactions,
        stats: {
          activeSessions: sessions.total,
          totalMessages: messages.total,
          documentStorageBytes: files.documents.reduce(
            (total, document) => total + numberValue((document as FileDocument).file_size),
            0,
          ),
        },
      },
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unable to load billing data." };
  }
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
  const prefs = user.prefs as { tenant_id?: string };
  if (prefs.tenant_id !== tenantId) {
    throw new Error("You do not have access to this tenant.");
  }
}

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function ledgerCollectionId() {
  return process.env.APPWRITE_LEDGER_COLLECTION_ID ?? "ledger_transactions";
}

function sessionsCollectionId() {
  return process.env.APPWRITE_SESSIONS_COLLECTION_ID ?? "sessions";
}

function messagesCollectionId() {
  return process.env.APPWRITE_MESSAGES_COLLECTION_ID ?? "messages";
}

function documentsCollectionId() {
  return process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID ?? "document_files";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

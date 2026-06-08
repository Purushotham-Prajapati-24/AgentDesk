import { ID } from "node-appwrite";

type LockDocument = {
  expires_at?: unknown;
};

type LockDatabase = {
  createDocument: (databaseId: string, collectionId: string, documentId: string, data: Record<string, unknown>) => Promise<unknown>;
  deleteDocument: (databaseId: string, collectionId: string, documentId: string) => Promise<unknown>;
  getDocument: (databaseId: string, collectionId: string, documentId: string) => Promise<LockDocument>;
};

type ClaimLockOptions = {
  databaseId: string;
  collectionId: string;
  documentId: string;
  tenantId: string;
  botId: string;
  workerId: string;
  ttlMs?: number;
  now?: Date;
};

const DEFAULT_LOCK_TTL_MS = 15 * 60 * 1000;

export async function claimIngestionLock(databases: LockDatabase, options: ClaimLockOptions) {
  const now = options.now ?? new Date();
  const ttlMs = options.ttlMs ?? DEFAULT_LOCK_TTL_MS;
  const lockData = {
    document_id: options.documentId,
    tenant_id: options.tenantId,
    bot_id: options.botId,
    worker_id: options.workerId,
    locked_at: now.toISOString(),
    expires_at: new Date(now.getTime() + ttlMs).toISOString(),
  };

  try {
    await databases.createDocument(options.databaseId, options.collectionId, options.documentId, lockData);
    return true;
  } catch (error) {
    if (!isAppwriteCode(error, 409)) {
      throw error;
    }
  }

  const existingLock = await getExistingLock(databases, options);
  if (!existingLock || !isExpired(existingLock.expires_at, now)) {
    return false;
  }

  try {
    await databases.deleteDocument(options.databaseId, options.collectionId, options.documentId);
  } catch (error) {
    if (!isAppwriteCode(error, 404)) {
      return false;
    }
  }

  try {
    await databases.createDocument(options.databaseId, options.collectionId, options.documentId, lockData);
    return true;
  } catch (error) {
    if (isAppwriteCode(error, 409)) {
      return false;
    }
    throw error;
  }
}

export async function releaseIngestionLock(databases: LockDatabase, databaseId: string, collectionId: string, documentId: string) {
  try {
    await databases.deleteDocument(databaseId, collectionId, documentId);
  } catch (error) {
    if (!isAppwriteCode(error, 404)) {
      throw error;
    }
  }
}

export function createWorkerId() {
  return `${Date.now().toString(36)}-${ID.unique()}`;
}

async function getExistingLock(databases: LockDatabase, options: ClaimLockOptions) {
  try {
    return await databases.getDocument(options.databaseId, options.collectionId, options.documentId);
  } catch (error) {
    if (isAppwriteCode(error, 404)) {
      return null;
    }
    throw error;
  }
}

function isExpired(value: unknown, now: Date) {
  if (typeof value !== "string") {
    return true;
  }

  const expiresAt = Date.parse(value);
  return Number.isNaN(expiresAt) || expiresAt <= now.getTime();
}

function isAppwriteCode(error: unknown, code: number) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === code;
}

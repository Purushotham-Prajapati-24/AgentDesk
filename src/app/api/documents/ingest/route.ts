import { Query, type Models, type Users } from "node-appwrite";
import { createAdminClient } from "@/lib/server/appwrite";
import { getAuthorizedTenantDocument } from "@/lib/server/tenant-access";
import { createChunks } from "@/lib/server/chunking";
import { WebsiteCrawler } from "@/lib/server/crawler";
import { createEmbeddings } from "@/lib/server/embeddings";
import { claimIngestionLock, createWorkerId, releaseIngestionLock } from "@/lib/server/ingestion-locks";
import { recordDocumentStorageAdded } from "@/lib/server/monitor-rollups";
import { upsertKnowledgePoints } from "@/lib/server/qdrant";

type IngestRequest = {
  tenant_id: string;
  bot_id: string;
  user_id?: string;
  limit?: number;
  worker_id?: string;
};

type DocumentFile = Models.Document & {
  tenant_id?: unknown;
  bot_id?: unknown;
  file_name?: unknown;
  file_type?: unknown;
  attempts?: unknown;
  parsed_text?: unknown;
  storage_path?: unknown;
  file_size?: unknown;
  status?: unknown;
};

export async function POST(request: Request) {
  let body: IngestRequest;

  try {
    body = (await request.json()) as IngestRequest;
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", 422);
  }

  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id.trim() : "";
  const botId = typeof body.bot_id === "string" ? body.bot_id.trim() : "";
  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const limit = typeof body.limit === "number" ? Math.min(Math.max(body.limit, 1), 3) : 1;
  const workerId = isSafeWorkerId(body.worker_id) ? body.worker_id : createWorkerId();

  if (!isSafeId(tenantId) || !isSafeId(botId) || !userId) {
    return jsonError("INVALID_SCOPE", "tenant_id, bot_id, and user_id are required.", 422);
  }

  try {
    const { users, databases } = await createAdminClient();
    await assertTenantAccess(users, userId, tenantId);

    const documents = await listPendingDocuments(databases, tenantId, botId, limit);

    const results = [];
    let claimed = 0;
    const crawler = new WebsiteCrawler();
    for (const document of documents.documents as DocumentFile[]) {
      const didClaim = await claimDocument(databases, document, tenantId, botId, workerId);
      if (!didClaim) {
        continue;
      }

      claimed += 1;
      try {
        if ((document.status === "queued" || document.status === "crawling") && document.file_type === "url") {
          const queuedResult = await crawlQueuedDocument(databases, crawler, document);
          if (queuedResult.status === "failed") {
            results.push(queuedResult);
            continue;
          }
        }

        results.push(await processDocument(databases, document, tenantId, botId));
      } finally {
        await releaseIngestionLock(databases, databaseId(), ingestionLocksCollectionId(), document.$id);
      }
    }

    const remaining = await countRemainingDocuments(databases, tenantId, botId);
    return Response.json({ success: true, data: { processed: results, claimed, remaining, worker_id: workerId } }, { status: 200 });
  } catch (error: unknown) {
    return jsonError("INGEST_FAILED", getErrorMessage(error), 500);
  }
}

async function listPendingDocuments(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
  botId: string,
  limit: number,
) {
  return databases.listDocuments(databaseId(), documentsCollectionId(), [
    Query.equal("tenant_id", tenantId),
    Query.equal("bot_id", botId),
    Query.or([Query.equal("status", "queued"), Query.equal("status", "crawling"), Query.equal("status", "processing")]),
    Query.limit(limit),
  ]);
}

async function countRemainingDocuments(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
  botId: string,
) {
  const remaining = await listPendingDocuments(databases, tenantId, botId, 1);
  return remaining.total;
}

async function claimDocument(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  document: DocumentFile,
  tenantId: string,
  botId: string,
  workerId: string,
) {
  if (document.tenant_id !== tenantId || document.bot_id !== botId) {
    throw new Error("Document scope mismatch.");
  }

  const claimed = await claimIngestionLock(databases, {
    databaseId: databaseId(),
    collectionId: ingestionLocksCollectionId(),
    documentId: document.$id,
    tenantId,
    botId,
    workerId,
  });

  if (claimed && (document.status === "queued" || document.status === "crawling")) {
    try {
      await updateDocumentCompat(databases, document.$id, {
        status: "crawling",
        updated: new Date().toISOString(),
      });
      document.status = "crawling";
    } catch (error) {
      await releaseIngestionLock(databases, databaseId(), ingestionLocksCollectionId(), document.$id);
      throw error;
    }
  }

  return claimed;
}

async function crawlQueuedDocument(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  crawler: WebsiteCrawler,
  document: DocumentFile,
) {
  if (document.file_type !== "url") {
    await markDocumentFailed(databases, document, "Queued document is not a URL.");
    return { document_id: document.$id, chunks: 0, status: "failed", error: "Queued document is not a URL." };
  }

  const url = stringValue(document.storage_path, "");
  if (!url) {
    await markDocumentFailed(databases, document, "Queued URL document is missing storage_path.");
    return { document_id: document.$id, chunks: 0, status: "failed", error: "Queued URL document is missing storage_path." };
  }

  try {
    const markdown = await crawler.crawl(url);
    if (!markdown.trim()) {
      throw new Error("No readable text could be extracted from this URL.");
    }
    const markdownBytes = Buffer.byteLength(markdown, "utf8");

    await updateDocumentCompat(databases, document.$id, {
      parsed_text: markdown,
      file_size: markdownBytes,
      status: "processing",
      last_error: "",
      updated: new Date().toISOString(),
    });
    await recordBestEffort("document storage rollup", () =>
      recordDocumentStorageAdded(databases, stringValue(document.tenant_id, ""), markdownBytes),
    );

    document.parsed_text = markdown;
    document.file_size = markdownBytes;
    document.status = "processing";
    return { document_id: document.$id, status: "processing" };
  } catch (error) {
    await markDocumentFailed(databases, document, getErrorMessage(error));
    return { document_id: document.$id, chunks: 0, status: "failed", error: getErrorMessage(error) };
  }
}

async function processDocument(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  document: DocumentFile,
  tenantId: string,
  botId: string,
) {
  if (document.tenant_id !== tenantId || document.bot_id !== botId) {
    throw new Error("Document scope mismatch.");
  }

  const parsedText = stringValue(document.parsed_text, "");
  const chunks = createChunks(parsedText);
  if (chunks.length === 0) {
    await markDocumentFailed(databases, document, "No chunks were created from parsed_text.");
    return { document_id: document.$id, chunks: 0, status: "failed" };
  }

  const embeddings = await createEmbeddings(chunks.map((chunk) => chunk.content));
  await upsertKnowledgePoints({
    chunks,
    embeddings,
    tenantId,
    botId,
    fileId: document.$id,
    fileName: stringValue(document.file_name, "document"),
  });

  await updateDocumentCompat(databases, document.$id, {
    status: "processed",
    last_error: "",
    updated: new Date().toISOString(),
  });

  return { document_id: document.$id, chunks: chunks.length, status: "processed" };
}

async function markDocumentFailed(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  document: DocumentFile,
  errorMessage = "Document ingestion failed.",
) {
  await updateDocumentCompat(databases, document.$id, {
    attempts: numberValue(document.attempts, 0) + 1,
    status: "failed",
    last_error: errorMessage.slice(0, 1000),
    updated: new Date().toISOString(),
  });
}

async function updateDocumentCompat(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  documentId: string,
  data: Record<string, unknown>,
) {
  const remaining = { ...data };

  while (true) {
    try {
      return await databases.updateDocument(databaseId(), documentsCollectionId(), documentId, remaining);
    } catch (error) {
      const unknownAttribute = getUnknownAttribute(error);
      if (!unknownAttribute || !(unknownAttribute in remaining)) {
        throw error;
      }

      delete remaining[unknownAttribute];
    }
  }
}

async function assertTenantAccess(users: Users, userId: string, tenantId: string) {
  await users.get(userId);
  await getAuthorizedTenantDocument(userId, tenantId);
}

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function documentsCollectionId() {
  return process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID ?? "document_files";
}

function ingestionLocksCollectionId() {
  return process.env.APPWRITE_INGESTION_LOCKS_COLLECTION_ID ?? "ingestion_locks";
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

function isSafeWorkerId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_.:-]{3,200}$/.test(value);
}

function jsonError(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Document ingestion failed.";
}

function getUnknownAttribute(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  return error.message.match(/Unknown attribute: "([^"]+)"/)?.[1] ?? null;
}

async function recordBestEffort(label: string, callback: () => Promise<unknown>) {
  try {
    await callback();
  } catch (error) {
    console.warn(`[documents/ingest] ${label} update failed`, error);
  }
}

import { Query, type Models, type Users } from "node-appwrite";
import { createAdminClient } from "@/lib/server/appwrite";
import { createChunks } from "@/lib/server/chunking";
import { createEmbeddings } from "@/lib/server/embeddings";
import { upsertKnowledgePoints } from "@/lib/server/qdrant";

type IngestRequest = {
  tenant_id: string;
  bot_id: string;
  user_id?: string;
  limit?: number;
};

type DocumentFile = Models.Document & {
  tenant_id?: unknown;
  bot_id?: unknown;
  file_name?: unknown;
  parsed_text?: unknown;
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
  const limit = typeof body.limit === "number" ? Math.min(Math.max(body.limit, 1), 50) : 10;

  if (!isSafeId(tenantId) || !isSafeId(botId) || !userId) {
    return jsonError("INVALID_SCOPE", "tenant_id, bot_id, and user_id are required.", 422);
  }

  try {
    const { users, databases } = await createAdminClient();
    await assertTenantAccess(users, userId, tenantId);

    const documents = await databases.listDocuments(databaseId(), documentsCollectionId(), [
      Query.equal("tenant_id", tenantId),
      Query.equal("bot_id", botId),
      Query.equal("status", "processing"),
      Query.limit(limit),
    ]);

    const results = [];
    for (const document of documents.documents as DocumentFile[]) {
      results.push(await processDocument(databases, document, tenantId, botId));
    }

    return Response.json({ success: true, data: { processed: results } }, { status: 200 });
  } catch (error: unknown) {
    return jsonError("INGEST_FAILED", getErrorMessage(error), 500);
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
    await databases.updateDocument(databaseId(), documentsCollectionId(), document.$id, {
      status: "failed",
      updated: new Date().toISOString(),
    });
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

  await databases.updateDocument(databaseId(), documentsCollectionId(), document.$id, {
    status: "processed",
    updated: new Date().toISOString(),
  });

  return { document_id: document.$id, chunks: chunks.length, status: "processed" };
}

async function assertTenantAccess(users: Users, userId: string, tenantId: string) {
  const user = await users.get(userId);
  const prefs = user.prefs as { tenant_id?: string };
  if (prefs.tenant_id !== tenantId) {
    throw new Error("You do not have access to this tenant.");
  }
}

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function documentsCollectionId() {
  return process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID ?? "document_files";
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

function jsonError(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Document ingestion failed.";
}

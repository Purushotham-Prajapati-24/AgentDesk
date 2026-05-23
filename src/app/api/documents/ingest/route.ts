import { Query, type Models } from "node-appwrite";
import { createSessionClient } from "@/lib/server/appwrite";

type IngestRequest = {
  tenant_id: string;
  bot_id: string;
  limit?: number;
};

type DocumentFile = Models.Document & {
  tenant_id?: unknown;
  bot_id?: unknown;
  file_name?: unknown;
  parsed_text?: unknown;
  status?: unknown;
};

type EmbeddingResponse = {
  data?: Array<{
    index: number;
    embedding: number[];
  }>;
};

type Chunk = {
  content: string;
  chunkIndex: number;
};

const CHUNK_SIZE = 2200;
const CHUNK_OVERLAP = 220;
const MAX_DOCUMENTS = 10;

export async function POST(request: Request) {
  let body: IngestRequest;

  try {
    body = (await request.json()) as IngestRequest;
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", 422);
  }

  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id.trim() : "";
  const botId = typeof body.bot_id === "string" ? body.bot_id.trim() : "";
  const limit = Math.min(Math.max(Number(body.limit ?? MAX_DOCUMENTS), 1), MAX_DOCUMENTS);

  if (!isSafeId(tenantId) || !isSafeId(botId)) {
    return jsonError("INVALID_SCOPE", "tenant_id and bot_id are required.", 422);
  }

  try {
    const { account, databases } = await createSessionClient();
    await assertTenantAccess(account, tenantId);

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
  databases: Awaited<ReturnType<typeof createSessionClient>>["databases"],
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
  await upsertQdrantPoints(
    embeddings.map((embedding, index) => ({
      id: crypto.randomUUID(),
      vector: embedding,
      payload: {
        tenant_id: tenantId,
        bot_id: botId,
        file_id: document.$id,
        file_name: stringValue(document.file_name, "document"),
        content: chunks[index]?.content ?? "",
        chunk_index: chunks[index]?.chunkIndex ?? index,
      },
    })),
  );

  await databases.updateDocument(databaseId(), documentsCollectionId(), document.$id, {
    status: "processed",
    updated: new Date().toISOString(),
  });

  return { document_id: document.$id, chunks: chunks.length, status: "processed" };
}

function createChunks(text: string): Chunk[] {
  const sections = text
    .split(/\n(?=#{1,6}\s)|\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let current = "";

  for (const section of sections) {
    if ((current + "\n\n" + section).length <= CHUNK_SIZE) {
      current = current ? `${current}\n\n${section}` : section;
      continue;
    }

    pushChunk(chunks, current);
    current = overlapText(current) + section;

    while (current.length > CHUNK_SIZE) {
      pushChunk(chunks, current.slice(0, CHUNK_SIZE));
      current = overlapText(current.slice(0, CHUNK_SIZE)) + current.slice(CHUNK_SIZE);
    }
  }

  pushChunk(chunks, current);
  return chunks;
}

function pushChunk(chunks: Chunk[], content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return;
  }

  chunks.push({ content: trimmed, chunkIndex: chunks.length });
}

function overlapText(text: string) {
  const trimmed = text.trim();
  return trimmed ? `${trimmed.slice(Math.max(0, trimmed.length - CHUNK_OVERLAP))}\n` : "";
}

async function createEmbeddings(inputs: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for document ingestion.");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: inputs,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI embedding request failed.");
  }

  const body = (await response.json()) as EmbeddingResponse;
  const embeddings = [...(body.data ?? [])].sort((a, b) => a.index - b.index).map((item) => item.embedding);
  if (embeddings.length !== inputs.length) {
    throw new Error("Embedding count did not match chunk count.");
  }

  return embeddings;
}

async function upsertQdrantPoints(points: Array<{ id: string; vector: number[]; payload: Record<string, string | number> }>) {
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;
  const collection = process.env.QDRANT_COLLECTION ?? "agent_knowledge_base";

  if (!qdrantUrl || !qdrantApiKey) {
    throw new Error("Qdrant configuration is required for document ingestion.");
  }

  const response = await fetch(`${qdrantUrl.replace(/\/$/, "")}/collections/${collection}/points?wait=true`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "api-key": qdrantApiKey,
    },
    body: JSON.stringify({ points }),
  });

  if (!response.ok) {
    throw new Error("Qdrant upsert failed.");
  }
}

async function assertTenantAccess(account: Awaited<ReturnType<typeof createSessionClient>>["account"], tenantId: string) {
  const user = await account.get();
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

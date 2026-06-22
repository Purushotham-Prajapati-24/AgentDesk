import type { Chunk } from "./chunking";
import { createHash } from "node:crypto";

const EMBEDDING_DIMENSIONS = 768;

export type KnowledgePayload = {
  tenant_id: string;
  bot_id: string;
  file_id: string;
  file_name: string;
  content: string;
  chunk_index: number;
};

export type RetrievedPoint = {
  id?: string | number;
  score?: number;
  payload?: Partial<KnowledgePayload>;
};

type Point = {
  id: string;
  vector: number[] | Record<string, unknown>;
  payload: KnowledgePayload;
};

export function activeCollection() {
  if (process.env.RAG_INDEX_VERSION === "v2") {
    return process.env.QDRANT_COLLECTION_V2 ?? `${baseCollection()}_v2`;
  }

  return process.env.QDRANT_COLLECTION_V1 ?? process.env.QDRANT_COLLECTION ?? baseCollection();
}

export function v2Collection() {
  return process.env.QDRANT_COLLECTION_V2 ?? `${baseCollection()}_v2`;
}

export function isHybridIndexEnabled() {
  return process.env.RAG_INDEX_VERSION === "v2";
}

export async function ensureHybridCollection() {
  const config = qdrantConfig();
  if (!config) {
    throw new Error("Qdrant configuration is required.");
  }

  const response = await fetch(`${config.url}/collections/${v2Collection()}`, {
    method: "PUT",
    headers: qdrantHeaders(config.apiKey),
    body: JSON.stringify({
      vectors: {
        dense: {
          size: EMBEDDING_DIMENSIONS,
          distance: "Cosine",
        },
      },
      sparse_vectors: {
        bm25: {
          modifier: "idf",
        },
      },
    }),
  });

  if (!response.ok && response.status !== 409) {
    throw new Error("Qdrant hybrid collection setup failed.");
  }

  await ensurePayloadIndex(config, "tenant_id");
  await ensurePayloadIndex(config, "bot_id");
}

export async function upsertKnowledgePoints({
  chunks,
  embeddings,
  tenantId,
  botId,
  fileId,
  fileName,
}: {
  chunks: Chunk[];
  embeddings: number[][];
  tenantId: string;
  botId: string;
  fileId: string;
  fileName: string;
}) {
  const config = qdrantConfig();
  if (!config) {
    throw new Error("Qdrant configuration is required for document ingestion.");
  }

  if (!hasStrictTenantBotIds(tenantId, botId)) {
    throw new Error("tenantId and botId are required for document ingestion.");
  }

  if (isHybridIndexEnabled()) {
    await ensureHybridCollection();
  }

  const points: Point[] = chunks.map((chunk, index) => {
    const payload: KnowledgePayload = {
      tenant_id: tenantId,
      bot_id: botId,
      file_id: fileId,
      file_name: fileName,
      content: chunk.content,
      chunk_index: chunk.chunkIndex,
    };

    return {
      id: knowledgePointId(fileId, chunk.chunkIndex),
      vector: isHybridIndexEnabled()
        ? {
            dense: embeddings[index],
            bm25: {
              text: chunk.content,
              model: "qdrant/bm25",
            },
          }
        : embeddings[index],
      payload,
    };
  });

  const response = await fetch(`${config.url}/collections/${activeCollection()}/points?wait=true`, {
    method: "PUT",
    headers: qdrantHeaders(config.apiKey),
    body: JSON.stringify({ points }),
  });

  if (!response.ok) {
    throw new Error("Qdrant upsert failed.");
  }
}

export function knowledgePointId(fileId: string, chunkIndex: number) {
  const hash = createHash("sha256").update(`${fileId}:${chunkIndex}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variantNibble(hash[16])}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function deleteKnowledgePointsForBot(tenantId: string, botId: string) {
  if (!hasStrictTenantBotIds(tenantId, botId)) {
    throw new Error("tenantId and botId are required to delete knowledge points.");
  }

  const config = qdrantConfig();
  if (!config) {
    return { skipped: true, deleted: false };
  }

  // wait=false: this is a user-triggered bot deletion. Blocking on Qdrant
  // segment compaction adds latency the caller never benefits from — the bot
  // document is gone either way, and the points are filtered by a stable
  // (tenant_id, bot_id) tuple so async deletion is correct regardless of
  // whether the parent doc still exists.
  const response = await fetch(`${config.url}/collections/${activeCollection()}/points/delete?wait=false`, {
    method: "POST",
    headers: qdrantHeaders(config.apiKey),
    body: JSON.stringify({
      filter: tenantBotFilter(tenantId, botId),
    }),
  });

  if (!response.ok) {
    const body = await safeReadQdrantBody(response);
    throw new Error(`Qdrant bot knowledge deletion failed (status ${response.status}): ${body}`);
  }

  return { skipped: false, deleted: true };
}

export async function denseSearch(vector: number[], tenantId: string, botId: string, limit: number) {
  if (!hasStrictTenantBotIds(tenantId, botId)) {
    return [];
  }

  const config = qdrantConfig();
  if (!config) {
    return [];
  }

  const body = denseSearchBody(vector, tenantId, botId, limit, isHybridIndexEnabled());

  const path = isHybridIndexEnabled() ? "points/query" : "points/search";
  const response = await fetch(`${config.url}/collections/${activeCollection()}/${path}`, {
    method: "POST",
    headers: qdrantHeaders(config.apiKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Qdrant dense search failed.");
  }

  const result = (await response.json()) as { result?: RetrievedPoint[] | { points?: RetrievedPoint[] } };
  return Array.isArray(result.result) ? result.result : result.result?.points ?? [];
}

export async function bm25Search(query: string, tenantId: string, botId: string, limit: number) {
  if (!isHybridIndexEnabled()) {
    return [];
  }

  if (!hasStrictTenantBotIds(tenantId, botId)) {
    return [];
  }

  const config = qdrantConfig();
  if (!config) {
    return [];
  }

  const response = await fetch(`${config.url}/collections/${activeCollection()}/points/query`, {
    method: "POST",
    headers: qdrantHeaders(config.apiKey),
    body: JSON.stringify(bm25SearchBody(query, tenantId, botId, limit)),
  });

  if (!response.ok) {
    throw new Error("Qdrant BM25 search failed.");
  }

  const result = (await response.json()) as { result?: RetrievedPoint[] | { points?: RetrievedPoint[] } };
  return Array.isArray(result.result) ? result.result : result.result?.points ?? [];
}

function qdrantConfig() {
  const url = process.env.ENPOINT_URL ?? process.env.QDRANT_URL;
  const apiKey = process.env.API_KEY ?? process.env.QDRANT_API_KEY;
  return url && apiKey ? { url: url.replace(/\/$/, ""), apiKey } : null;
}

async function ensurePayloadIndex(config: { url: string; apiKey: string }, fieldName: keyof typeof payloadIndexSchemas) {
  const response = await fetch(`${config.url}/collections/${v2Collection()}/index`, {
    method: "PUT",
    headers: qdrantHeaders(config.apiKey),
    body: JSON.stringify({
      field_name: fieldName,
      field_schema: payloadIndexSchemas[fieldName],
    }),
  });

  if (!response.ok && response.status !== 409 && !(response.status === 400 && (await response.text().catch(() => "")).toLowerCase().includes("already"))) {
    throw new Error(`Qdrant payload index setup failed for ${fieldName}.`);
  }
}

function qdrantHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "api-key": apiKey,
  };
}

/**
 * Best-effort read of a Qdrant error response body for inclusion in thrown
 * errors.  Bodies are typically small JSON blobs; we cap at 1KB so a malformed
 * server can't OOM us with an unbounded stream, and never throw if the read
 * itself fails — losing the body is better than masking the original error.
 */
async function safeReadQdrantBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.length > 1024 ? `${text.slice(0, 1024)}…(truncated)` : text;
  } catch {
    return "<unreadable response body>";
  }
}

export const payloadIndexSchemas = {
  tenant_id: { type: "keyword", is_tenant: true },
  bot_id: "keyword",
} as const;

export function tenantBotFilter(tenantId: string, botId: string) {
  return {
    must: [
      { key: "tenant_id", match: { value: tenantId } },
      { key: "bot_id", match: { value: botId } },
    ],
  };
}

export function hasStrictTenantBotIds(tenantId: string, botId: string) {
  return typeof tenantId === "string" && tenantId.trim().length > 0 && typeof botId === "string" && botId.trim().length > 0;
}

export function denseSearchBody(vector: number[], tenantId: string, botId: string, limit: number, hybridIndexEnabled: boolean) {
  const filter = tenantBotFilter(tenantId, botId);

  return hybridIndexEnabled
    ? {
        query: vector,
        using: "dense",
        limit,
        with_payload: true,
        filter,
      }
    : {
        vector,
        limit,
        with_payload: true,
        filter,
      };
}

export function bm25SearchBody(query: string, tenantId: string, botId: string, limit: number) {
  return {
    query: {
      text: query,
      model: "qdrant/bm25",
    },
    using: "bm25",
    limit,
    with_payload: true,
    filter: tenantBotFilter(tenantId, botId),
  };
}

function baseCollection() {
  return process.env.QDRANT_COLLECTION ?? "agent_knowledge_base";
}

function variantNibble(value: string) {
  const nibble = Number.parseInt(value, 16);
  return ((nibble & 0x3) | 0x8).toString(16);
}

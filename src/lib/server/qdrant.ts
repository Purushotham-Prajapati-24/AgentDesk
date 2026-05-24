import type { Chunk } from "@/lib/server/chunking";
import { EMBEDDING_DIMENSIONS } from "@/lib/server/embeddings";

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
      id: crypto.randomUUID(),
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

export async function denseSearch(vector: number[], tenantId: string, botId: string, limit: number) {
  const config = qdrantConfig();
  if (!config) {
    return [];
  }

  const body = isHybridIndexEnabled()
    ? {
        query: vector,
        using: "dense",
        limit,
        with_payload: true,
        filter: tenantBotFilter(tenantId, botId),
      }
    : {
        vector,
        limit,
        with_payload: true,
        filter: tenantBotFilter(tenantId, botId),
      };

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

  const config = qdrantConfig();
  if (!config) {
    return [];
  }

  const response = await fetch(`${config.url}/collections/${activeCollection()}/points/query`, {
    method: "POST",
    headers: qdrantHeaders(config.apiKey),
    body: JSON.stringify({
      query: {
        text: query,
        model: "qdrant/bm25",
      },
      using: "bm25",
      limit,
      with_payload: true,
      filter: tenantBotFilter(tenantId, botId),
    }),
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

async function ensurePayloadIndex(config: { url: string; apiKey: string }, fieldName: string) {
  const response = await fetch(`${config.url}/collections/${v2Collection()}/index`, {
    method: "PUT",
    headers: qdrantHeaders(config.apiKey),
    body: JSON.stringify({
      field_name: fieldName,
      field_schema: "keyword",
    }),
  });

  if (!response.ok && response.status !== 409) {
    throw new Error(`Qdrant payload index setup failed for ${fieldName}.`);
  }
}

function qdrantHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "api-key": apiKey,
  };
}

function tenantBotFilter(tenantId: string, botId: string) {
  return {
    must: [
      { key: "tenant_id", match: { value: tenantId } },
      { key: "bot_id", match: { value: botId } },
    ],
  };
}

function baseCollection() {
  return process.env.QDRANT_COLLECTION ?? "agent_knowledge_base";
}

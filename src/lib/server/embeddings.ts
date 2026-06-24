import { geminiPool } from "./llm-providers";
import { parseRetryAfter } from "./key-pool";

type GeminiEmbeddingResponse = {
  embedding?: {
    values?: number[];
  };
};

type GeminiBatchEmbeddingResponse = {
  embeddings?: Array<{
    values?: number[];
  }>;
};

const GEMINI_EMBEDDING_MODEL = "models/gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 768;

export async function createEmbedding(input: string) {
  const attemptedKeys = new Set<string>();
  while (true) {
    const key = geminiPool.next();
    if (!key || attemptedKeys.has(key)) {
      throw new Error("All Gemini keys are exhausted or rate-limited for embedding.");
    }
    attemptedKeys.add(key);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GEMINI_EMBEDDING_MODEL,
          content: { parts: [{ text: input }] },
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const errBody = await response.text().catch(() => "(unreadable)");
        const err = new Error(`Embedding request failed. HTTP ${status}: ${errBody}`) as any;
        err.status = status;
        err.headers = response.headers;
        throw err;
      }

      const body = (await response.json()) as GeminiEmbeddingResponse;
      const embedding = body.embedding?.values;
      if (!isEmbeddingVector(embedding)) {
        throw new Error("Embedding response was empty.");
      }

      return embedding;
    } catch (error: any) {
      console.error(`[embeddings] Error with key ...${key.slice(-6)}:`, error.message);
      const status = error.status;
      if (status === 429) {
        const retryAfterHeader = error.headers?.get("retry-after") ?? null;
        const retryAfterSecs = parseRetryAfter(retryAfterHeader);
        geminiPool.markRateLimited(key, retryAfterSecs);
        continue;
      } else if (status === 401 || status === 403) {
        geminiPool.markDead(key);
        continue;
      } else {
        geminiPool.markRateLimited(key, 10);
        continue;
      }
    }
  }
}

export async function createEmbeddings(inputs: string[]) {
  if (inputs.length === 0) {
    return [];
  }

  const attemptedKeys = new Set<string>();
  while (true) {
    const key = geminiPool.next();
    if (!key || attemptedKeys.has(key)) {
      throw new Error("All Gemini keys are exhausted or rate-limited for batch embedding.");
    }
    attemptedKeys.add(key);

    try {
      const requests = inputs.map((input) => ({
        model: GEMINI_EMBEDDING_MODEL,
        content: { parts: [{ text: input }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }));

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        const status = response.status;
        const errBody = await response.text().catch(() => "(unreadable)");
        const err = new Error(`Batch embedding request failed. HTTP ${status}: ${errBody}`) as any;
        err.status = status;
        err.headers = response.headers;
        throw err;
      }

      const body = (await response.json()) as GeminiBatchEmbeddingResponse;
      const embeddings = body.embeddings?.map((item) => item.values).filter(isEmbeddingVector);
      if (!embeddings || embeddings.length !== inputs.length) {
        throw new Error("Embedding count did not match chunk count.");
      }

      return embeddings;
    } catch (error: any) {
      console.error(`[batch-embeddings] Error with key ...${key.slice(-6)}:`, error.message);
      const status = error.status;
      if (status === 429) {
        const retryAfterHeader = error.headers?.get("retry-after") ?? null;
        const retryAfterSecs = parseRetryAfter(retryAfterHeader);
        geminiPool.markRateLimited(key, retryAfterSecs);
        continue;
      } else if (status === 401 || status === 403) {
        geminiPool.markDead(key);
        continue;
      } else {
        geminiPool.markRateLimited(key, 10);
        continue;
      }
    }
  }
}

export function isEmbeddingVector(value: number[] | undefined): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((dimension) => typeof dimension === "number" && Number.isFinite(dimension));
}

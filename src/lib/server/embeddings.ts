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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required.");
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMINI_EMBEDDING_MODEL,
      content: { parts: [{ text: input }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    throw new Error("Embedding request failed.");
  }

  const body = (await response.json()) as GeminiEmbeddingResponse;
  const embedding = body.embedding?.values;
  if (!isEmbeddingVector(embedding)) {
    throw new Error("Embedding response was empty.");
  }

  return embedding;
}

export async function createEmbeddings(inputs: string[]) {
  if (inputs.length === 0) {
    return [];
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for document ingestion.");
  }

  const requests = inputs.map((input) => ({
    model: GEMINI_EMBEDDING_MODEL,
    content: { parts: [{ text: input }] },
    outputDimensionality: EMBEDDING_DIMENSIONS,
  }));

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Gemini Embed Error:", errorText);
    throw new Error("Gemini embedding request failed.");
  }

  const body = (await response.json()) as GeminiBatchEmbeddingResponse;
  const embeddings = body.embeddings?.map((item) => item.values).filter(isEmbeddingVector);
  if (!embeddings || embeddings.length !== inputs.length) {
    throw new Error("Embedding count did not match chunk count.");
  }

  return embeddings;
}

export function isEmbeddingVector(value: number[] | undefined): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((dimension) => typeof dimension === "number" && Number.isFinite(dimension));
}

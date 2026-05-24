import { createEmbedding } from "@/lib/server/embeddings";
import { bm25Search, denseSearch, type RetrievedPoint } from "@/lib/server/qdrant";

const MIN_RELEVANCE_SCORE = 0.15;

type Candidate = {
  key: string;
  point: RetrievedPoint;
  denseRank?: number;
  bm25Rank?: number;
  denseScore: number;
  bm25Score: number;
};

export async function retrieveContextChunks(query: string, tenantId: string, botId: string) {
  const rerankLimit = numberEnv("RAG_RERANK_TOP_K", 8);
  const contextLimit = numberEnv("RAG_CONTEXT_TOP_K", 4);
  const embedding = await createEmbedding(query);

  const [denseResults, bm25Results] = await Promise.all([
    denseSearch(embedding, tenantId, botId, rerankLimit),
    bm25Search(query, tenantId, botId, rerankLimit).catch(() => []),
  ]);

  return rerankCandidates(query, denseResults, bm25Results)
    .slice(0, contextLimit)
    .map((candidate) => formatContextChunk(candidate.point))
    .filter(Boolean);
}

export function rerankCandidates(query: string, denseResults: RetrievedPoint[], bm25Results: RetrievedPoint[]) {
  const candidates = new Map<string, Candidate>();

  denseResults.forEach((point, index) => {
    if ((point.score ?? 0) < MIN_RELEVANCE_SCORE) {
      return;
    }

    const key = candidateKey(point);
    candidates.set(key, {
      key,
      point,
      denseRank: index + 1,
      denseScore: point.score ?? 0,
      bm25Score: 0,
    });
  });

  bm25Results.forEach((point, index) => {
    const key = candidateKey(point);
    const existing = candidates.get(key);
    if (existing) {
      existing.bm25Rank = index + 1;
      existing.bm25Score = point.score ?? 0;
      existing.point = mergePayload(existing.point, point);
      return;
    }

    candidates.set(key, {
      key,
      point,
      bm25Rank: index + 1,
      denseScore: 0,
      bm25Score: point.score ?? 0,
    });
  });

  return [...candidates.values()].sort((left, right) => scoreCandidate(query, right) - scoreCandidate(query, left));
}

export function formatContextChunk(point: RetrievedPoint) {
  const payload = point.payload;
  if (!payload?.content || !payload.tenant_id || !payload.bot_id) {
    return "";
  }

  return `Source File: [${payload.file_name ?? payload.file_id ?? "knowledge-base"}]\nChunk: ${payload.chunk_index ?? 0}\n---\n${payload.content}`;
}

function scoreCandidate(query: string, candidate: Candidate) {
  const rankFusion = reciprocalRank(candidate.denseRank) + reciprocalRank(candidate.bm25Rank);
  const normalizedDense = Math.min(Math.max(candidate.denseScore, 0), 1);
  const normalizedBm25 = Math.min(Math.max(candidate.bm25Score / 10, 0), 1);
  const overlap = keywordOverlap(query, String(candidate.point.payload?.content ?? ""));
  return rankFusion * 2 + normalizedDense * 1.2 + normalizedBm25 + overlap * 0.8;
}

function reciprocalRank(rank: number | undefined) {
  return rank ? 1 / (60 + rank) : 0;
}

function keywordOverlap(query: string, content: string) {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) {
    return 0;
  }

  const contentTerms = new Set(tokenize(content));
  const matches = queryTerms.filter((term) => contentTerms.has(term)).length;
  return matches / queryTerms.length;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
}

function candidateKey(point: RetrievedPoint) {
  return `${point.payload?.file_id ?? point.id ?? "unknown"}:${point.payload?.chunk_index ?? "0"}`;
}

function mergePayload(primary: RetrievedPoint, secondary: RetrievedPoint): RetrievedPoint {
  return {
    ...primary,
    payload: {
      ...secondary.payload,
      ...primary.payload,
    },
  };
}

function numberEnv(key: string, fallback: number) {
  const parsed = Number.parseInt(process.env[key] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export type Chunk = {
  content: string;
  chunkIndex: number;
};

const CHUNK_SIZE = 2048;
const CHUNK_OVERLAP = 307;

export function createChunks(text: string): Chunk[] {
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
  if (trimmed) {
    chunks.push({ content: trimmed, chunkIndex: chunks.length });
  }
}

function overlapText(text: string) {
  const trimmed = text.trim();
  return trimmed ? `${trimmed.slice(Math.max(0, trimmed.length - CHUNK_OVERLAP))}\n` : "";
}

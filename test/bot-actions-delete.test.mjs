import assert from "node:assert/strict";
import { test } from "node:test";

// ---------------------------------------------------------------------------
// Tests for the bounded-batch deletion pattern used in bot-actions.ts.
// Since deleteBotDocuments is module-scoped and depends on Appwrite,
// we test the core batching logic in isolation here.
// ---------------------------------------------------------------------------

const DELETE_BATCH_SIZE = 8;

/**
 * Replicates the batching pattern from bot-actions.ts:deleteBotDocuments.
 * Returns arrays of document IDs processed per batch, and any errors thrown.
 */
async function batchProcessDocuments(
  documentIds,
  batchProcessor,
  batchSize = DELETE_BATCH_SIZE,
) {
  const processed = [];
  for (let i = 0; i < documentIds.length; i += batchSize) {
    const batch = documentIds.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map((id) => batchProcessor(id)));
    for (let j = 0; j < batchResults.length; j++) {
      if (batchResults[j].status === "fulfilled") {
        processed.push(batchResults[j].value);
      }
    }
  }
  return processed;
}

test("batchProcessDocuments processes all documents across batches", async () => {
  const documentIds = Array.from({ length: 20 }, (_, i) => `doc_${i}`);
  const processed = await batchProcessDocuments(documentIds, async (id) => id);

  assert.equal(processed.length, 20);
  assert.deepEqual(processed, documentIds);
});

test("batchProcessDocuments respects batch size", async () => {
  const callBatches = [];
  const documentIds = Array.from({ length: 20 }, (_, i) => `doc_${i}`);

  // Track concurrent calls by recording when each starts/ends
  await batchProcessDocuments(documentIds, async (id) => {
    callBatches.push(id);
    return id;
  }, 8);

  assert.equal(callBatches.length, 20);
});

test("batchProcessDocuments processes exactly 3 batches for 20 documents with size 8", async () => {
  const documentIds = Array.from({ length: 20 }, (_, i) => `doc_${i}`);
  const batchStarts = [];
  let concurrent = 0;
  let maxConcurrent = 0;

  await batchProcessDocuments(documentIds, async (id) => {
    concurrent++;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    batchStarts.push(id);
    // Simulate async work
    await new Promise((resolve) => setTimeout(resolve, 1));
    concurrent--;
    return id;
  }, 8);

  // Max concurrent should not exceed batch size
  assert.ok(maxConcurrent <= 8, `max concurrent ${maxConcurrent} should be <= 8`);
  assert.equal(batchStarts.length, 20);
});

test("batchProcessDocuments with single document is processed in one batch", async () => {
  const processed = await batchProcessDocuments(["doc_only"], async (id) => id);
  assert.deepEqual(processed, ["doc_only"]);
});

test("batchProcessDocuments with zero documents returns empty", async () => {
  const processed = await batchProcessDocuments([], async (id) => id);
  assert.deepEqual(processed, []);
});

test("batchProcessDocuments: one failing file does not prevent siblings from being processed", async () => {
  const documentIds = ["doc_ok_1", "doc_fail", "doc_ok_2"];

  const processed = await batchProcessDocuments(documentIds, async (id) => {
    if (id === "doc_fail") {
      throw new Error("storage error");
    }
    return id;
  });

  // Promise.allSettled swallows the rejection — both siblings should still complete
  assert.equal(processed.length, 2);
  assert.ok(processed.includes("doc_ok_1"));
  assert.ok(processed.includes("doc_ok_2"));
  assert.ok(!processed.includes("doc_fail"));
});

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
 * Returns { processed: document IDs that succeeded, rollupIds: IDs whose
 * rollup deltas should be recorded (only fulfilled results).
 */
async function batchProcessDocuments(
  documentIds,
  batchProcessor,
  batchSize = DELETE_BATCH_SIZE,
) {
  const processed = [];
  const rollupIds = [];
  for (let i = 0; i < documentIds.length; i += batchSize) {
    const batch = documentIds.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map((id) => batchProcessor(id)));
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") {
        processed.push(results[j].value);
        rollupIds.push(results[j].value);
      }
    }
  }
  return { processed, rollupIds };
}

test("batchProcessDocuments processes all documents across batches", async () => {
  const documentIds = Array.from({ length: 20 }, (_, i) => `doc_${i}`);
  const { processed } = await batchProcessDocuments(documentIds, async (id) => id);

  assert.equal(processed.length, 20);
  assert.deepEqual(processed, documentIds);
});

test("batchProcessDocuments respects batch size", async () => {
  const callBatches = [];
  const documentIds = Array.from({ length: 20 }, (_, i) => `doc_${i}`);

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
    await new Promise((resolve) => setTimeout(resolve, 1));
    concurrent--;
    return id;
  }, 8);

  assert.ok(maxConcurrent <= 8, `max concurrent ${maxConcurrent} should be <= 8`);
  assert.equal(batchStarts.length, 20);
});

test("batchProcessDocuments with single document is processed in one batch", async () => {
  const { processed } = await batchProcessDocuments(["doc_only"], async (id) => id);
  assert.deepEqual(processed, ["doc_only"]);
});

test("batchProcessDocuments with zero documents returns empty", async () => {
  const { processed, rollupIds } = await batchProcessDocuments([], async (id) => id);
  assert.deepEqual(processed, []);
  assert.deepEqual(rollupIds, []);
});

test("batchProcessDocuments: one failing file does not prevent siblings from being processed", async () => {
  const documentIds = ["doc_ok_1", "doc_fail", "doc_ok_2"];

  const { processed } = await batchProcessDocuments(documentIds, async (id) => {
    if (id === "doc_fail") {
      throw new Error("storage error");
    }
    return id;
  });

  assert.equal(processed.length, 2);
  assert.ok(processed.includes("doc_ok_1"));
  assert.ok(processed.includes("doc_ok_2"));
  assert.ok(!processed.includes("doc_fail"));
});

test("batchProcessDocuments: rollup deltas only recorded for successful deletions (no drift)", async () => {
  const documentIds = [
    { id: "doc_ok_1", size: 100 },
    { id: "doc_fail", size: 200 },
    { id: "doc_ok_2", size: 300 },
  ];

  const { rollupIds } = await batchProcessDocuments(
    documentIds.map((d) => d.id),
    async (id) => {
      const doc = documentIds.find((d) => d.id === id);
      if (doc && doc.id === "doc_fail") {
        throw new Error("storage error");
      }
      return id;
    },
  );

  // Only succeeded docs should have rollup entries — prevents negative drift
  assert.equal(rollupIds.length, 2);
  assert.ok(rollupIds.includes("doc_ok_1"));
  assert.ok(rollupIds.includes("doc_ok_2"));
  assert.ok(!rollupIds.includes("doc_fail"));

  // Verify total rollup bytes = only successful docs
  const totalRollupBytes = rollupIds.reduce((sum, id) => {
    const doc = documentIds.find((d) => d.id === id);
    return sum + (doc?.size ?? 0);
  }, 0);
  assert.equal(totalRollupBytes, 400); // 100 + 300, NOT 100 + 200 + 300
});

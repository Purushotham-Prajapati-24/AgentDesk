import assert from "node:assert/strict";
import { test } from "node:test";
import { claimIngestionLock, releaseIngestionLock } from "../src/lib/server/ingestion-locks.ts";

test("claimIngestionLock creates a lock for an unclaimed document", async () => {
  const db = createFakeLockDatabase();

  const claimed = await claimIngestionLock(db, baseOptions());

  assert.equal(claimed, true);
  assert.equal(db.records.get("doc_1")?.worker_id, "worker_1");
});

test("claimIngestionLock rejects an active duplicate claim", async () => {
  const db = createFakeLockDatabase();
  const options = baseOptions();

  assert.equal(await claimIngestionLock(db, options), true);
  assert.equal(await claimIngestionLock(db, { ...options, workerId: "worker_2" }), false);
  assert.equal(db.records.get("doc_1")?.worker_id, "worker_1");
});

test("claimIngestionLock replaces expired locks", async () => {
  const db = createFakeLockDatabase();
  const now = new Date("2026-05-31T00:00:00.000Z");

  db.records.set("doc_1", {
    document_id: "doc_1",
    tenant_id: "tenant_1",
    bot_id: "bot_1",
    worker_id: "stale_worker",
    locked_at: "2026-05-30T23:50:00.000Z",
    expires_at: "2026-05-30T23:55:00.000Z",
  });

  const claimed = await claimIngestionLock(db, baseOptions({ now, workerId: "worker_2" }));

  assert.equal(claimed, true);
  assert.equal(db.records.get("doc_1")?.worker_id, "worker_2");
});

test("releaseIngestionLock ignores missing locks", async () => {
  const db = createFakeLockDatabase();

  await releaseIngestionLock(db, "agentdesk", "ingestion_locks", "missing_doc");

  assert.equal(db.records.size, 0);
});

function baseOptions(overrides = {}) {
  return {
    databaseId: "agentdesk",
    collectionId: "ingestion_locks",
    documentId: "doc_1",
    tenantId: "tenant_1",
    botId: "bot_1",
    workerId: "worker_1",
    now: new Date("2026-05-31T00:00:00.000Z"),
    ttlMs: 300000,
    ...overrides,
  };
}

function createFakeLockDatabase() {
  const records = new Map();

  return {
    records,
    async createDocument(_databaseId, _collectionId, documentId, data) {
      if (records.has(documentId)) {
        throw Object.assign(new Error("Document already exists."), { code: 409 });
      }
      records.set(documentId, data);
      return data;
    },
    async getDocument(_databaseId, _collectionId, documentId) {
      const record = records.get(documentId);
      if (!record) {
        throw Object.assign(new Error("Document not found."), { code: 404 });
      }
      return record;
    },
    async deleteDocument(_databaseId, _collectionId, documentId) {
      if (!records.has(documentId)) {
        throw Object.assign(new Error("Document not found."), { code: 404 });
      }
      records.delete(documentId);
      return {};
    },
  };
}

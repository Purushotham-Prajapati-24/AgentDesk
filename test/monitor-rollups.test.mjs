import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapSessionSummary,
  recordMessageCreated,
  recordSessionStatusChanged,
} from "../src/lib/server/monitor-rollups.ts";

test("mapSessionSummary tolerates missing legacy summary fields", () => {
  const summary = mapSessionSummary({
    $id: "session_1",
    $createdAt: "2026-06-01T00:00:00.000Z",
    $updatedAt: "2026-06-01T00:01:00.000Z",
    tenant_id: "tenant_1",
    bot_id: "bot_1",
    session_token: "token_1",
    status: "paused_by_human",
  });

  assert.equal(summary.messageCount, 0);
  assert.equal(summary.lastMessage, "No messages recorded yet.");
  assert.equal(summary.lastSender, "unknown");
  assert.equal(summary.status, "paused_by_human");
});

test("recordMessageCreated emits atomic counters for customer messages", async () => {
  const db = createFakeDatabase();
  seedRollups(db, "tenant_1", "bot_1");

  await recordMessageCreated(
    db,
    {
      $id: "session_1",
      tenant_id: "tenant_1",
      bot_id: "bot_1",
      $createdAt: "",
      $updatedAt: "",
    },
    "customer",
    "hello",
    "2026-06-01T12:00:00.000Z",
  );

  const sessionUpdate = db.updates.find((update) => update.collectionId === "sessions");
  assert.match(sessionUpdate.data.message_count, /"method":"increment"/);
  assert.match(sessionUpdate.data.customer_message_count, /"values":\[1\]/);
  assert.equal(sessionUpdate.data.last_sender, "customer");

  const tenantUpdate = db.updates.find((update) => update.collectionId === "monitor_tenant_rollups");
  assert.match(tenantUpdate.data.messages, /"values":\[1\]/);
  assert.match(tenantUpdate.data.customer_messages, /"values":\[1\]/);

  const dailyUpdate = db.updates.find((update) => update.collectionId === "monitor_daily_rollups");
  assert.match(dailyUpdate.data.messages, /"values":\[1\]/);
  assert.match(dailyUpdate.data.customer_messages, /"values":\[1\]/);
});

test("recordSessionStatusChanged decrements old status and increments new status", async () => {
  const db = createFakeDatabase();
  seedRollups(db, "tenant_1", "bot_1");

  await recordSessionStatusChanged(
    db,
    "active",
    "paused_by_human",
    {
      $id: "session_1",
      tenant_id: "tenant_1",
      $createdAt: "",
      $updatedAt: "",
    },
  );

  const tenantUpdate = db.updates.find((update) => update.collectionId === "monitor_tenant_rollups");
  assert.match(tenantUpdate.data.active_sessions, /"values":\[-1\]/);
  assert.match(tenantUpdate.data.paused_sessions, /"values":\[1\]/);
  assert.match(tenantUpdate.data.handoffs, /"values":\[1\]/);
});

test("recordSessionStatusChanged pre-seeds missing rollup before decrementing old status", async () => {
  const db = createFakeDatabase();

  await recordSessionStatusChanged(
    db,
    "active",
    "paused_by_human",
    {
      $id: "session_1",
      tenant_id: "tenant_1",
      $createdAt: "",
      $updatedAt: "",
    },
  );

  const createdRollup = db.creates.find((create) => create.collectionId === "monitor_tenant_rollups");
  assert.equal(createdRollup.data.active_sessions, 1);

  const tenantUpdate = db.updates.find((update) => update.collectionId === "monitor_tenant_rollups");
  assert.match(tenantUpdate.data.active_sessions, /"values":\[-1\]/);
  assert.match(tenantUpdate.data.paused_sessions, /"values":\[1\]/);
});

function createFakeDatabase() {
  const documents = new Map();
  const updates = [];
  const creates = [];
  return {
    updates,
    creates,
    documents,
    async getDocument(_databaseId, collectionId, documentId) {
      const document = documents.get(`${collectionId}:${documentId}`);
      if (!document) {
        const error = new Error("not found");
        error.code = 404;
        throw error;
      }
      return document;
    },
    async createDocument(_databaseId, collectionId, documentId, data) {
      creates.push({ collectionId, documentId, data });
      const document = { $id: documentId, $createdAt: "", $updatedAt: "", ...data };
      documents.set(`${collectionId}:${documentId}`, document);
      return document;
    },
    async updateDocument(_databaseId, collectionId, documentId, data) {
      updates.push({ collectionId, documentId, data });
      const existing = documents.get(`${collectionId}:${documentId}`) ?? { $id: documentId, $createdAt: "", $updatedAt: "" };
      const updated = { ...existing, ...data };
      documents.set(`${collectionId}:${documentId}`, updated);
      return updated;
    },
    async listDocuments() {
      return { total: 0, documents: [] };
    },
  };
}

function seedRollups(db, tenantId, botId) {
  db.documents.set(`monitor_tenant_rollups:tenant_${tenantId}`, { $id: `tenant_${tenantId}` });
  db.documents.set(`monitor_daily_rollups:daily_${tenantId}_2026-06-01`, { $id: `daily_${tenantId}_2026-06-01` });
  db.documents.set(`monitor_bot_rollups:bot_${tenantId}_${botId}`, { $id: `bot_${tenantId}_${botId}` });
}

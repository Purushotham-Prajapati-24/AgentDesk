import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

const qdrant = await import("../src/lib/server/qdrant.ts");

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.QDRANT_URL = "https://qdrant.test";
  process.env.QDRANT_API_KEY = "test-key";
  delete process.env.ENPOINT_URL;
  delete process.env.API_KEY;
  delete process.env.QDRANT_COLLECTION;
  delete process.env.QDRANT_COLLECTION_V1;
  delete process.env.QDRANT_COLLECTION_V2;
  delete process.env.RAG_INDEX_VERSION;
});

afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
});

test("dense v2 query includes strict tenant and bot filters", async () => {
  process.env.RAG_INDEX_VERSION = "v2";
  const calls = mockFetch([{ ok: true, json: async () => ({ result: { points: [] } }) }]);

  await qdrant.denseSearch([0.1, 0.2], "tenant-1", "bot-1", 7);

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/points\/query$/);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    query: [0.1, 0.2],
    using: "dense",
    limit: 7,
    with_payload: true,
    filter: qdrant.tenantBotFilter("tenant-1", "bot-1"),
  });
});

test("BM25 query includes strict tenant and bot filters", async () => {
  process.env.RAG_INDEX_VERSION = "v2";
  const calls = mockFetch([{ ok: true, json: async () => ({ result: { points: [] } }) }]);

  await qdrant.bm25Search("refund policy", "tenant-1", "bot-1", 5);

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/points\/query$/);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    query: {
      text: "refund policy",
      model: "qdrant/bm25",
    },
    using: "bm25",
    limit: 5,
    with_payload: true,
    filter: qdrant.tenantBotFilter("tenant-1", "bot-1"),
  });
});

test("legacy dense search includes strict tenant and bot filters", async () => {
  const calls = mockFetch([{ ok: true, json: async () => ({ result: [] }) }]);

  await qdrant.denseSearch([0.3, 0.4], "tenant-1", "bot-1", 3);

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/points\/search$/);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    vector: [0.3, 0.4],
    limit: 3,
    with_payload: true,
    filter: qdrant.tenantBotFilter("tenant-1", "bot-1"),
  });
});

test("invalid tenant or bot inputs do not call Qdrant search", async () => {
  process.env.RAG_INDEX_VERSION = "v2";
  const calls = mockFetch([]);

  assert.deepEqual(await qdrant.denseSearch([0.1], "", "bot-1", 3), []);
  assert.deepEqual(await qdrant.denseSearch([0.1], "tenant-1", "  ", 3), []);
  assert.deepEqual(await qdrant.bm25Search("refund policy", "  ", "bot-1", 3), []);

  assert.equal(calls.length, 0);
});

test("hybrid collection setup creates tenant-aware and bot keyword payload indexes", async () => {
  const calls = mockFetch([
    { ok: true, json: async () => ({}) },
    { ok: true, json: async () => ({}) },
    { ok: true, json: async () => ({}) },
  ]);

  await qdrant.ensureHybridCollection();

  const indexBodies = calls.filter((call) => call.url.endsWith("/index")).map((call) => JSON.parse(call.init.body));
  assert.deepEqual(indexBodies, [
    {
      field_name: "tenant_id",
      field_schema: { type: "keyword", is_tenant: true },
    },
    {
      field_name: "bot_id",
      field_schema: "keyword",
    },
  ]);
  assert.deepEqual(qdrant.payloadIndexSchemas.tenant_id, { type: "keyword", is_tenant: true });
  assert.equal(qdrant.payloadIndexSchemas.bot_id, "keyword");
});

function mockFetch(responses) {
  const calls = [];

  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const response = responses.shift();
    assert.ok(response, `Unexpected fetch call to ${url}`);
    return {
      status: response.status ?? 200,
      ok: response.ok,
      json: response.json ?? (async () => ({})),
      text: response.text ?? (async () => ""),
    };
  };

  return calls;
}

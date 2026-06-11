import assert from "node:assert/strict";
import { test } from "node:test";
import {
  __clearMonitorMemoryCacheForTests,
  deleteCachedPrefix,
  getCachedJson,
  setCachedJson,
} from "../src/lib/server/monitor-cache.ts";

test("monitor cache memory fallback returns and expires JSON values", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __clearMonitorMemoryCacheForTests();

  await setCachedJson("monitor:test:key", { ok: true }, 1);
  assert.deepEqual(await getCachedJson("monitor:test:key"), { ok: true });

  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(await getCachedJson("monitor:test:key"), null);
});

test("monitor cache memory fallback deletes prefixes", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __clearMonitorMemoryCacheForTests();

  await setCachedJson("monitor:tenant:analytics:a", 1, 30);
  await setCachedJson("monitor:tenant:users:a", 2, 30);
  await deleteCachedPrefix("monitor:tenant:analytics:");

  assert.equal(await getCachedJson("monitor:tenant:analytics:a"), null);
  assert.equal(await getCachedJson("monitor:tenant:users:a"), 2);
});

test("monitor cache treats Redis failures as cache misses and skipped writes", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  globalThis.fetch = async () => {
    throw new Error("network unavailable");
  };
  console.warn = () => {};

  try {
    assert.equal(await getCachedJson("monitor:test:redis"), null);
    await setCachedJson("monitor:test:redis", { ok: true }, 30);
    await deleteCachedPrefix("monitor:test:");
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }
});

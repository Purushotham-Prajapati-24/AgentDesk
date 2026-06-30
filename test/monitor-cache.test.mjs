import assert from "node:assert/strict";
import { test } from "node:test";
import {
  __clearMonitorMemoryCacheForTests,
  deleteCachedPrefix,
  getCachedJson,
  setCachedJson,
  incrementCacheKey,
} from "../src/lib/server/monitor-cache.ts";

// Helper for safe environment variable restoration
function restoreEnv(originalEnv) {
  for (const [key, val] of Object.entries(originalEnv)) {
    if (val === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }
}

test("monitor cache memory fallback returns and expires JSON values", async () => {
  const originalEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __clearMonitorMemoryCacheForTests();

  try {
    await setCachedJson("monitor:test:key", { ok: true }, 1);
    assert.deepStrictEqual(await getCachedJson("monitor:test:key"), { ok: true });

    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.strictEqual(await getCachedJson("monitor:test:key"), null);
  } finally {
    restoreEnv(originalEnv);
  }
});

test("monitor cache memory fallback deletes prefixes", async () => {
  const originalEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __clearMonitorMemoryCacheForTests();

  try {
    await setCachedJson("monitor:tenant:analytics:a", 1, 30);
    await setCachedJson("monitor:tenant:users:a", 2, 30);
    await deleteCachedPrefix("monitor:tenant:analytics:");

    assert.strictEqual(await getCachedJson("monitor:tenant:analytics:a"), null);
    assert.strictEqual(await getCachedJson("monitor:tenant:users:a"), 2);
  } finally {
    restoreEnv(originalEnv);
  }
});

test("monitor cache treats Redis failures as cache misses and skipped writes", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const originalEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  globalThis.fetch = async () => {
    throw new Error("network unavailable");
  };
  console.warn = () => {};

  try {
    assert.strictEqual(await getCachedJson("monitor:test:redis"), null);
    await setCachedJson("monitor:test:redis", { ok: true }, 30);
    await deleteCachedPrefix("monitor:test:");
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    restoreEnv(originalEnv);
  }
});

test("monitor cache memory fallback increments cache key and respects TTL", async () => {
  const originalEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __clearMonitorMemoryCacheForTests();

  try {
    const key = "rate-limit:test-incr";
    const count1 = await incrementCacheKey(key, 1);
    assert.strictEqual(count1, 1);

    const count2 = await incrementCacheKey(key, 1);
    assert.strictEqual(count2, 2);

    await new Promise((resolve) => setTimeout(resolve, 1100));
    const count3 = await incrementCacheKey(key, 1);
    assert.strictEqual(count3, 1);
  } finally {
    restoreEnv(originalEnv);
  }
});

test("monitor cache treats Redis failure on INCR as fallback to memory", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const originalEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  globalThis.fetch = async () => {
    throw new Error("network unavailable");
  };
  console.warn = () => {};

  __clearMonitorMemoryCacheForTests();

  try {
    const key = "rate-limit:test-incr-redis-fail";
    const count1 = await incrementCacheKey(key, 30);
    assert.strictEqual(count1, 1); // Should fallback to memory and succeed
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    restoreEnv(originalEnv);
  }
});

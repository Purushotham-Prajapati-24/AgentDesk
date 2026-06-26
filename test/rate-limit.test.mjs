import assert from "node:assert/strict";
import { test } from "node:test";
import { isRateLimited, verifyTurnstileToken } from "../src/lib/server/rate-limit.ts";
import { __clearMonitorMemoryCacheForTests } from "../src/lib/server/monitor-cache.ts";

test("isRateLimited permits up to 4 email requests and 5 IP requests in 10 mins", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __clearMonitorMemoryCacheForTests();

  const email = "test@example.com";
  const ip = "1.2.3.4";

  // Request 1, 2, 3, 4 should pass
  assert.deepEqual(await isRateLimited(email, ip), { limited: false });
  assert.deepEqual(await isRateLimited(email, ip), { limited: false });
  assert.deepEqual(await isRateLimited(email, ip), { limited: false });
  assert.deepEqual(await isRateLimited(email, ip), { limited: false });

  // Request 5 should fail on email rate limit
  const res = await isRateLimited(email, ip);
  assert.equal(res.limited, true);
  assert.match(res.reason, /Too many login attempts/);
});

test("isRateLimited fails open on cache errors", async () => {
  const originalFetch = globalThis.fetch;
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  __clearMonitorMemoryCacheForTests();
  globalThis.fetch = async () => {
    throw new Error("redis offline");
  };

  try {
    const res = await isRateLimited("test@example.com", "1.2.3.4");
    assert.deepEqual(res, { limited: false }); // Fails open!
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }
});

test("verifyTurnstileToken consistency and environment checks", async () => {
  // Scenario A: Dev environment with missing keys -> returns true
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  assert.equal(await verifyTurnstileToken("token", "1.2.3.4"), true);

  // Scenario B: Production environment with missing keys -> returns false (fail-closed)
  process.env.NODE_ENV = "production";
  assert.equal(await verifyTurnstileToken("token", "1.2.3.4"), false);

  // Scenario C: Misconfiguration (one key missing) -> returns false (fail-closed)
  process.env.NODE_ENV = "development";
  process.env.TURNSTILE_SECRET_KEY = "secret";
  assert.equal(await verifyTurnstileToken("token", "1.2.3.4"), false);

  process.env.NODE_ENV = originalEnv;
});

test("verifyTurnstileToken verifies token action and returns outcome status", async () => {
  const originalFetch = globalThis.fetch;
  process.env.TURNSTILE_SECRET_KEY = "secret_key";
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site_key";

  // Mock successful response with action "login"
  globalThis.fetch = async () => {
    return {
      json: async () => ({ success: true, action: "login" }),
    };
  };

  try {
    assert.equal(await verifyTurnstileToken("valid_token", "1.2.3.4"), true);

    // Mock response with wrong action
    globalThis.fetch = async () => {
      return {
        json: async () => ({ success: true, action: "register" }),
      };
    };
    assert.equal(await verifyTurnstileToken("valid_token", "1.2.3.4"), false);

    // Mock response with verification failure
    globalThis.fetch = async () => {
      return {
        json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
      };
    };
    assert.equal(await verifyTurnstileToken("invalid_token", "1.2.3.4"), false);

  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  }
});

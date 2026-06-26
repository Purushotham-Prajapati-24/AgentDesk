import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isRateLimited,
  verifyTurnstileToken,
  isCaptchaRequired,
  validateTurnstileConfig,
} from "../src/lib/server/rate-limit.ts";
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

test("isRateLimited blocks after 5 requests from the same IP with different emails", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __clearMonitorMemoryCacheForTests();

  const ip = "1.2.3.4";

  // 5 requests with different emails should pass (IP count: 1 to 5)
  assert.deepEqual(await isRateLimited("e1@example.com", ip), { limited: false });
  assert.deepEqual(await isRateLimited("e2@example.com", ip), { limited: false });
  assert.deepEqual(await isRateLimited("e3@example.com", ip), { limited: false });
  assert.deepEqual(await isRateLimited("e4@example.com", ip), { limited: false });
  assert.deepEqual(await isRateLimited("e5@example.com", ip), { limited: false });

  // 6th request from same IP should fail on IP rate limit
  const res = await isRateLimited("e6@example.com", ip);
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
      ok: true,
      json: async () => ({ success: true, action: "login" }),
    };
  };

  try {
    assert.equal(await verifyTurnstileToken("valid_token", "1.2.3.4"), true);

    // Mock response with wrong action
    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({ success: true, action: "register" }),
      };
    };
    assert.equal(await verifyTurnstileToken("valid_token", "1.2.3.4"), false);

    // Mock response with verification failure
    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
      };
    };
    assert.equal(await verifyTurnstileToken("invalid_token", "1.2.3.4"), false);

    // Mock response with upstream HTTP failure (ok: false)
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 502,
        json: async () => ({ success: true }),
      };
    };
    assert.equal(await verifyTurnstileToken("token", "1.2.3.4"), false);

  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  }
});

test("isCaptchaRequired and validateTurnstileConfig helpers", async () => {
  const originalEnv = process.env.NODE_ENV;
  const origSite = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const origSecret = process.env.TURNSTILE_SECRET_KEY;

  try {
    // Case 1: Dev environment, missing keys
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.equal(isCaptchaRequired(), false);
    assert.deepEqual(validateTurnstileConfig(), { valid: true, siteKeySet: false, secretKeySet: false });

    // Case 2: Dev environment, misconfigured (one missing)
    process.env.TURNSTILE_SECRET_KEY = "secret";
    assert.equal(isCaptchaRequired(), true);
    assert.deepEqual(validateTurnstileConfig(), { valid: false, siteKeySet: false, secretKeySet: true });

    // Case 3: Dev environment, fully configured
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site";
    assert.equal(isCaptchaRequired(), true);
    assert.deepEqual(validateTurnstileConfig(), { valid: true, siteKeySet: true, secretKeySet: true });

    // Case 4: Production environment, missing keys
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.equal(isCaptchaRequired(), true);
    assert.deepEqual(validateTurnstileConfig(), { valid: false, siteKeySet: false, secretKeySet: false });

    // Case 5: Production environment, fully configured
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site";
    process.env.TURNSTILE_SECRET_KEY = "secret";
    assert.equal(isCaptchaRequired(), true);
    assert.deepEqual(validateTurnstileConfig(), { valid: true, siteKeySet: true, secretKeySet: true });

  } finally {
    process.env.NODE_ENV = originalEnv;
    if (origSite) process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = origSite;
    else delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (origSecret) process.env.TURNSTILE_SECRET_KEY = origSecret;
    else delete process.env.TURNSTILE_SECRET_KEY;
  }
});

test("IP validation format checks in rate-limiting and turnstile", async () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  
  // Invalid IP should block/fail immediately in isRateLimited and verifyTurnstileToken
  const invalidIps = ["invalid-ip", "1.2.3.4;DROP TABLE", "rate-limit:ip:123", "2001:db8::1<script>"];
  for (const badIp of invalidIps) {
    const rateLimitRes = await isRateLimited("test@example.com", badIp);
    assert.equal(rateLimitRes.limited, true);
    assert.match(rateLimitRes.reason, /Too many login attempts/);

    const tokenRes = await verifyTurnstileToken("token", badIp);
    assert.equal(tokenRes, false);
  }

  // Valid IPs should pass IP checks
  const validIps = ["1.2.3.4", "2001:0db8:85a3:0000:0000:8a2e:0370:7334", "::1", "127.0.0.1"];
  for (const goodIp of validIps) {
    const rateLimitRes = await isRateLimited("another@example.com", goodIp);
    assert.equal(rateLimitRes.limited, false);
  }

  process.env.NODE_ENV = originalEnv;
});


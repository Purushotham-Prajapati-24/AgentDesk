import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isRateLimited,
  checkIpRateLimit,
  checkEmailRateLimit,
  verifyTurnstileToken,
  isCaptchaRequired,
  validateTurnstileConfig,
  getClientIp,
} from "../src/lib/server/rate-limit.ts";
import { __clearMonitorMemoryCacheForTests } from "../src/lib/server/monitor-cache.ts";

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

test("isRateLimited permits up to 4 email requests and 5 IP requests in 10 mins", async () => {
  const originalEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __clearMonitorMemoryCacheForTests();

  try {
    const email = "test@example.com";
    const ip = "1.2.3.4";

    // Request 1, 2, 3, 4 should pass
    assert.deepStrictEqual(await isRateLimited(email, ip), { limited: false });
    assert.deepStrictEqual(await isRateLimited(email, ip), { limited: false });
    assert.deepStrictEqual(await isRateLimited(email, ip), { limited: false });
    assert.deepStrictEqual(await isRateLimited(email, ip), { limited: false });

    // Request 5 should fail on email rate limit
    const res = await isRateLimited(email, ip);
    assert.strictEqual(res.limited, true);
    assert.match(res.reason, /Too many login attempts/);
  } finally {
    restoreEnv(originalEnv);
  }
});

test("isRateLimited blocks after 5 requests from the same IP with different emails", async () => {
  const originalEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __clearMonitorMemoryCacheForTests();

  try {
    const ip = "1.2.3.4";

    // 5 requests with different emails should pass (IP count: 1 to 5)
    assert.deepStrictEqual(await isRateLimited("e1@example.com", ip), { limited: false });
    assert.deepStrictEqual(await isRateLimited("e2@example.com", ip), { limited: false });
    assert.deepStrictEqual(await isRateLimited("e3@example.com", ip), { limited: false });
    assert.deepStrictEqual(await isRateLimited("e4@example.com", ip), { limited: false });
    assert.deepStrictEqual(await isRateLimited("e5@example.com", ip), { limited: false });

    // 6th request from same IP should fail on IP rate limit
    const res = await isRateLimited("e6@example.com", ip);
    assert.strictEqual(res.limited, true);
    assert.match(res.reason, /Too many login attempts/);
  } finally {
    restoreEnv(originalEnv);
  }
});


test("isRateLimited fails open on cache errors", async () => {
  __clearMonitorMemoryCacheForTests();
  // Pass increment override directly to avoid parallel test execution contamination
  const stubIncrement = async () => {
    throw new Error("cache connection failed");
  };

  const res = await isRateLimited("test@example.com", "1.2.3.4", stubIncrement);
  assert.deepStrictEqual(res, { limited: false }); // Fails open!
});

test("verifyTurnstileToken consistency and environment checks", async () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  };

  try {
    // Scenario A: Dev environment with missing keys -> returns true
    process.env.NODE_ENV = "development";
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    assert.strictEqual(await verifyTurnstileToken("token", "1.2.3.4"), true);

    // Scenario B: Production environment with missing keys -> returns false (fails closed)
    process.env.NODE_ENV = "production";
    assert.strictEqual(await verifyTurnstileToken("token", "1.2.3.4"), false);

    // Scenario C: Misconfiguration (one key missing) -> returns false (fail-closed)
    process.env.NODE_ENV = "development";
    process.env.TURNSTILE_SECRET_KEY = "secret";
    assert.strictEqual(await verifyTurnstileToken("token", "1.2.3.4"), false);
  } finally {
    restoreEnv(originalEnv);
  }
});

test("verifyTurnstileToken verifies token action and returns outcome status", async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  };
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
    assert.strictEqual(await verifyTurnstileToken("valid_token", "1.2.3.4"), true);

    // Mock response with wrong action
    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({ success: true, action: "register" }),
      };
    };
    assert.strictEqual(await verifyTurnstileToken("valid_token", "1.2.3.4"), false);

    // Mock response with verification failure
    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
      };
    };
    assert.strictEqual(await verifyTurnstileToken("invalid_token", "1.2.3.4"), false);

    // Mock response with upstream HTTP failure (ok: false)
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 502,
        json: async () => ({ success: true }),
      };
    };
    assert.strictEqual(await verifyTurnstileToken("token", "1.2.3.4"), false);

  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(originalEnv);
  }
});

test("isCaptchaRequired and validateTurnstileConfig helpers", async () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  };

  try {
    // Case 1: Dev environment, missing keys
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.strictEqual(isCaptchaRequired(), false);
    assert.deepStrictEqual(validateTurnstileConfig(), { valid: true, siteKeySet: false, secretKeySet: false });

    // Case 2: Dev environment, misconfigured (one missing)
    process.env.TURNSTILE_SECRET_KEY = "secret";
    assert.strictEqual(isCaptchaRequired(), true);
    assert.deepStrictEqual(validateTurnstileConfig(), { valid: false, siteKeySet: false, secretKeySet: true });

    // Case 3: Dev environment, fully configured
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site";
    assert.strictEqual(isCaptchaRequired(), true);
    assert.deepStrictEqual(validateTurnstileConfig(), { valid: true, siteKeySet: true, secretKeySet: true });

    // Case 4: Production environment, missing keys (fails closed)
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.strictEqual(isCaptchaRequired(), true);
    assert.deepStrictEqual(validateTurnstileConfig(), { valid: false, siteKeySet: false, secretKeySet: false });

    // Case 5: Production environment, fully configured
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site";
    process.env.TURNSTILE_SECRET_KEY = "secret";
    assert.strictEqual(isCaptchaRequired(), true);
    assert.deepStrictEqual(validateTurnstileConfig(), { valid: true, siteKeySet: true, secretKeySet: true });

  } finally {
    restoreEnv(originalEnv);
  }
});

test("IP validation format checks in rate-limiting and turnstile", async () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  };

  process.env.NODE_ENV = "production";
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site_key";
  process.env.TURNSTILE_SECRET_KEY = "secret_key";
  __clearMonitorMemoryCacheForTests();
  
  try {
    // Invalid IP should block/fail immediately in isRateLimited and verifyTurnstileToken
    const invalidIps = ["invalid-ip", "1.2.3.4;DROP TABLE", "rate-limit:ip:123", "2001:db8::1<script>"];
    for (const badIp of invalidIps) {
      const rateLimitRes = await isRateLimited("test@example.com", badIp);
      assert.strictEqual(rateLimitRes.limited, true);
      assert.match(rateLimitRes.reason, /Too many login attempts/);

      const tokenRes = await verifyTurnstileToken("token", badIp);
      assert.strictEqual(tokenRes, false);
    }

    // Valid IPs should pass IP checks
    const validIps = ["1.2.3.4", "2001:0db8:85a3:0000:0000:8a2e:0370:7334", "::1", "127.0.0.1"];
    for (let i = 0; i < validIps.length; i++) {
      const goodIp = validIps[i];
      // Use a different email for each to prevent hitting the email rate limit
      const rateLimitRes = await isRateLimited(`another${i}@example.com`, goodIp);
      assert.strictEqual(rateLimitRes.limited, false);
    }
  } finally {
    restoreEnv(originalEnv);
  }
});

test("getClientIp returns correct IP from headers and respects configurations", async () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    TRUSTED_PROXY_HEADER: process.env.TRUSTED_PROXY_HEADER,
    TRUST_X_FORWARDED_FOR: process.env.TRUST_X_FORWARDED_FOR,
  };

  try {
    // 1. Dev fallback on missing headers
    process.env.NODE_ENV = "development";
    delete process.env.TRUSTED_PROXY_HEADER;
    delete process.env.TRUST_X_FORWARDED_FOR;
    let headers = new Headers();
    assert.strictEqual(await getClientIp(headers), "127.0.0.1");

    // 2. Production fallback on missing headers
    process.env.NODE_ENV = "production";
    assert.strictEqual(await getClientIp(headers), "unknown-ip");

    // 3. cf-connecting-ip precedence
    headers = new Headers();
    headers.set("cf-connecting-ip", "2.3.4.5");
    headers.set("x-real-ip", "3.4.5.6");
    assert.strictEqual(await getClientIp(headers), "2.3.4.5");

    // 4. x-real-ip fallback if no cf-connecting-ip
    headers = new Headers();
    headers.set("x-real-ip", "3.4.5.6");
    assert.strictEqual(await getClientIp(headers), "3.4.5.6");

    // 5. Custom TRUSTED_PROXY_HEADER configuration
    process.env.TRUSTED_PROXY_HEADER = "x-my-trusted-ip";
    headers = new Headers();
    headers.set("x-my-trusted-ip", "4.5.6.7");
    headers.set("cf-connecting-ip", "2.3.4.5"); // Should be ignored
    assert.strictEqual(await getClientIp(headers), "4.5.6.7");

    // 6. Custom comma-separated TRUSTED_PROXY_HEADER takes rightmost IP
    headers = new Headers();
    headers.set("x-my-trusted-ip", "10.0.0.1, 192.168.1.1, 5.6.7.8");
    assert.strictEqual(await getClientIp(headers), "5.6.7.8");
    delete process.env.TRUSTED_PROXY_HEADER;

    // 7. TRUST_X_FORWARDED_FOR fallback
    process.env.TRUST_X_FORWARDED_FOR = "true";
    headers = new Headers();
    headers.set("x-forwarded-for", "9.9.9.9, 8.8.8.8");
    assert.strictEqual(await getClientIp(headers), "8.8.8.8");

    // 8. TRUST_X_FORWARDED_FOR = false (default) ignores XFF
    delete process.env.TRUST_X_FORWARDED_FOR;
    assert.strictEqual(await getClientIp(headers), "unknown-ip");

    // 9. Invalid IP format in production falls back to unknown-ip
    headers = new Headers();
    headers.set("cf-connecting-ip", "invalid-ip-string");
    assert.strictEqual(await getClientIp(headers), "unknown-ip");

    // 10. Invalid IP format in dev falls back to 127.0.0.1
    process.env.NODE_ENV = "development";
    assert.strictEqual(await getClientIp(headers), "127.0.0.1");

  } finally {
    restoreEnv(originalEnv);
  }
});

test("checkIpRateLimit and checkEmailRateLimit separate functionality", async () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __clearMonitorMemoryCacheForTests();

  try {
    // 1. checkIpRateLimit works independently
    const ipRes1 = await checkIpRateLimit("1.1.1.1");
    assert.deepStrictEqual(ipRes1, { limited: false });

    // 2. checkIpRateLimit rejects unknown-ip in production
    process.env.NODE_ENV = "production";
    const ipResUnknownProd = await checkIpRateLimit("unknown-ip");
    assert.strictEqual(ipResUnknownProd.limited, true);
    assert.match(ipResUnknownProd.reason, /Client IP could not be resolved/);

    // 3. checkIpRateLimit allows unknown-ip in development
    process.env.NODE_ENV = "development";
    const ipResUnknownDev = await checkIpRateLimit("unknown-ip");
    assert.deepStrictEqual(ipResUnknownDev, { limited: false });

    // 4. checkEmailRateLimit works independently and limits
    __clearMonitorMemoryCacheForTests();
    for (let i = 0; i < 4; i++) {
      const emailRes = await checkEmailRateLimit("user@test.com");
      assert.deepStrictEqual(emailRes, { limited: false });
    }
    const emailResBlocked = await checkEmailRateLimit("user@test.com");
    assert.strictEqual(emailResBlocked.limited, true);
  } finally {
    restoreEnv(originalEnv);
  }
});



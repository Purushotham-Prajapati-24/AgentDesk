import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { mapTenantDocument } from "../src/lib/server/auth-tenants.ts";

// 1. Mock headers wrapper
const mockHeadersWrapper = {
  getHeaders: async () => new Headers({ "x-forwarded-for": "1.2.3.4" }),
  getCookies: async () => ({
    delete: () => {},
    set: () => {},
  }),
};
mock.module(new URL("../src/lib/server/headers-wrapper.ts", import.meta.url).href, { namedExports: mockHeadersWrapper });

// 2. Mock Appwrite client
let lastCreatedToken = null;
const mockAppwrite = {
  createAdminClient: async () => ({
    account: {
      createMagicURLToken: async ({ userId, email, url }) => {
        lastCreatedToken = { userId, email, url };
        return lastCreatedToken;
      }
    }
  }),
  createSessionClient: async () => ({})
};
mock.module(new URL("../src/lib/server/appwrite.ts", import.meta.url).href, { namedExports: mockAppwrite });

// Import the real rate limit module for helper checks
import * as rateLimit from "../src/lib/server/rate-limit.ts";

// Dynamically import auth-actions so mock.module takes effect
const { loginWithMagicLink } = await import("../src/app/auth-actions.ts");

test("auth tenant mapper preserves role from account prefs", () => {
  const tenant = mapTenantDocument(
    {
      $id: "tenant_1",
      name: "Acme",
      plan: "pro",
      credits: 42,
    },
    "admin",
  );

  assert.deepEqual(tenant, {
    $id: "tenant_1",
    name: "Acme",
    plan: "pro",
    balance: 42,
    role: "admin",
  });
});

test("loginWithMagicLink: rejects invalid email address format", async () => {
  const badEmails = ["invalid-email", "", "a@b", "test@", "@domain.com", "a".repeat(255) + "@test.com"];
  for (const email of badEmails) {
    const res = await loginWithMagicLink(email);
    assert.deepEqual(res, { success: false, error: "Invalid email address format." });
  }
});

test("loginWithMagicLink: requires Turnstile token in production when site keys are configured", async () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const originalSecretKey = process.env.TURNSTILE_SECRET_KEY;

  try {
    // Enable Turnstile
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site_key";
    process.env.TURNSTILE_SECRET_KEY = "secret_key";

    // Call without token
    const res = await loginWithMagicLink("test@example.com");
    assert.deepEqual(res, { success: false, error: "Security check is missing. Please complete the captcha." });
  } finally {
    process.env.NODE_ENV = originalEnv;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalSiteKey;
    process.env.TURNSTILE_SECRET_KEY = originalSecretKey;
  }
});

test("loginWithMagicLink: fails if Turnstile verification rejects token", async () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const originalSecretKey = process.env.TURNSTILE_SECRET_KEY;
  const originalFetch = globalThis.fetch;

  try {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site_key";
    process.env.TURNSTILE_SECRET_KEY = "secret_key";

    // Mock fetch for Turnstile verification to return success: false
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
    });

    const res = await loginWithMagicLink("test@example.com", "fake_token");
    assert.deepEqual(res, { success: false, error: "Security check failed. Please try again." });
  } finally {
    process.env.NODE_ENV = originalEnv;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalSiteKey;
    process.env.TURNSTILE_SECRET_KEY = originalSecretKey;
    globalThis.fetch = originalFetch;
  }
});

test("loginWithMagicLink: triggers rate-limiting if email or IP threshold is exceeded", async () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const originalSecretKey = process.env.TURNSTILE_SECRET_KEY;

  try {
    // Disable Turnstile in test to focus purely on rate-limiter gate
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;

    // Temporarily set a mock incrementFn to trigger rate limit immediately.
    const { __setIncrementFnForTests } = rateLimit;
    __setIncrementFnForTests(async () => 10); // Exceeds thresholds

    try {
      const res = await loginWithMagicLink("test@example.com");
      assert.equal(res.success, false);
      assert.match(res.error, /Too many login attempts/);
    } finally {
      const { incrementCacheKey } = await import("../src/lib/server/monitor-cache.ts");
      __setIncrementFnForTests(incrementCacheKey);
    }
  } finally {
    process.env.NODE_ENV = originalEnv;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalSiteKey;
    process.env.TURNSTILE_SECRET_KEY = originalSecretKey;
  }
});

test("loginWithMagicLink: successfully dispatches magic link on valid input", async () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const originalSecretKey = process.env.TURNSTILE_SECRET_KEY;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const originalFetch = globalThis.fetch;
  lastCreatedToken = null;

  try {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site_key";
    process.env.TURNSTILE_SECRET_KEY = "secret_key";
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ success: true, action: "login" }),
    });

    const res = await loginWithMagicLink("user@example.com", "valid_token", "/dashboard");
    assert.deepEqual(res, { success: true });
    assert.ok(lastCreatedToken);
    assert.equal(lastCreatedToken.email, "user@example.com");
    assert.match(lastCreatedToken.url, /\/verify\?next=%2Fdashboard/);
  } finally {
    process.env.NODE_ENV = originalEnv;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalSiteKey;
    process.env.TURNSTILE_SECRET_KEY = originalSecretKey;
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    globalThis.fetch = originalFetch;
  }
});

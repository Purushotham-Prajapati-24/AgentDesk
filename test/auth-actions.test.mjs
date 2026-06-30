import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { mapTenantDocument } from "../src/lib/server/auth-tenants.ts";

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

// 1. Mock headers wrapper
const mockHeadersWrapper = {
  getHeaders: async () => new Headers({ "x-forwarded-for": "1.2.3.4" }),
  getCookies: async () => ({
    delete: () => {},
    set: () => {},
  }),
};
mock.module(new URL("../src/lib/server/headers-wrapper.ts", import.meta.url).href, { namedExports: mockHeadersWrapper });

// Mock monitor cache to allow rate limiter testing without production test seam
let mockIncrementValue = 1;
const mockMonitorCache = {
  incrementCacheKey: async () => mockIncrementValue,
  __clearMonitorMemoryCacheForTests: () => {},
};
mock.module(new URL("../src/lib/server/monitor-cache.ts", import.meta.url).href, { namedExports: mockMonitorCache });

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

  assert.deepStrictEqual(tenant, {
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
    assert.deepStrictEqual(res, { success: false, error: "Invalid email address format." });
  }
});

test("loginWithMagicLink: requires Turnstile token in production when site keys are configured", async () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  };

  try {
    // Enable Turnstile
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site_key";
    process.env.TURNSTILE_SECRET_KEY = "secret_key";

    // Call without token
    const res = await loginWithMagicLink("test@example.com");
    assert.deepStrictEqual(res, { success: false, error: "Security check is missing. Please complete the captcha." });
  } finally {
    restoreEnv(originalEnv);
  }
});

test("loginWithMagicLink: fails if Turnstile verification rejects token", async () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  };
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

    const res = await loginWithMagicLink("test@example.com", { captchaToken: "fake_token" });
    assert.deepStrictEqual(res, { success: false, error: "Security check failed. Please try again." });
  } finally {
    restoreEnv(originalEnv);
    globalThis.fetch = originalFetch;
  }
});

test("loginWithMagicLink: triggers rate-limiting if email or IP threshold is exceeded", async () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  };

  try {
    // Disable Turnstile in test to focus purely on rate-limiter gate
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;

    // Set mock increment value to trigger limit immediately
    mockIncrementValue = 10;

    const res = await loginWithMagicLink("test@example.com");
    assert.strictEqual(res.success, false);
    assert.match(res.error, /Too many login attempts/);
  } finally {
    mockIncrementValue = 1;
    restoreEnv(originalEnv);
  }
});

test("loginWithMagicLink: successfully dispatches magic link on valid input", async () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
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

    const res = await loginWithMagicLink("user@example.com", { captchaToken: "valid_token", nextPath: "/dashboard" });
    assert.deepStrictEqual(res, { success: true });
    assert.ok(lastCreatedToken);
    assert.strictEqual(lastCreatedToken.email, "user@example.com");
    assert.match(lastCreatedToken.url, /\/verify\?next=%2Fdashboard/);
  } finally {
    restoreEnv(originalEnv);
    globalThis.fetch = originalFetch;
  }
});

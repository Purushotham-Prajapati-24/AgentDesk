import assert from "node:assert/strict";
import { test } from "node:test";

const authRedirect = await import("../src/lib/auth-redirect.ts");

test("DEFAULT_AUTHENTICATED_DESTINATION is /bots", () => {
  assert.equal(authRedirect.DEFAULT_AUTHENTICATED_DESTINATION, "/bots");
});

test("DEFAULT_LOGIN_PATH is /login", () => {
  assert.equal(authRedirect.DEFAULT_LOGIN_PATH, "/login");
});

test("MAX_NEXT_PATH_LENGTH is a positive cap", () => {
  assert.ok(authRedirect.MAX_NEXT_PATH_LENGTH > 0);
  assert.ok(authRedirect.MAX_NEXT_PATH_LENGTH <= 4096);
});

test("sanitizeNextPath accepts valid root-relative paths", () => {
  assert.equal(authRedirect.sanitizeNextPath("/bots"), "/bots");
  assert.equal(authRedirect.sanitizeNextPath("/inbox/123"), "/inbox/123");
  assert.equal(authRedirect.sanitizeNextPath("/bots?tab=active"), "/bots?tab=active");
  assert.equal(authRedirect.sanitizeNextPath("/bots#section"), "/bots#section");
  assert.equal(authRedirect.sanitizeNextPath("/"), "/");
  assert.equal(authRedirect.sanitizeNextPath("/path/with-dashes_and.dots"), "/path/with-dashes_and.dots");
});

test("sanitizeNextPath trims surrounding whitespace", () => {
  assert.equal(authRedirect.sanitizeNextPath("  /bots  "), "/bots");
  assert.equal(authRedirect.sanitizeNextPath("\t/bots\n"), "/bots");
});

test("sanitizeNextPath rejects nullish and empty", () => {
  assert.equal(authRedirect.sanitizeNextPath(null), null);
  assert.equal(authRedirect.sanitizeNextPath(undefined), null);
  assert.equal(authRedirect.sanitizeNextPath(""), null);
  assert.equal(authRedirect.sanitizeNextPath("   "), null);
  assert.equal(authRedirect.sanitizeNextPath("\t\n"), null);
});

test("sanitizeNextPath rejects full URLs and protocol-relative bypasses", () => {
  assert.equal(authRedirect.sanitizeNextPath("https://evil.com"), null);
  assert.equal(authRedirect.sanitizeNextPath("http://evil.com/login"), null);
  assert.equal(authRedirect.sanitizeNextPath("//evil.com"), null);
  assert.equal(authRedirect.sanitizeNextPath("//evil.com/login"), null);
  assert.equal(authRedirect.sanitizeNextPath("javascript:alert(1)"), null);
  assert.equal(authRedirect.sanitizeNextPath("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(authRedirect.sanitizeNextPath("vbscript:msgbox(1)"), null);
  assert.equal(authRedirect.sanitizeNextPath("file:///etc/passwd"), null);
});

test("sanitizeNextPath rejects backslashes (browser normalization bypass)", () => {
  assert.equal(authRedirect.sanitizeNextPath("/\\evil.com"), null);
  assert.equal(authRedirect.sanitizeNextPath("\\\\evil.com"), null);
  assert.equal(authRedirect.sanitizeNextPath("/path\\backslash"), null);
  assert.equal(authRedirect.sanitizeNextPath("/\\\\evil.com"), null);
});

test("sanitizeNextPath rejects all C0 control characters and DEL", () => {
  // Common header-splitting / log-injection vectors.
  assert.equal(authRedirect.sanitizeNextPath("/path\nnewline"), null);
  assert.equal(authRedirect.sanitizeNextPath("/path\rreturn"), null);
  assert.equal(authRedirect.sanitizeNextPath("/path\ttab"), null);
  assert.equal(authRedirect.sanitizeNextPath("/path\0null"), null);
  assert.equal(authRedirect.sanitizeNextPath("/path\vvertical"), null);
  assert.equal(authRedirect.sanitizeNextPath("/path\fformfeed"), null);
  // ESC (terminal-escape injection) and DEL.
  assert.equal(authRedirect.sanitizeNextPath("/path\x1Besc"), null);
  assert.equal(authRedirect.sanitizeNextPath("/path\x7Fdel"), null);
  // Other C0 chars that have no business in a URL.
  assert.equal(authRedirect.sanitizeNextPath("/path\x01soh"), null);
  assert.equal(authRedirect.sanitizeNextPath("/path\x08bs"), null);
  assert.equal(authRedirect.sanitizeNextPath("/path\x1Fus"), null);
});

test("sanitizeNextPath rejects paths that don't start with /", () => {
  assert.equal(authRedirect.sanitizeNextPath("bots"), null);
  assert.equal(authRedirect.sanitizeNextPath("./bots"), null);
  assert.equal(authRedirect.sanitizeNextPath("../bots"), null);
  assert.equal(authRedirect.sanitizeNextPath("?next=/bots"), null);
});

test("sanitizeNextPath enforces MAX_NEXT_PATH_LENGTH", () => {
  const tooLong = "/" + "a".repeat(authRedirect.MAX_NEXT_PATH_LENGTH);
  assert.equal(authRedirect.sanitizeNextPath(tooLong), null);
  const atCap = "/" + "a".repeat(authRedirect.MAX_NEXT_PATH_LENGTH - 1);
  assert.equal(authRedirect.sanitizeNextPath(atCap), atCap);
});

test("buildLoginHref appends sanitized next param", () => {
  assert.equal(authRedirect.buildLoginHref("/bots"), "/login?next=%2Fbots");
  assert.equal(authRedirect.buildLoginHref("/inbox/123"), "/login?next=%2Finbox%2F123");
  assert.equal(
    authRedirect.buildLoginHref("/bots?tab=active"),
    "/login?next=%2Fbots%3Ftab%3Dactive",
  );
});

test("buildLoginHref falls back to /login on invalid input", () => {
  assert.equal(authRedirect.buildLoginHref(""), "/login");
  assert.equal(authRedirect.buildLoginHref("https://evil.com"), "/login");
  assert.equal(authRedirect.buildLoginHref("//evil.com"), "/login");
  assert.equal(authRedirect.buildLoginHref("/\\evil"), "/login");
});

test("escapeHtml escapes all HTML-special characters", () => {
  assert.equal(authRedirect.escapeHtml("<script>"), "&lt;script&gt;");
  assert.equal(authRedirect.escapeHtml('"hello"'), "&quot;hello&quot;");
  assert.equal(authRedirect.escapeHtml("'hello'"), "&#39;hello&#39;");
  assert.equal(authRedirect.escapeHtml("`hello`"), "&#96;hello&#96;");
  assert.equal(authRedirect.escapeHtml("a & b"), "a &amp; b");
  assert.equal(
    authRedirect.escapeHtml('<a href="x">y</a>'),
    "&lt;a href=&quot;x&quot;&gt;y&lt;/a&gt;",
  );
});

test("escapeHtml is a no-op for safe strings", () => {
  assert.equal(authRedirect.escapeHtml("plain-text"), "plain-text");
  assert.equal(authRedirect.escapeHtml("path/to/something"), "path/to/something");
  assert.equal(authRedirect.escapeHtml("user_123@example.com"), "user_123@example.com");
});

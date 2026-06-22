/**
 * Shared utilities for the post-login redirect flow.
 *
 * Every `?next=` boundary in the auth flow (login page, verify route,
 * magic-link server action, AuthAwareCta) uses these helpers so a single
 * security fix lands in one place.
 *
 * The same-origin guard is intentionally strict:
 *   - must start with "/" (root-relative)
 *   - must not start with "//" (protocol-relative, e.g. //evil.com)
 *   - must not contain backslashes (some browsers normalize "\\" to "//")
 *   - must not contain control characters (header-splitting, log injection)
 *   - length capped at MAX_NEXT_PATH_LENGTH to prevent DoS via huge params
 *
 * Anything else is rejected and the caller is expected to fall back to
 * the default destination.
 */

/** Default workspace landing page after a successful magic-link verify. */
export const DEFAULT_AUTHENTICATED_DESTINATION = "/bots";

/** Path of the magic-link login form. */
export const DEFAULT_LOGIN_PATH = "/login";

/**
 * Hard cap on the post-login `next` parameter length. Paths longer than
 * this are rejected outright so an attacker cannot pin a giant string
 * in the URL bar, the server logs, or the referer header.
 */
export const MAX_NEXT_PATH_LENGTH = 512;

/**
 * Validate and normalize a post-login redirect target.
 *
 * Returns a safe root-relative path or `null` if the input is unsafe.
 * Callers should always handle the `null` case (typically by falling
 * back to `DEFAULT_AUTHENTICATED_DESTINATION`).
 */
export function sanitizeNextPath(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value.length > MAX_NEXT_PATH_LENGTH) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Reject backslashes — some browsers normalize "\\" to "//", which would
  // turn a path like "\\evil.com" into a protocol-relative open-redirect.
  if (trimmed.includes("\\")) {
    return null;
  }

  // Must start with "/" and not be a protocol-relative "//host" URL.
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  // Reject embedded control characters (header-splitting, log injection,
  // terminal-escape injection). Anything in \x00-\x1F plus DEL \x7F can
  // misbehave in downstream consumers (Location header, hidden form
  // input, log aggregation, terminal viewers), so deny them all.
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Build a /login URL that carries the sanitized `next` round-trip param.
 *
 * If `nextPath` is invalid, returns the bare DEFAULT_LOGIN_PATH.
 */
export function buildLoginHref(nextPath: string): string {
  const safeNext = sanitizeNextPath(nextPath);
  if (!safeNext) {
    return DEFAULT_LOGIN_PATH;
  }
  return `${DEFAULT_LOGIN_PATH}?next=${encodeURIComponent(safeNext)}`;
}

/**
 * Escape a string for safe interpolation inside an HTML attribute value
 * (or text node). Defends against XSS by neutralizing every character
 * that can break out of an attribute or introduce a tag.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("'", "&#39;")
    .replaceAll("`", "&#96;");
}

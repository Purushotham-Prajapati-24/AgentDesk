"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/auth-actions";
import {
  buildLoginHref,
  DEFAULT_AUTHENTICATED_DESTINATION,
  DEFAULT_LOGIN_PATH,
  sanitizeNextPath,
} from "@/lib/auth-redirect";

const VISUAL_AUDIT_ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_VISUAL_AUDIT_MODE === "true";

type AuthAwareCtaProps = {
  /** Where to send authenticated users. Must be a same-origin path. */
  authenticatedHref?: string;
  /**
   * Where to send unauthenticated users. Defaults to /login.
   *
   * When you supply a custom `loginHref`, you opt out of the automatic
   * `?next=` round-trip — you are responsible for preserving the
   * destination yourself (e.g. by appending `&next=…` to the URL).
   */
  loginHref?: string;
  /** Optional aria-label for screen readers. */
  ariaLabel?: string;
  /** Visual className applied to the rendered button. */
  className?: string;
  /** Optional className override while the click is in flight. */
  busyClassName?: string;
  /** Inline style applied to the rendered button. */
  style?: CSSProperties;
  /** Optional busy-state inline style override. */
  busyStyle?: CSSProperties;
  children: ReactNode;
};

/**
 * AuthAwareCta — a CTA that gates navigation on a live session check.
 *
 * Renders a real <a> tag (progressive enhancement) so search engines
 * and no-JS users can follow the link. JS users get the auth check on
 * click via onClick hijacking:
 *   - getCurrentUser() returns { success: true }   → router.push(safeDest)
 *   - getCurrentUser() returns { success: false }  → router.push(fallbackHref)
 *   - getCurrentUser() throws / network error       → router.push(fallbackHref)
 *   - VISUAL_AUDIT mode is enabled (dev only)       → straight to safeDest
 *
 * The `href` is the no-JS / crawler fallback. It is always a real
 * same-origin path produced by `buildLoginHref` (or the consumer's
 * custom `loginHref`), so search engines can crawl it and the user
 * always lands somewhere sane if JS is off.
 *
 * Concurrency:
 *   - `inFlightRef` is a synchronous guard so a fast double-click cannot
 *     fire two `getCurrentUser()` calls before React commits the busy
 *     state to the DOM.
 *   - `isMountedRef` prevents state updates after unmount-during-fetch.
 */
export function AuthAwareCta({
  authenticatedHref = DEFAULT_AUTHENTICATED_DESTINATION,
  loginHref,
  ariaLabel,
  className,
  busyClassName,
  style,
  busyStyle,
  children,
}: AuthAwareCtaProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const inFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  // useMemo stabilizes the value so the useCallback below doesn't get
  // rebuilt on every render. The function is cheap, but the callback
  // reference matters for downstream effects that depend on it.
  const safeDest = useMemo(
    () => sanitizeNextPath(authenticatedHref) ?? DEFAULT_AUTHENTICATED_DESTINATION,
    [authenticatedHref],
  );

  // The href the <a> renders with. Search engines and no-JS users
  // follow this directly. For JS users, onClick hijacks the click and
  // routes through the auth check before this URL is ever used.
  const fallbackHref = useMemo(
    () => loginHref ?? buildLoginHref(safeDest),
    [loginHref, safeDest],
  );

  const handleClick = useCallback(
    async (event: MouseEvent<HTMLAnchorElement>) => {
      // Prevent the default <a> navigation; we'll either push via the
      // router (auth result) or let the browser fall back to the href
      // (JS disabled or this handler throws before any navigation).
      event.preventDefault();
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      setBusy(true);

      try {
        if (VISUAL_AUDIT_ENABLED) {
          router.push(safeDest);
          return;
        }

        const result = await getCurrentUser();
        if (!isMountedRef.current) {
          return;
        }

        if (result.success) {
          router.push(safeDest);
        } else {
          router.push(sanitizeNextPath(fallbackHref) ?? DEFAULT_LOGIN_PATH);
        }
      } catch {
        // Network blip or unexpected throw — fall back to the href
        // navigation so the user is never stuck on a dead link.
        // Never expose the error.
        if (!isMountedRef.current) {
          return;
        }
        router.push(sanitizeNextPath(fallbackHref) ?? DEFAULT_LOGIN_PATH);
      } finally {
        inFlightRef.current = false;
        if (isMountedRef.current) {
          setBusy(false);
        }
      }
    },
    [fallbackHref, router, safeDest],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const composedClassName = busy && busyClassName ? busyClassName : className;
  const composedStyle = busy && busyStyle ? busyStyle : style;

  // Tailwind v4 preflight does NOT reset `text-decoration` on <a>.
  // Bake the reset into our base output so the visual style stays
  // consistent regardless of which className the consumer passes.
  const finalClassName = composedClassName
    ? `no-underline ${composedClassName}`
    : "no-underline";

  return (
    <a
      aria-busy={busy}
      aria-disabled={busy || undefined}
      aria-label={ariaLabel}
      className={finalClassName}
      href={fallbackHref}
      onClick={handleClick}
      style={composedStyle}
    >
      {children}
    </a>
  );
}

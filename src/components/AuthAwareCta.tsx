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
 * Replaces a hardcoded `<Link href="/login">` so that authenticated users
 * land on the workspace and unauthenticated users land on the login page
 * with a `?next=` round-trip back to their original destination.
 *
 * Failure-mode policy:
 *   - getCurrentUser() returns `{ success: false }`   → /login?next=<dest>
 *   - getCurrentUser() throws / network error         → /login?next=<dest>
 *   - VISUAL_AUDIT mode is enabled (dev only)        → straight to /bots
 *
 * Concurrency:
 *   - `inFlightRef` is a synchronous guard so a fast double-click cannot
 *     fire two `getCurrentUser()` calls before React commits the
 *     `disabled` state to the DOM.
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

  const handleClick = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
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
          const fallbackHref = loginHref ?? buildLoginHref(safeDest);
          router.push(sanitizeNextPath(fallbackHref) ?? DEFAULT_LOGIN_PATH);
        }
      } catch {
        // Network blip or unexpected throw — fail open to login so the
        // user is never stuck on a dead button. Never expose the error.
        if (!isMountedRef.current) {
          return;
        }
        const fallbackHref = loginHref ?? buildLoginHref(safeDest);
        router.push(sanitizeNextPath(fallbackHref) ?? DEFAULT_LOGIN_PATH);
      } finally {
        inFlightRef.current = false;
        if (isMountedRef.current) {
          setBusy(false);
        }
      }
    },
    [loginHref, router, safeDest],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const composedClassName = busy && busyClassName ? busyClassName : className;
  const composedStyle = busy && busyStyle ? busyStyle : style;

  return (
    <button
      aria-busy={busy}
      aria-label={ariaLabel}
      className={composedClassName}
      disabled={busy}
      onClick={handleClick}
      style={composedStyle}
      type="button"
    >
      {children}
    </button>
  );
}

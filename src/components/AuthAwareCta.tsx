"use client";

import React, { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/auth-actions";

const DEFAULT_AUTHENTICATED_DESTINATION = "/bots";
const DEFAULT_LOGIN_PATH = "/login";

/**
 * Validates a post-login redirect target.
 *
 * Only same-origin, protocol-relative, or root-relative paths are accepted.
 * Anything else (full URLs, javascript:, data:, etc.) is rejected so an
 * attacker can't use the login redirect as an open-redirect vector.
 */
function sanitizeNextPath(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Must start with "/" and not be a protocol-relative "//host" URL.
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  // Reject embedded newlines / control characters (header-splitting guard).
  if (/[\r\n\t\0]/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function buildLoginHref(nextPath: string): string {
  const safeNext = sanitizeNextPath(nextPath);
  if (!safeNext) {
    return DEFAULT_LOGIN_PATH;
  }
  return `${DEFAULT_LOGIN_PATH}?next=${encodeURIComponent(safeNext)}`;
}

const VISUAL_AUDIT_ENABLED =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_VISUAL_AUDIT_MODE === "true";

type AuthAwareCtaProps = {
  /** Where to send authenticated users. Must be a same-origin path. */
  authenticatedHref?: string;
  /** Where to send unauthenticated users. Defaults to /login. */
  loginHref?: string;
  /** Optional aria-label for screen readers. */
  ariaLabel?: string;
  /** Visual className applied to the rendered button. */
  className?: string;
  /** Optional className override while the click is in flight. */
  busyClassName?: string;
  /** Inline style applied to the rendered button. */
  style?: React.CSSProperties;
  /** Optional busy-state inline style override. */
  busyStyle?: React.CSSProperties;
  children: React.ReactNode;
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
 * In-flight clicks are blocked (disabled + spinner state) and an isActive
 * ref guards against unmount-during-fetch races.
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
  const isMountedRef = useRef(true);

  const safeDest = sanitizeNextPath(authenticatedHref) ?? DEFAULT_AUTHENTICATED_DESTINATION;

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (busy) {
        return;
      }

      isMountedRef.current = true;
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
        if (isMountedRef.current) {
          setBusy(false);
        }
      }
    },
    [busy, loginHref, router, safeDest],
  );

  React.useEffect(() => {
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
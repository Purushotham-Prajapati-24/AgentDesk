'use client'

import { useEffect } from "react";
import Link from "next/link";

export default function BlogPostError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Blog post render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--ui-text)]">
        Failed to load post
      </h1>
      <p className="mt-3 max-w-md text-[var(--ui-muted)]">
        Something went wrong while rendering this blog post. This might be a
        temporary issue.
      </p>
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => unstable_retry()}
          className="inline-flex h-10 items-center justify-center rounded-full bg-[#0099ff] px-5 text-sm font-semibold text-[#041018] transition hover:bg-[#0099ff]/90"
        >
          Try again
        </button>
        <Link
          href="/blog"
          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--ui-border)] px-5 text-sm font-semibold text-[var(--ui-text)] transition hover:bg-[var(--ui-panel)]"
        >
          Back to blog
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-4 text-xs text-[var(--ui-muted)]">
          Error ID: {error.digest}
        </p>
      ) : null}
    </div>
  );
}

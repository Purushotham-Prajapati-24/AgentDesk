import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE_NAME } from "@/lib/site";
import { blogPosts } from "@/lib/content";

/**
 * /blog — index of all published posts.
 *
 * Server Component. Lists every post from the content manifest with title,
 * excerpt, reading time, and category. Each card links to its /blog/{slug}.
 */
export default function BlogIndexPage() {
  return (
    <div className="cockpit-lane flex min-h-screen min-w-0 flex-col bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#0099ff] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#041018]"
        href="#content"
      >
        Skip to Content
      </a>

      <header className="sticky top-0 z-50 border-b border-[var(--ui-border)] bg-[var(--ui-bg)]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-transparent px-2 text-sm font-semibold text-[var(--ui-muted)] transition hover:border-[var(--ui-border)] hover:bg-[var(--ui-panel)] hover:text-[var(--ui-text)]"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {SITE_NAME}
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="hidden min-h-10 items-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 text-sm font-semibold text-[var(--ui-muted)] transition hover:border-[#0099ff]/60 hover:text-[var(--ui-text)] sm:inline-flex"
              href="/ai-support-agent"
            >
              AI Support Agent
            </Link>
            <ThemeToggle variant="cockpit" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6" id="content">
        <p className="studio-kicker text-[#0099ff]">Blog</p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--ui-text)] sm:text-5xl">
          AI Support Agent Insights
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-medium leading-7 text-[var(--ui-muted)]">
          Deep dives on RAG chatbots, AI customer support, human handoff, and the
          tools shaping support automation in 2026.
        </p>

        <div className="mt-10 grid gap-4">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-6 transition hover:border-[#0099ff]/60 hover:bg-[var(--ui-panel-2)]"
            >
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[var(--ui-muted)]">
                <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-2.5 py-0.5 font-semibold text-[#0099ff]">
                  {post.category}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                  {post.readingTime}
                </span>
                <span>Updated {post.datePublished}</span>
              </div>
              <h2 className="mt-3 flex items-start gap-1.5 text-xl font-semibold tracking-[-0.01em] text-[var(--ui-text)]">
                {post.title}
                <ArrowRight
                  aria-hidden="true"
                  className="mt-1 h-4 w-4 shrink-0 text-[var(--ui-muted)] transition group-hover:translate-x-0.5 group-hover:text-[#0099ff]"
                />
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                {post.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="mt-auto border-t border-[var(--ui-border)] bg-[var(--ui-bg)] py-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-5 text-center text-xs font-medium text-[var(--ui-muted)] sm:flex-row">
          <p>© 2026 {SITE_NAME}. AI support agent with verified answers and human handoff.</p>
          <div className="flex gap-4">
            <Link className="transition hover:text-[var(--ui-text)]" href="/ai-support-agent">
              AI Support Agent
            </Link>
            <Link className="transition hover:text-[var(--ui-text)]" href="/docs">
              Docs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE_NAME } from "@/lib/site";
import { howToSchema } from "@/lib/seo/jsonld";

/**
 * Shared layout for all Phase 2 content pages (pillar, spoke, comparison,
 * feature). Server Component — content children are rendered inline so they
 * land in the initial HTML for crawlers + AI engines.
 *
 * Every page wraps its body in <ContentLayout> and gets:
 *  - a crawlable header (breadcrumb, H1, subtitle, last-updated)
 *  - a "Last updated" timestamp (GEO checklist)
 *  - an author byline (E-E-A-T)
 *  - a consistent footer with internal links
 */
export function ContentLayout({
  title,
  subtitle,
  eyebrow,
  lastUpdated,
  author = "AgentDesk Team",
  readingTime,
  breadcrumb,
  children,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  lastUpdated: string;
  author?: string;
  readingTime?: string;
  breadcrumb?: Array<{ label: string; href: string }>;
  children: React.ReactNode;
}) {
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
              href="/docs"
            >
              Docs
            </Link>
            <ThemeToggle variant="cockpit" />
          </div>
        </div>
      </header>

      <article className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12" id="content">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--ui-muted)]">
            {breadcrumb.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-2">
                <Link className="transition hover:text-[var(--ui-text)]" href={crumb.href}>
                  {crumb.label}
                </Link>
                {index < breadcrumb.length - 1 ? <span aria-hidden="true">/</span> : null}
              </span>
            ))}
          </nav>
        ) : null}

        <header className="mb-8 border-b border-[var(--ui-border)] pb-8">
          {eyebrow ? (
            <p className="studio-kicker mb-3 text-[#0099ff]">{eyebrow}</p>
          ) : null}
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--ui-text)] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg font-medium leading-7 text-[var(--ui-muted)]">
            {subtitle}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium text-[var(--ui-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-r from-[#1456f0] to-[#0099ff] text-[10px] font-bold text-white"
              >
                A
              </span>
              By {author}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden="true" className="h-3.5 w-3.5" />
              Updated {lastUpdated}
            </span>
            {readingTime ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                {readingTime}
              </span>
            ) : null}
          </div>
        </header>

        <div className="content-body space-y-6 text-base leading-7 text-[var(--ui-text)]">{children}</div>
      </article>

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

/** TL;DR / summary callout — placed at the top of every page (GEO: first 100 words). */
export function Tldr({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#0099ff]/25 bg-[#0099ff]/8 p-5">
      <p className="studio-kicker mb-2 text-[#0099ff]">TL;DR</p>
      <div className="text-sm font-medium leading-6 text-[var(--ui-text)]">{children}</div>
    </div>
  );
}

/** Section heading inside content body. */
export function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 pt-4 text-2xl font-semibold tracking-[-0.02em] text-[var(--ui-text)] sm:text-3xl"
    >
      {children}
    </h2>
  );
}

/** Callout box for definitions / notes. */
export function Callout({
  title,
  children,
  variant = "info",
}: {
  title?: string;
  children: React.ReactNode;
  variant?: "info" | "success" | "warning";
}) {
  const variants = {
    info: "border-[#0099ff]/25 bg-[#0099ff]/8 text-[#0099ff]",
    success: "border-[#22c55e]/25 bg-[#22c55e]/8 text-[#22c55e]",
    warning: "border-[#f59e0b]/25 bg-[#f59e0b]/8 text-[#f59e0b]",
  };
  return (
    <div className={`rounded-2xl border p-5 ${variants[variant]}`}>
      {title ? <p className="studio-kicker mb-2">{title}</p> : null}
      <div className="text-sm font-medium leading-6 text-[var(--ui-text)]">{children}</div>
    </div>
  );
}

/** Comparison table primitive. */
export function ComparisonTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--ui-border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--ui-panel-2)]">
            {columns.map((col, i) => (
              <th
                key={i}
                className="border-b border-[var(--ui-border)] px-4 py-3 text-left font-semibold text-[var(--ui-text)]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? "bg-[var(--ui-panel)]" : ""}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border-b border-[var(--ui-border)] px-4 py-3 font-medium text-[var(--ui-muted)]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * RelatedGuides — the "keep reading" grid at the foot of every doc / content
 * page (work item 2.11). Renders internal links as cards, feeding the
 * internal-linking requirement (≥3 inbound per spoke) without a separate
 * component file.
 */
export function RelatedGuides({
  links,
  title = "Related guides",
}: {
  links: Array<{ title: string; href: string; description: string }>;
  title?: string;
}) {
  return (
    <nav aria-label={title} className="pt-4">
      <h2 className="mb-4 text-2xl font-semibold tracking-[-0.02em] text-[var(--ui-text)] sm:text-3xl">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-start gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 transition hover:border-[#0099ff]/60 hover:bg-[var(--ui-panel-2)]"
          >
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ui-text)]">
                {link.title}
                <ArrowRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-[var(--ui-muted)] transition group-hover:translate-x-0.5 group-hover:text-[#0099ff]"
                />
              </h3>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                {link.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </nav>
  );
}

/**
 * AuthorBio — author credentials block for E-E-A-T. Sits near the end of an
 * article so Google's quality raters and AI engines can attribute expertise.
 */
export function AuthorBio({
  name = "AgentDesk Team",
  role = "AgentDesk Engineering",
  bio,
}: {
  name?: string;
  role?: string;
  bio?: string;
}) {
  return (
    <aside className="flex gap-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <span
        aria-hidden="true"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#1456f0] to-[#0099ff] text-base font-bold text-white"
      >
        {name.charAt(0)}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--ui-text)]">{name}</p>
        <p className="text-xs font-medium text-[#0099ff]">{role}</p>
        {bio ? (
          <p className="mt-2 text-sm font-medium leading-6 text-[var(--ui-muted)]">
            {bio}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

/**
 * HowToSteps — renders an ordered, numbered step list for how-to pages and
 * emits matching HowTo JSON-LD so the steps are eligible for rich results.
 * The same `steps` array feeds both the visible UI and the structured data.
 *
 * (work item 2.9 — HowTo schema on how-to pages)
 */
export function HowToSteps({
  steps,
  path,
}: {
  steps: Array<{ name: string; text: string }>;
  path: string;
}) {
  return (
    <section id="steps" className="scroll-mt-24 pt-4">
      <div className="grid gap-3">
        {steps.map((step, index) => (
          <div
            key={step.name}
            className="flex gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#1456f0] to-[#0099ff] font-mono text-xs font-semibold text-white">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--ui-text)]">
                {step.name}
              </h3>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                {step.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Matching HowTo structured data — kept in lockstep with the visible
          steps so rich results never drift from page content. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            howToSchema({
              name: steps.map((s) => s.name).join(", "),
              description: "Step-by-step instructions.",
              path,
              steps,
            }),
          ),
        }}
      />
    </section>
  );
}

import type { MDXComponents } from "mdx/types";
import Link from "next/link";

/**
 * mdx-components.tsx — REQUIRED by @next/mdx for App Router.
 *
 * Maps native HTML elements emitted by the markdown compiler to styled
 * equivalents that match AgentDesk's design system (CSS variables + the
 * same Tailwind classes used in hand-written content pages). Every MDX
 * file rendered in the app inherits these mappings automatically.
 *
 * Styled to match the `.content-body` typography in ContentLayout.
 * Spec: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/mdx-components.md
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Headings — match the SectionHeading typography from ContentLayout.
    h1: ({ children }) => (
      <h1 className="scroll-mt-24 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--ui-text)] sm:text-5xl">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="scroll-mt-24 pt-6 text-2xl font-semibold tracking-[-0.02em] text-[var(--ui-text)] sm:text-3xl">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="scroll-mt-24 pt-4 text-xl font-semibold tracking-[-0.01em] text-[var(--ui-text)]">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="scroll-mt-24 pt-3 text-lg font-semibold text-[var(--ui-text)]">
        {children}
      </h4>
    ),
    // Paragraphs — base body text.
    p: ({ children }) => (
      <p className="text-base leading-7 text-[var(--ui-text)]">{children}</p>
    ),

    // Links — use next/link for internal navigation, accent color.
    a: ({ href, children }) => {
      const isInternal = href?.startsWith("/") || href?.startsWith("#");
      if (isInternal && href) {
        return (
          <Link
            href={href}
            className="font-medium text-[#0099ff] underline-offset-2 hover:underline"
          >
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          rel="noopener noreferrer"
          className="font-medium text-[#0099ff] underline-offset-2 hover:underline"
        >
          {children}
        </a>
      );
    },

    // Lists — match content spacing.
    ul: ({ children }) => (
      <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-[var(--ui-text)]">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal space-y-2 pl-6 text-base leading-7 text-[var(--ui-text)]">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-1">{children}</li>,

    // Emphasis.
    strong: ({ children }) => (
      <strong className="font-semibold text-[var(--ui-text)]">{children}</strong>
    ),
    em: ({ children }) => <em className="italic text-[var(--ui-muted)]">{children}</em>,

    // Blockquotes — render as the existing Callout "info" look.
    blockquote: ({ children }) => (
      <blockquote className="rounded-2xl border border-[#0099ff]/25 bg-[#0099ff]/8 p-5 text-sm font-medium leading-6 text-[var(--ui-text)] [&>p]:p-0">
        {children}
      </blockquote>
    ),

    // Inline code — monospace accent.
    code: ({ children }) => (
      <code className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-1.5 py-0.5 font-mono text-[0.85em] text-[#8bd8ff]">
        {children}
      </code>
    ),

    // Code blocks (fenced) — match the DocCodeBlock visual treatment.
    pre: ({ children }) => (
      <pre className="overflow-x-auto rounded-2xl border border-[var(--ui-border)] bg-[#07090b] p-4 font-mono text-xs leading-5 text-[#d6e4ef]">
        {children}
      </pre>
    ),

    // Tables — match the ComparisonTable styling.
    table: ({ children }) => (
      <div className="overflow-x-auto rounded-2xl border border-[var(--ui-border)]">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className="border-b border-[var(--ui-border)] last:border-0 [&:nth-child(even)]:bg-[var(--ui-panel)]">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-4 py-3 text-left font-semibold text-[var(--ui-text)]">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 font-medium text-[var(--ui-muted)]">{children}</td>
    ),

    // Horizontal rule — subtle divider.
    hr: () => <hr className="border-t border-[var(--ui-border)]" />,

    // Allow callers to override anything (merge semantics).
    ...components,
  };
}

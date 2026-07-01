import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileUp, BookOpen, Code2, MessageSquare, ShieldCheck, Upload, Zap } from "lucide-react";
import {
  Callout,
  ComparisonTable,
  ContentLayout,
  RelatedGuides,
  SectionHeading,
  Tldr,
} from "@/components/content/ContentLayout";
import { FaqSection } from "@/components/content/FaqSection";
import { SITE_PUBLISH_DATE } from "@/lib/site";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "DocsBot Alternative — Why Teams Switch to AgentDesk",
  description:
    "Compare DocsBot vs AgentDesk head-to-head: RAG quality, human handoff, native inbox, tenant isolation, pricing, and open-source. See why teams migrate from DocsBot to AgentDesk.",
  alternates: { canonical: "/alternatives/docsbot" },
  openGraph: {
    type: "article",
    title: "DocsBot Alternative: Why Teams Switch to AgentDesk",
    description:
      "AgentDesk offers native human handoff with preserved context, tenant isolation, and an open-source platform — capabilities DocsBot lacks. Full comparison and migration guide.",
    url: "/alternatives/docsbot",
  },
  robots: { index: true, follow: true },
};

const PUBLISHED = SITE_PUBLISH_DATE;

const capabilityRows = [
  [
    "RAG quality",
    "Qdrant vector search, hybrid keyword + semantic retrieval",
    "Strong retrieval, semantic-focused",
  ],
  [
    "Human handoff",
    "Native — Socket.io live takeover with full transcript",
    "No native handoff or live inbox",
  ],
  [
    "Native inbox",
    "Built-in operator inbox for escalated sessions",
    "None — no live agent surface",
  ],
  [
    "Tenant isolation",
    "Per-workspace document, widget, and conversation scoping",
    "Single workspace; no multi-tenant boundaries",
  ],
  [
    "Embed options",
    "Script tag, iframe, React SDK, Vue SDK",
    "Script tag + iframe",
  ],
  [
    "Open-source",
    "Repository available for self-hosting",
    "Closed-source, SaaS only",
  ],
  [
    "Starting price",
    "Free tier + usage credits",
    "$49/mo (Starter plan)",
  ],
  [
    "Document ingestion",
    "PDF, DOCX, Markdown, plain text, URLs, sitemaps, tables",
    "PDF, DOCX, text, URLs",
  ],
  [
    "Search type",
    "Hybrid (keyword + semantic)",
    "Semantic-only",
  ],
  [
    "Widget customization",
    "Header, input, launcher, theme tokens, custom CSS",
    "Limited theme controls",
  ],
];

const faqs = [
  {
    question: "Is AgentDesk free?",
    answer:
      "Yes. AgentDesk offers a free tier with usage credits so you can test the full feature set — RAG, human handoff, tenant isolation, and embeddable widget — before committing to paid capacity. There are no flat monthly fees on the free tier.",
  },
  {
    question: "Can I import my DocsBot data into AgentDesk?",
    answer:
      "Yes. Export your knowledge-base documents from DocsBot (PDFs, DOCX, URLs, and text files), then upload them directly into an AgentDesk tenant workspace. AgentDesk ingests PDF, DOCX, Markdown, plain text, and public URLs including sitemaps. Most migrations complete in under 30 minutes.",
  },
  {
    question: "How does AgentDesk's handoff differ from DocsBot?",
    answer:
      "DocsBot does not offer native human handoff or a live operator inbox — it is built for automated document Q&A. AgentDesk includes a built-in operator inbox: when the agent escalates, automation pauses, the full transcript and session token transfer to a live operator, and the operator replies from the same chat surface the customer is using. No channel switch, no lost context.",
  },
  {
    question: "Which has better RAG?",
    answer:
      "Both platforms offer strong retrieval-augmented generation. AgentDesk pairs Qdrant with hybrid (keyword + semantic) search, so exact-match queries like order numbers and SKUs work alongside semantic retrieval. DocsBot offers semantic-focused retrieval that is strong on conceptual queries but weaker on exact identifiers.",
  },
  {
    question: "How long does migration from DocsBot take?",
    answer:
      "Most teams complete the migration in three steps: (1) export your documents and URLs from DocsBot, (2) upload them to your AgentDesk workspace, and (3) paste the AgentDesk embed snippet on your site. For a typical knowledge base, this process takes under 30 minutes end to end.",
  },
];

export default function DocsBotAlternativePage() {
  return (
    <>
      <ContentLayout
        title="DocsBot Alternative"
        subtitle="Why teams switch from DocsBot to AgentDesk for AI-powered customer-facing support with human handoff, a live operator inbox, and tenant isolation."
        eyebrow="Alternatives"
        lastUpdated={PUBLISHED}
        readingTime="7 min read"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Alternatives", href: "/alternatives" },
          { label: "DocsBot vs AgentDesk", href: "/alternatives/docsbot" },
        ]}
      >
        <Tldr>
          Best if you need strong document retrieval for an internal knowledge
          base. <strong>AgentDesk is better</strong> when you need human handoff,
          a live operator inbox, tenant isolation, or an embed built for
          customer-facing support. DocsBot has excellent document ingestion, but
          it lacks native live-agent escalation, multi-tenant boundaries, and
          hybrid search — all of which AgentDesk ships out of the box.
        </Tldr>

        <SectionHeading id="feature-comparison">
          DocsBot vs AgentDesk — feature matrix
        </SectionHeading>
        <p>
          Below is a head-to-head comparison across the capabilities that matter
          most when evaluating an AI support platform.
        </p>
        <ComparisonTable
          columns={["Capability", "AgentDesk", "DocsBot"]}
          rows={capabilityRows}
        />

        <SectionHeading id="pricing">
          Pricing comparison
        </SectionHeading>
        <p>
          DocsBot&apos;s Starter plan begins at <strong>$49/month</strong> and
          scales upward with usage. AgentDesk takes a different approach: a{" "}
          <strong>free tier with usage credits</strong> means you pay for what
          you resolve, not a flat seat fee. For teams scaling support volume, the
          difference compounds — at 10,000 tickets/month, DocsBot&apos;s flat
          tiers can run 3–5× AgentDesk&apos;s usage-based cost.
        </p>
        <ComparisonTable
          columns={["Plan dimension", "AgentDesk", "DocsBot"]}
          rows={[
            ["Entry price", "Free tier + usage credits", "$49/mo (Starter)"],
            ["Pricing model", "Pay per resolution", "Flat monthly tiers"],
            ["Free trial", "Yes — full feature access", "Limited trial"],
            ["Scaling cost", "Linear with usage", "Tier jumps at volume"],
          ]}
        />

        <SectionHeading id="migration">
          Switching from DocsBot? Here&apos;s the 3-step path
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: FileUp, num: "01", title: "Export your docs", text: "Download your knowledge-base documents from DocsBot — PDFs, DOCX, text files, and URLs." },
            { icon: Upload, num: "02", title: "Upload to AgentDesk", text: "Drop the same files into your AgentDesk tenant workspace. Chunking and indexing are automatic." },
            { icon: Code2, num: "03", title: "Paste the snippet", text: "Replace the DocsBot embed with the AgentDesk script tag. You are live in minutes." },
          ].map(({ icon: Icon, num, title, text }) => (
            <div key={num} className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-r from-[#1456f0] to-[#0099ff] font-mono text-xs font-semibold text-white">
                {num}
              </span>
              <Icon aria-hidden="true" className="mt-3 h-5 w-5 text-[#0099ff]" />
              <h3 className="mt-2 text-sm font-semibold text-[var(--ui-text)]">{title}</h3>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{text}</p>
            </div>
          ))}
        </div>

        <SectionHeading id="when-docsbot">
          When DocsBot is the better pick
        </SectionHeading>
        <p>
          DocsBot is genuinely good at certain things. Be honest about your
          needs — if these describe you, DocsBot may be the right choice:
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: BookOpen, title: "Internal KB focus", text: "Your primary use case is an internal knowledge base or team Q&A, not customer-facing support." },
            { icon: Code2, title: "Simple Q&A use case", text: "You need document-grounded answers without escalation, handoff, or live operator workflows." },
            { icon: Zap, title: "Strong dev docs", text: "You value a clean developer experience for document ingestion over widget customization." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
              <Icon aria-hidden="true" className="h-5 w-5 text-[#0099ff]" />
              <h3 className="mt-3 text-sm font-semibold text-[var(--ui-text)]">{title}</h3>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{text}</p>
            </div>
          ))}
        </div>

        <SectionHeading id="why-switch">
          Why teams switch to AgentDesk
        </SectionHeading>
        <p>
          The recurring theme in DocsBot-to-AgentDesk migrations is the need for
          a support workflow, not just a Q&A tool. DocsBot answers questions;
          AgentDesk handles conversations — including the ones that need a human.
          If your support load includes escalations, refunds, complaints, or any
          conversation where a human adds value, the handoff gap is the reason
          to switch.
        </p>
        <p>
          Read more about how{" "}
          <Link href="/features/human-handoff" className="font-semibold text-[#0099ff] underline-offset-2 hover:underline">
            AgentDesk&apos;s human handoff works
          </Link>{" "}
          and why{" "}
          <Link href="/blog/ai-human-blend-support" className="font-semibold text-[#0099ff] underline-offset-2 hover:underline">
            the AI + human blend outperforms either alone
          </Link>
          .
        </p>

        <Callout variant="success" title="Ready to switch?">
          <Link href="/ai-support-agent" className="font-semibold text-[#0099ff] hover:underline">
            Explore the AgentDesk AI support agent
          </Link>{" "}
          or read the{" "}
          <Link href="/docs/quickstart" className="font-semibold text-[#0099ff] hover:underline">
            quickstart guide
          </Link>{" "}
          to migrate from DocsBot in under 30 minutes.
        </Callout>

        <FaqSection faqs={faqs} />

        <p className="text-sm text-[var(--ui-muted)]">
          Looking for other alternatives? See{" "}
          <Link href="/alternatives/chatbase" className="text-[#0099ff] hover:underline">Chatbase vs AgentDesk</Link>
          {" "}or{" "}
          <Link href="/alternatives/sitegpt" className="text-[#0099ff] hover:underline">SiteGPT vs AgentDesk</Link>
          .
        </p>
      </ContentLayout>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Alternatives", path: "/alternatives" },
              { name: "DocsBot vs AgentDesk", path: "/alternatives/docsbot" },
            ]),
            articleSchema({
              headline: "DocsBot Alternative: Why Teams Switch to AgentDesk",
              description:
                "Compare DocsBot vs AgentDesk head-to-head: RAG quality, human handoff, native inbox, tenant isolation, pricing, and open-source.",
              path: "/alternatives/docsbot",
              datePublished: PUBLISHED,
              authorName: "AgentDesk Team",
            }),
            faqSchema(faqs),
          ]),
        }}
      />
    </>
  );
}

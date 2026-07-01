import type { Metadata } from "next";
import Link from "next/link";
import { Code2, FileUp, Globe, MessageSquare, ShieldCheck, Upload, Zap } from "lucide-react";
import {
  Callout,
  ComparisonTable,
  ContentLayout,
  SectionHeading,
  Tldr,
} from "@/components/content/ContentLayout";
import { FaqSection } from "@/components/content/FaqSection";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "SiteGPT Alternative — Why Teams Switch to AgentDesk",
  description:
    "Compare SiteGPT vs AgentDesk head-to-head: RAG grounding, human handoff, tenant isolation, embed flexibility, pricing, and API access. See why teams migrate from SiteGPT to AgentDesk.",
  alternates: { canonical: "/alternatives/sitegpt" },
  openGraph: {
    type: "article",
    title: "SiteGPT Alternative: Why Teams Switch to AgentDesk",
    description:
      "AgentDesk offers RAG grounding, native human handoff, tenant isolation, and developer-friendly embed options — capabilities SiteGPT lacks. Full comparison and migration guide.",
    url: "/alternatives/sitegpt",
  },
  robots: { index: true, follow: true },
};

const PUBLISHED = "2026-07-01";

const capabilityRows = [
  [
    "RAG quality",
    "Qdrant vector search, hybrid keyword + semantic retrieval",
    "Moderate retrieval, semantic-focused",
  ],
  [
    "Human handoff",
    "Native — Socket.io live takeover with full transcript",
    "None — no handoff surface",
  ],
  [
    "Native inbox",
    "Built-in operator inbox for escalated sessions",
    "None",
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
    "URLs, PDF, text",
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
  [
    "API access",
    "Public chat + ingestion API",
    "Limited / undocumented",
  ],
];

const faqs = [
  {
    question: "Is AgentDesk free?",
    answer:
      "Yes. AgentDesk offers a free tier with usage credits so you can test the full feature set — RAG, human handoff, tenant isolation, and embeddable widget — before committing to paid capacity. There are no flat monthly fees on the free tier.",
  },
  {
    question: "Can I import my SiteGPT data into AgentDesk?",
    answer:
      "Yes. Export your knowledge-base documents and URLs from SiteGPT, then upload them directly into an AgentDesk tenant workspace. AgentDesk ingests PDF, DOCX, Markdown, plain text, and public URLs including sitemaps. Most migrations complete in under 30 minutes.",
  },
  {
    question: "How does AgentDesk's handoff differ from SiteGPT?",
    answer:
      "SiteGPT does not offer human handoff — it is built for automated website Q&A. AgentDesk includes a built-in operator inbox: when the agent escalates, automation pauses, the full transcript and session token transfer to a live operator, and the operator replies from the same chat surface the customer is using. No channel switch, no lost context.",
  },
  {
    question: "Which has better technical SEO?",
    answer:
      "AgentDesk. The platform ships with server-rendered documentation (crawlable by GPTBot, PerplexityBot, and Googlebot), per-route metadata, structured data (JSON-LD), sitemap, and robots configuration. SiteGPT's technical SEO surface is thinner and less configurable.",
  },
  {
    question: "How long does migration from SiteGPT take?",
    answer:
      "Most teams complete the migration in three steps: (1) export your documents and URLs from SiteGPT, (2) upload them to your AgentDesk workspace, and (3) paste the AgentDesk embed snippet on your site. For a typical knowledge base, this process takes under 30 minutes end to end.",
  },
];

export default function SiteGPTAlternativePage() {
  return (
    <>
      <ContentLayout
        title="SiteGPT Alternative"
        subtitle="Why teams switch from SiteGPT to AgentDesk for RAG-grounded answers, human handoff, tenant isolation, and developer-friendly embed options."
        eyebrow="Alternatives"
        lastUpdated={PUBLISHED}
        readingTime="7 min read"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Alternatives", href: "/alternatives" },
          { label: "SiteGPT vs AgentDesk", href: "/alternatives/sitegpt" },
        ]}
      >
        <Tldr>
          Best if you&apos;re a non-technical site owner who wants a no-code
          chatbot. <strong>AgentDesk is better</strong> when you need RAG
          grounding, human handoff, tenant isolation, or developer-friendly
          embed options. SiteGPT is easy to set up, but it lacks native
          live-agent escalation, multi-tenant boundaries, hybrid search, and a
          documented API — all of which AgentDesk ships out of the box.
        </Tldr>

        <SectionHeading id="feature-comparison">
          SiteGPT vs AgentDesk — feature matrix
        </SectionHeading>
        <p>
          Below is a head-to-head comparison across the capabilities that matter
          most when evaluating an AI support platform.
        </p>
        <ComparisonTable
          columns={["Capability", "AgentDesk", "SiteGPT"]}
          rows={capabilityRows}
        />

        <SectionHeading id="pricing">
          Pricing comparison
        </SectionHeading>
        <p>
          SiteGPT&apos;s Starter plan begins at <strong>$49/month</strong> and
          scales upward with usage. AgentDesk takes a different approach: a{" "}
          <strong>free tier with usage credits</strong> means you pay for what
          you resolve, not a flat seat fee. For teams scaling support volume, the
          difference compounds — at 10,000 tickets/month, SiteGPT&apos;s flat
          tiers can run 3–5× AgentDesk&apos;s usage-based cost.
        </p>
        <ComparisonTable
          columns={["Plan dimension", "AgentDesk", "SiteGPT"]}
          rows={[
            ["Entry price", "Free tier + usage credits", "$49/mo (Starter)"],
            ["Pricing model", "Pay per resolution", "Flat monthly tiers"],
            ["Free trial", "Yes — full feature access", "Limited trial"],
            ["Scaling cost", "Linear with usage", "Tier jumps at volume"],
          ]}
        />

        <SectionHeading id="migration">
          Switching from SiteGPT? Here&apos;s the 3-step path
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: FileUp, num: "01", title: "Export your docs", text: "Download your knowledge-base documents and URLs from SiteGPT — PDFs, text files, and website links." },
            { icon: Upload, num: "02", title: "Upload to AgentDesk", text: "Drop the same files into your AgentDesk tenant workspace. Chunking and indexing are automatic." },
            { icon: Code2, num: "03", title: "Paste the snippet", text: "Replace the SiteGPT embed with the AgentDesk script tag. You are live in minutes." },
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

        <SectionHeading id="when-sitegpt">
          When SiteGPT is the better pick
        </SectionHeading>
        <p>
          SiteGPT is genuinely good for certain setups. Be honest about your
          needs — if these describe you, SiteGPT may be the right choice:
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Globe, title: "No-code users", text: "You never want to touch code or a script tag and prefer a fully wizard-driven setup." },
            { icon: Zap, title: "Vertical markets", text: "You operate in a vertical (real estate, agencies) where SiteGPT's pre-built templates fit." },
            { icon: MessageSquare, title: "Simple FAQ bots", text: "You need basic website Q&A without escalations, handoffs, or complex workflows." },
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
          The recurring theme in SiteGPT-to-AgentDesk migrations is the need for
          a real support platform, not just a website widget. SiteGPT answers
          basic questions; AgentDesk handles grounded answers, live escalation,
          multi-tenant isolation, and developer-grade embed options. If your
          support load includes anything beyond simple FAQs — escalations,
          refunds, complaints, or multi-brand setups — the gap is the reason to
          switch.
        </p>
        <p>
          Read more about how{" "}
          <Link href="/features/human-handoff" className="font-semibold text-[#0099ff] underline-offset-2 hover:underline">
            AgentDesk&apos;s human handoff works
          </Link>{" "}
          and how{" "}
          <Link href="/blog/what-is-rag-chatbot" className="font-semibold text-[#0099ff] underline-offset-2 hover:underline">
            RAG grounding produces verified answers
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
          to migrate from SiteGPT in under 30 minutes.
        </Callout>

        <FaqSection faqs={faqs} />

        <p className="text-sm text-[var(--ui-muted)]">
          Looking for other alternatives? See{" "}
          <Link href="/alternatives/chatbase" className="text-[#0099ff] hover:underline">Chatbase vs AgentDesk</Link>
          {" "}or{" "}
          <Link href="/alternatives/docsbot" className="text-[#0099ff] hover:underline">DocsBot vs AgentDesk</Link>
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
              { name: "SiteGPT vs AgentDesk", path: "/alternatives/sitegpt" },
            ]),
            articleSchema({
              headline: "SiteGPT Alternative: Why Teams Switch to AgentDesk",
              description:
                "Compare SiteGPT vs AgentDesk head-to-head: RAG grounding, human handoff, tenant isolation, embed flexibility, pricing, and API access.",
              path: "/alternatives/sitegpt",
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

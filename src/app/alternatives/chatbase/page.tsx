import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileUp,
  CheckCircle2,
  Code2,
  MessageSquare,
  ShieldCheck,
  Upload,
  Zap,
} from "lucide-react";
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
  title: "Chatbase Alternative — Why Teams Switch to AgentDesk",
  description:
    "Compare Chatbase vs AgentDesk head-to-head: RAG quality, human handoff, tenant isolation, pricing, and open-source. See why teams migrate from Chatbase to AgentDesk.",
  alternates: { canonical: "/alternatives/chatbase" },
  openGraph: {
    type: "article",
    title: "Chatbase Alternative: Why Teams Switch to AgentDesk",
    description:
      "AgentDesk offers native human handoff with preserved context, tenant isolation, and an open-source platform — capabilities Chatbase lacks. Full comparison and migration guide.",
    url: "/alternatives/chatbase",
  },
  robots: { index: true, follow: true },
};

const PUBLISHED = "2026-07-01";

/* ------------------------------------------------------------------ */
/*  Feature matrix                                                     */
/* ------------------------------------------------------------------ */
const capabilityRows = [
  [
    "RAG quality",
    "Qdrant vector search, hybrid keyword + semantic retrieval",
    "GPT-based retrieval, keyword fallback only",
  ],
  [
    "Human handoff",
    "Native — Socket.io live takeover with full transcript",
    "Not available natively",
  ],
  [
    "Native inbox",
    "Built-in operator inbox for escalated sessions",
    "None — requires third-party integration",
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
    "$19/mo (Essential plan)",
  ],
  [
    "Hybrid search",
    "Keyword + semantic retrieval combined",
    "Semantic-only retrieval",
  ],
  [
    "Sentiment detection",
    "Built-in — triggers handoff on negative sentiment",
    "Not available",
  ],
  [
    "Knowledge base types",
    "PDF, DOCX, Markdown, plain text, URLs, sitemaps",
    "URLs, PDF, text paste, limited DOCX",
  ],
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                           */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    question: "Is AgentDesk free?",
    answer:
      "Yes. AgentDesk offers a free tier with usage credits so you can test the full feature set — RAG, human handoff, tenant isolation, and embeddable widget — before committing to paid capacity. There are no flat monthly fees on the free tier.",
  },
  {
    question: "Can I import my Chatbase data into AgentDesk?",
    answer:
      "Yes. Export your knowledge-base documents from Chatbase (PDFs, URLs, and text files), then upload them directly into an AgentDesk tenant workspace. AgentDesk ingests PDF, DOCX, Markdown, plain text, and public URLs including sitemaps. Most migrations complete in under 30 minutes.",
  },
  {
    question: "How does AgentDesk's handoff differ from Chatbase?",
    answer:
      "Chatbase does not offer native human handoff — you need to build a custom integration or use a third-party live-chat tool. AgentDesk includes a built-in operator inbox: when the agent escalates, automation pauses, the full transcript and session token transfer to a live operator, and the operator replies from the same chat surface the customer is using. No channel switch, no lost context.",
  },
  {
    question: "Which is better for multi-tenant setups?",
    answer:
      "AgentDesk. Every tenant gets its own document index, widget configuration, and conversation store — all isolated at the workspace level. Chatbase runs on a single-workspace model with no built-in tenant boundaries, which makes it unsuitable for agencies, platforms, or teams that manage support for multiple brands.",
  },
  {
    question: "How long does migration from Chatbase take?",
    answer:
      "Most teams complete the migration in three steps: (1) export your documents and URLs from Chatbase, (2) upload them to your AgentDesk workspace, and (3) paste the AgentDesk embed snippet on your site. For a typical knowledge base, this process takes under 30 minutes end to end.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
export default function ChatbaseAlternativePage() {
  return (
    <>
      <ContentLayout
        title="Chatbase Alternative"
        subtitle="Why teams switch from Chatbase to AgentDesk for AI-powered support with human handoff, tenant isolation, and an open-source platform."
        eyebrow="Alternatives"
        lastUpdated={PUBLISHED}
        readingTime="7 min read"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Alternatives", href: "/alternatives" },
          { label: "Chatbase vs AgentDesk", href: "/alternatives/chatbase" },
        ]}
      >
        {/* -------------------------------------------------------- */}
        {/*  Section 1 — TL;DR                                       */}
        {/* -------------------------------------------------------- */}
        <Tldr>
          Best if you want fast deployment on a simple use case.{" "}
          <strong>AgentDesk is better</strong> when you need human handoff with
          preserved context, tenant isolation, or an open-source platform.
          Chatbase is quick to set up and has a large integration library, but it
          lacks native live-agent escalation, multi-tenant isolation, and hybrid
          search — all of which AgentDesk ships out of the box.
        </Tldr>

        {/* -------------------------------------------------------- */}
        {/*  Section 2 — Feature matrix                               */}
        {/* -------------------------------------------------------- */}
        <SectionHeading id="feature-comparison">
          Chatbase vs AgentDesk — feature matrix
        </SectionHeading>
        <p>
          Below is a head-to-head comparison across the capabilities that matter
          most when evaluating an AI support platform.
        </p>
        <ComparisonTable
          columns={["Capability", "AgentDesk", "Chatbase"]}
          rows={capabilityRows}
        />

        {/* -------------------------------------------------------- */}
        {/*  Section 3 — Pricing                                     */}
        {/* -------------------------------------------------------- */}
        <SectionHeading id="pricing">
          Pricing: Chatbase vs AgentDesk
        </SectionHeading>
        <p>
          <strong>Chatbase</strong> starts at $19/mo on the Essential plan,
          which includes a single chatbot, limited message credits, and basic
          analytics. Higher tiers unlock additional bots, custom branding, and
          API access, but costs scale quickly with volume.
        </p>
        <p>
          <strong>AgentDesk</strong> offers a free tier with usage credits,
          so you can test every feature — RAG, human handoff, tenant isolation,
          and embeddable widget — without a flat monthly commitment. Paid
          capacity scales with your actual usage, not seat counts.
        </p>
        <Callout variant="info" title="Bottom line">
          If you&apos;re a small team with a single FAQ-style bot and don&apos;t
          need escalation, Chatbase&apos;s $19 plan works. If you need
          multi-tenant isolation, live handoff, or want to self-host,
          AgentDesk&apos;s free tier delivers more on day one.
        </Callout>

        {/* -------------------------------------------------------- */}
        {/*  Section 4 — Migration                                    */}
        {/* -------------------------------------------------------- */}
        <SectionHeading id="migration">
          Switching from Chatbase? 3-step migration path
        </SectionHeading>
        <p>
          Migrating your AI support stack doesn&apos;t have to be painful.
          Here&apos;s the fastest path from Chatbase to AgentDesk:
        </p>
        <div className="grid gap-3">
          {[
            {
              num: "01",
              icon: FileUp,
              title: "Export your documents",
              text: "Download your knowledge-base files from Chatbase — PDFs, URLs, and text exports. Gather everything you want the new agent to reference.",
            },
            {
              num: "02",
              icon: Upload,
              title: "Upload to AgentDesk",
              text: "Create a tenant workspace, then upload your documents. AgentDesk chunks, embeds, and indexes everything into a Qdrant vector store scoped to your workspace.",
            },
            {
              num: "03",
              icon: Code2,
              title: "Paste the embed snippet",
              text: "Replace the Chatbase script tag with the AgentDesk snippet — script, iframe, or React/Vue SDK. One tag swap, zero rebuild.",
            },
          ].map(({ num, icon: Icon, title, text }) => (
            <div
              key={num}
              className="flex gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#1456f0] to-[#0099ff] font-mono text-xs font-semibold text-white">
                {num}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--ui-text)]">
                  {title}
                </h3>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-[var(--ui-muted)]">
          Most teams complete the full migration in under 30 minutes. See our{" "}
          <Link
            href="/ai-support-agent"
            className="text-[#0099ff] hover:underline"
          >
            AI support agent deployment guide
          </Link>{" "}
          for detailed setup instructions.
        </p>

        {/* -------------------------------------------------------- */}
        {/*  Section 5 — When Chatbase is better                       */}
        {/* -------------------------------------------------------- */}
        <SectionHeading id="when-chatbase-is-better">
          When Chatbase is the better pick
        </SectionHeading>
        <p>
          We believe AgentDesk is the stronger platform for teams that need human
          handoff, tenant isolation, or open-source flexibility. But Chatbase has
          genuine strengths in certain scenarios:
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Fast deploy, non-technical users",
              text: "Chatbase's onboarding wizard gets a simple FAQ bot live in minutes. If you don't need customization, it's hard to beat for speed.",
            },
            {
              icon: MessageSquare,
              title: "Large integration library",
              text: "Chatbase connects to Slack, WhatsApp, Instagram, and more out of the box. AgentDesk currently focuses on web-based embeds.",
            },
            {
              icon: CheckCircle2,
              title: "Single-brand, low-complexity use cases",
              text: "If you run one brand, don't need escalation, and just want a chatbot that answers from a URL — Chatbase gets the job done.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4"
            >
              <Icon aria-hidden="true" className="h-5 w-5 text-[#0099ff]" />
              <h3 className="mt-3 text-sm font-semibold text-[var(--ui-text)]">
                {title}
              </h3>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                {text}
              </p>
            </div>
          ))}
        </div>

        {/* -------------------------------------------------------- */}
        {/*  Section 6 — FAQ                                          */}
        {/* -------------------------------------------------------- */}
        <FaqSection faqs={faqs} />

        {/* -------------------------------------------------------- */}
        {/*  Section 7 — Internal links                               */}
        {/* -------------------------------------------------------- */}
        <Callout variant="success" title="Explore more">
          Ready to try AgentDesk?{" "}
          <Link href="/" className="font-semibold text-[#0099ff] hover:underline">
            Open the workspace
          </Link>
          {" "}— or learn about the{" "}
          <Link
            href="/features/human-handoff"
            className="font-semibold text-[#0099ff] hover:underline"
          >
            human handoff feature
          </Link>{" "}
          that Chatbase doesn&apos;t offer. For a broader overview, read our{" "}
          <Link
            href="/ai-support-agent"
            className="font-semibold text-[#0099ff] hover:underline"
          >
            AI support agent guide
          </Link>
          .
        </Callout>
      </ContentLayout>

      {/* Page-level structured data: Breadcrumb + Article + FAQ. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Alternatives", path: "/alternatives" },
              { name: "Chatbase vs AgentDesk", path: "/alternatives/chatbase" },
            ]),
            articleSchema({
              headline: "Chatbase Alternative: Why Teams Switch to AgentDesk",
              description:
                "Compare Chatbase vs AgentDesk head-to-head: RAG quality, human handoff, tenant isolation, pricing, and open-source. See why teams migrate from Chatbase to AgentDesk.",
              path: "/alternatives/chatbase",
              datePublished: PUBLISHED,
              authorName: "AgentDesk Team",
              authorJobTitle: "AI Support Platform",
            }),
            faqSchema(faqs),
          ]),
        }}
      />
    </>
  );
}

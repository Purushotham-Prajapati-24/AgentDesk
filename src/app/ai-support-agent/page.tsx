import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FileText,
  Inbox,
  Layers,
  MessageSquare,
  ShieldCheck,
  Workflow,
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
import { SITE_PUBLISH_DATE } from "@/lib/site";
import { breadcrumbSchema, techArticleSchema } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "AI Support Agent — Verified Answers with Human Handoff",
  description:
    "An AI support agent answers from your own documents, embeds as a chat widget, and escalates to a human operator when judgment matters. Compare AgentDesk to Chatbase, DocsBot, and SiteGPT.",
  alternates: { canonical: "/ai-support-agent" },
  openGraph: {
    type: "article",
    title: "AI Support Agent — Verified Answers with Human Handoff",
    description:
      "An AI support agent that grounds every answer in your documents and hands off to a human operator when judgment matters. Built for RAG, live takeover, and tenant isolation.",
    url: "/ai-support-agent",
  },
  robots: { index: true, follow: true },
};

const PUBLISHED = SITE_PUBLISH_DATE;

const capabilityRows = [
  [
    "Retrieval-augmented answers",
    "Yes — Qdrant vector search over uploaded docs",
    "Partial — depends on plan",
    "Yes",
    "Yes",
  ],
  [
    "Live human handoff",
    "Yes — Socket.io, full transcript preserved",
    "Limited — via integrations",
    "No native inbox",
    "Via Intercom workflow",
  ],
  [
    "Embeddable widget",
    "Script, iframe, React, Vue SDKs",
    "Script + iframe",
    "Script + iframe",
    "Intercom widget only",
  ],
  [
    "Tenant isolation",
    "Native — per-workspace scoping",
    "Partial",
    "Yes",
    "Enterprise only",
  ],
  [
    "Open-source / self-host",
    "Repository available",
    "No",
    "No",
    "No",
  ],
  [
    "Starting price",
    "Free tier + usage credits",
    "$19/mo",
    "$49/mo",
    "$0.99/resolution",
  ],
];

const faqs = [
  {
    question: "What is an AI support agent?",
    answer:
      "An AI support agent is a software system that answers customer questions automatically, grounding its responses in a company's own documents, help-center articles, and policies using retrieval-augmented generation (RAG). Unlike a generic chatbot, an AI support agent cites its sources, stays scoped to tenant knowledge, and can hand a conversation off to a human operator when confidence drops or policy requires it.",
  },
  {
    question: "How does an AI support agent differ from a regular chatbot?",
    answer:
      "A regular chatbot answers from hard-coded rules or generic model memory — it can hallucinate and drift from company policy. An AI support agent like AgentDesk retrieves relevant chunks from your uploaded documents before answering, so responses are grounded in verified content. It also preserves session context during human handoff, which rule-based bots cannot do.",
  },
  {
    question: "How long does it take to deploy an AI support agent?",
    answer:
      "With AgentDesk, the shortest path is: create an agent (1 minute), upload documents or ingest URLs (5–15 minutes depending on volume), customize the widget appearance (5 minutes), and paste one script tag onto your site (1 minute). Most teams have a working support widget live in under 30 minutes.",
  },
  {
    question: "Can the AI support agent hand off to a human?",
    answer:
      "Yes. AgentDesk's human handoff feature pauses automation, routes the full conversation transcript to a live operator inbox, and lets the operator reply over the same chat surface the customer is already using. The session token and tenant scope are preserved throughout, so no context is lost.",
  },
  {
    question: "What documents can I train the AI support agent on?",
    answer:
      "AgentDesk ingests PDF, DOCX, Markdown, plain text, tables, and public URLs (including sitemaps). Documents are chunked, embedded, and stored in a Qdrant vector database scoped to your tenant. The agent searches this index before every response.",
  },
];

export default function AiSupportAgentPage() {
  return (
    <>
      <ContentLayout
        title="AI Support Agent"
        subtitle="A support agent that answers from your own documents, embeds as a chat widget, and knows when to stop and hand off to a human."
        eyebrow="AI Support"
        lastUpdated={PUBLISHED}
        readingTime="8 min read"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "AI Support Agent", href: "/ai-support-agent" },
        ]}
      >
        <Tldr>
          An <strong>AI support agent</strong> uses retrieval-augmented generation
          (RAG) to answer customer questions from your own knowledge base — not
          generic model memory. It embeds as a chat widget on any website, cites
          its sources, and escalates to a human operator with the full
          transcript preserved when confidence or policy requires it. AgentDesk
          ships this as an open, tenant-isolated platform with script, iframe,
          React, and Vue install paths.
        </Tldr>

        <p>
          Customer support teams are caught between two pressures: customers
          expect instant answers 24/7, but support content is scattered across
          help centers, policy PDFs, and internal wikis. An{" "}
          <strong>AI support agent</strong> closes that gap by reading your
          documents and replying in your voice — while still knowing when a
          conversation needs a human.
        </p>

        <SectionHeading id="what-is-an-ai-support-agent">
          What is an AI support agent?
        </SectionHeading>
        <p>
          An AI support agent is a software system that automatically answers
          customer questions using a technique called{" "}
          <strong>retrieval-augmented generation (RAG)</strong>. Before
          responding, the agent searches a vector index of your uploaded
          documents — policies, manuals, help-center articles, and FAQs — and
          grounds its answer in the retrieved context. This is the core
          difference from a generic chatbot: the response is traceable to a
          source you control, not invented from the model&apos;s training data.
        </p>
        <p>
          A complete AI support agent does four things:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: FileText, title: "Retrieve", text: "Search your tenant knowledge base for relevant context before answering." },
            { icon: Bot, title: "Respond", text: "Generate a grounded answer that cites the source material." },
            { icon: MessageSquare, title: "Embed", text: "Install as a chat widget on any website via script, iframe, or framework SDK." },
            { icon: Inbox, title: "Escalate", text: "Hand off to a human operator with full context when judgment is needed." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ui-panel-2)] text-[#0099ff]">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--ui-text)]">{title}</h3>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <SectionHeading id="how-it-works">
          How an AI support agent works
        </SectionHeading>
        <p>
          The retrieval-augmented flow has five steps, repeated for every
          customer message:
        </p>
        <Callout variant="info" title="RAG flow">
          <ol className="list-decimal space-y-1 pl-5">
            <li><strong>Customer asks</strong> a question in the embedded widget.</li>
            <li><strong>AgentDesk searches</strong> the tenant&apos;s Qdrant vector index for matching document chunks.</li>
            <li><strong>Retrieved context</strong> is injected into the answer prompt.</li>
            <li><strong>The agent responds</strong> from that context — not from generic memory.</li>
            <li><strong>If confidence is low</strong> or a policy trigger fires, the session escalates to a human operator.</li>
          </ol>
        </Callout>
        <p>
          This architecture means the agent never &ldquo;knows&rdquo; anything
          it can&apos;t point to. When it answers, the underlying chunks came
          from a document you uploaded — and you can update or remove that
          document at any time without retraining a model.
        </p>

        <SectionHeading id="why-human-handoff">
          Why human handoff is the differentiator
        </SectionHeading>
        <p>
          Most AI chatbot platforms optimize for deflection — the percentage of
          tickets the bot closes without a human. That metric rewards the bot
          for saying <em>something</em>, even when it should have said{" "}
          <em>&ldquo;let me get a person for you.&rdquo;</em> AgentDesk takes
          the opposite stance: the agent is valuable precisely because it knows
          when to stop.
        </p>
        <p>
          When a handoff triggers, three things happen:
        </p>
        <div className="grid gap-3">
          {[
            { num: "01", title: "Automation pauses", text: "The bot stops generating replies so the operator and customer don't talk over each other." },
            { num: "02", title: "Context transfers", text: "The full transcript, session token, and tenant scope move into the operator inbox." },
            { num: "03", title: "Operator replies inline", text: "The human responds from the same inbox; the customer sees the reply in the same widget — no channel switch." },
          ].map(({ num, title, text }) => (
            <div key={num} className="flex gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--ui-panel-2)] font-mono text-xs font-semibold text-[#0099ff]">{num}</span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--ui-text)]">{title}</h3>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <p>
          Learn more on the dedicated{" "}
          <Link href="/features/human-handoff" className="font-semibold text-[#0099ff] underline-offset-2 hover:underline">
            human handoff feature page
          </Link>
          .
        </p>

        <SectionHeading id="comparison">
          How AgentDesk compares to other AI support agents
        </SectionHeading>
        <p>
          The AI support agent market has consolidated around a few platforms.
          Here&apos;s how AgentDesk stacks up on the capabilities that matter
          for teams that want both automation and a credible escalation path.
        </p>
        <ComparisonTable
          columns={["Capability", "AgentDesk", "Chatbase", "DocsBot", "Intercom Fin"]}
          rows={capabilityRows}
        />
        <p className="text-sm text-[var(--ui-muted)]">
          Looking for a specific alternative? See{" "}
          <Link href="/alternatives/chatbase" className="text-[#0099ff] hover:underline">Chatbase vs AgentDesk</Link>
          ,{" "}
          <Link href="/alternatives/docsbot" className="text-[#0099ff] hover:underline">DocsBot vs AgentDesk</Link>
          , or{" "}
          <Link href="/alternatives/sitegpt" className="text-[#0099ff] hover:underline">SiteGPT vs AgentDesk</Link>
          .
        </p>

        <SectionHeading id="deployment">
          Deploy an AI support agent in five steps
        </SectionHeading>
        <div className="grid gap-3">
          {[
            { num: "01", title: "Create a tenant-scoped agent", text: "Spin up a bot in the AgentDesk workspace. Each bot has its own knowledge base, widget config, and conversation store." },
            { num: "02", title: "Upload knowledge", text: "Add PDFs, DOCX, Markdown, or ingest public URLs. AgentDesk chunks, embeds, and indexes everything into Qdrant." },
            { num: "03", title: "Customize the widget", text: "Set the bot name, greeting, header colors, launcher icon, and feature toggles from the WebChat workspace." },
            { num: "04", title: "Paste one snippet", text: "Choose script (any site), iframe (inline panel), or the React/Vue SDK for app shells. One tag, zero build step." },
            { num: "05", title: "Monitor and hand off", text: "Watch live sessions, escalate when needed, and reply from the operator inbox — all in the same workspace." },
          ].map(({ num, title, text }) => (
            <div key={num} className="flex gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#1456f0] to-[#0099ff] font-mono text-xs font-semibold text-white">{num}</span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--ui-text)]">{title}</h3>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <SectionHeading id="security">
          Tenant isolation and security
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Tenant isolation", text: "Prompts, documents, widget settings, and conversations stay scoped to one workspace." },
            { icon: Layers, title: "Vector isolation", text: "Each tenant's Qdrant index is separate — no cross-tenant retrieval." },
            { icon: Zap, title: "Session tokens", text: "Widget sessions are token-scoped; handoff preserves identity across the bot and operator." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
              <Icon aria-hidden="true" className="h-5 w-5 text-[#0099ff]" />
              <h3 className="mt-3 text-sm font-semibold text-[var(--ui-text)]">{title}</h3>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{text}</p>
            </div>
          ))}
        </div>

        <Callout variant="success" title="Get started">
          Ready to deploy your own AI support agent?{" "}
          <Link href="/" className="font-semibold text-[#0099ff] hover:underline">
            Open the AgentDesk workspace
          </Link>{" "}
          or read the{" "}
          <Link href="/docs" className="font-semibold text-[#0099ff] hover:underline">
            developer docs
          </Link>{" "}
          for embed snippets and API reference.
        </Callout>

        <SectionHeading id="learn-more">
          Go deeper
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: "What is a RAG chatbot?", href: "/blog/what-is-rag-chatbot", text: "The retrieval-augmented generation architecture explained, and why it beats fine-tuning for support." },
            { title: "How to build a RAG chatbot", href: "/blog/how-to-build-rag-chatbot", text: "A step-by-step build guide: embeddings, vector DB, chunking, retrieval, and the chat loop." },
            { title: "AI vs traditional support", href: "/blog/ai-customer-support-vs-traditional", text: "Why the AI + human blend outperforms either layer alone on CSAT, cost, and resolution time." },
            { title: "Best AI support tools in 2026", href: "/blog/best-ai-support-tools-2026", text: "AgentDesk, Chatbase, DocsBot, SiteGPT, and Intercom Fin compared and ranked." },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 transition hover:border-[#0099ff]/60 hover:bg-[var(--ui-panel-2)]"
            >
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ui-text)]">
                {link.title}
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--ui-muted)] transition group-hover:translate-x-0.5 group-hover:text-[#0099ff]" />
              </h3>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                {link.text}
              </p>
            </Link>
          ))}
        </div>

        <FaqSection faqs={faqs} />
      </ContentLayout>

      {/* Page-level structured data: Breadcrumb + TechArticle. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "AI Support Agent", path: "/ai-support-agent" },
            ]),
            techArticleSchema({
              headline: "AI Support Agent — Verified Answers with Human Handoff",
              description:
                "An AI support agent answers from your own documents, embeds as a chat widget, and escalates to a human operator when judgment matters.",
              path: "/ai-support-agent",
              datePublished: PUBLISHED,
            }),
          ]),
        }}
      />
    </>
  );
}

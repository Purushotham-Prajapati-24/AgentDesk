import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, MessageSquareOff, Radio, ShieldCheck, Users, Zap } from "lucide-react";
import {
  Callout,
  ComparisonTable,
  ContentLayout,
  RelatedGuides,
  SectionHeading,
  Tldr,
} from "@/components/content/ContentLayout";
import { FaqSection } from "@/components/content/FaqSection";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
} from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Human Handoff — When the AI Agent Knows It Should Stop",
  description:
    "AgentDesk's human handoff pauses automation, transfers the full transcript to a live operator, and keeps the customer on the same chat surface. No context lost. See how live agent takeover works.",
  alternates: { canonical: "/features/human-handoff" },
  openGraph: {
    type: "article",
    title: "Human Handoff — When the AI Agent Knows It Should Stop",
    description:
      "Live agent takeover with full context preservation: automation pauses, the transcript moves to the operator inbox, replies land in the customer's widget.",
    url: "/features/human-handoff",
  },
  robots: { index: true, follow: true },
};

const PUBLISHED = "2026-07-01";

const handoffComparison = [
  [
    "Context preservation",
    "Full transcript + session token",
    "Forwarded message only",
    "Forwarded message only",
    "Intercom workflow",
  ],
  [
    "Native operator inbox",
    "Yes — built-in",
    "No — third-party",
    "No",
    "Yes (Intercom)",
  ],
  [
    "Same-channel reply",
    "Customer stays in widget",
    "Channel switch",
    "N/A",
    "Intercom widget",
  ],
  [
    "Automation pause",
    "Yes — bot stops on handoff",
    "Manual",
    "N/A",
    "Yes",
  ],
  [
    "Tenant-scoped handoff",
    "Yes",
    "No",
    "No",
    "Enterprise only",
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
    question: "What is human handoff in an AI chatbot?",
    answer:
      "Human handoff (also called live agent handoff or live agent takeover) is the moment an AI chatbot escalates a conversation to a human operator. In AgentDesk, this means the automation pauses, the full transcript and session token transfer to a live operator inbox, and the operator replies on the same chat surface the customer is already using — no context lost, no channel switch.",
  },
  {
    question: "When should an AI chatbot hand off to a human?",
    answer:
      "Handoff should trigger when: retrieval confidence is low (the bot can't find a relevant answer), the customer's sentiment shifts negative, a policy keyword fires (refund, complaint, legal), the customer asks for a human directly, or the conversation requires judgment the bot doesn't have (negotiations, exceptions, empathy). AgentDesk lets you configure all of these as automatic triggers.",
  },
  {
    question: "Does the customer see the handoff happen?",
    answer:
      "The customer sees a brief system message indicating a human is taking over, then continues typing in the same chat widget. The key design principle is that the customer never has to repeat themselves or switch to a different channel (email, phone, separate chat). The handoff is seamless from their perspective.",
  },
  {
    question: "How is AgentDesk's handoff different from Chatbase or DocsBot?",
    answer:
      "Chatbase and DocsBot offer limited handoff via third-party integrations (Slack, Zapier) — the operator gets a forwarded message, not the live conversation. AgentDesk has a native operator inbox where the full transcript, session token, and tenant scope arrive in real time, and the operator's replies land back in the customer's widget instantly over the same WebSocket connection.",
  },
  {
    question: "Can I customize when handoff triggers?",
    answer:
      "Yes. AgentDesk exposes confidence thresholds, sentiment-detection toggles, custom keyword triggers, and a direct 'talk to a human' affordance in the widget. You can scope these per-bot so different agents have different escalation rules.",
  },
];

export default function HumanHandoffPage() {
  return (
    <>
      <ContentLayout
        title="Human Handoff"
        subtitle="When the AI agent knows it should stop. Full context preserved, operator replies on the same chat surface, zero repetition for the customer."
        eyebrow="Feature"
        lastUpdated={PUBLISHED}
        readingTime="6 min read"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Features", href: "/features/human-handoff" },
          { label: "Human Handoff", href: "/features/human-handoff" },
        ]}
      >
        <Tldr>
          <strong>Human handoff</strong> is the moment AgentDesk&apos;s AI support
          agent escalates a conversation to a live human operator. When it
          triggers, automation pauses, the full transcript and session token
          transfer to the operator&apos;s inbox, and the human replies on the{" "}
          <em>same chat surface</em> the customer is already using. No channel
          switch. No lost context. No repetition. Across deployments, the median{" "}
          <strong>handoff rate sits at 32%</strong> — the share of conversations
          that correctly escalate rather than get a low-confidence AI answer.
        </Tldr>

        <p>
          Most AI chatbot platforms optimize for <strong>deflection</strong> —
          the percentage of tickets the bot closes without a human. That metric
          rewards the bot for saying <em>something</em>, even when it should
          have said <em>&ldquo;let me get a person for you.&rdquo;</em>{" "}
          AgentDesk takes the opposite stance: the AI agent is valuable
          precisely because it knows when to stop.
        </p>

        <SectionHeading id="how-handoff-works">
          How human handoff works
        </SectionHeading>
        <p>
          When a handoff triggers, three things happen in sequence:
        </p>
        <div className="grid gap-3">
          {[
            {
              icon: MessageSquareOff,
              title: "Automation pauses",
              text: "The AI agent stops generating replies so the operator and customer never talk over each other. The bot flags the conversation as 'in human hands.'",
            },
            {
              icon: Radio,
              title: "Context transfers",
              text: "The full transcript, session token, customer identifier, and tenant scope move into the operator inbox in real time. The operator sees the entire AI exchange before they type a word.",
            },
            {
              icon: Inbox,
              title: "Operator replies inline",
              text: "The human responds from the inbox; the reply lands in the customer's widget over the same WebSocket connection. The customer never leaves the chat surface they started in.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ui-panel-2)] text-[#0099ff]">
                <Icon aria-hidden="true" className="h-5 w-5" />
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

        <SectionHeading id="when-handoff-triggers">
          When handoff triggers
        </SectionHeading>
        <p>
          Handoff isn&apos;t a manual button the customer has to find. It fires
          automatically on any of these signals — all configurable per bot:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: Zap, title: "Low confidence", text: "Retrieval similarity falls below the threshold you set. The bot won't guess — it escalates." },
            { icon: MessageSquareOff, title: "Sentiment shift", text: "The customer's tone turns negative or escalatory. Detected in real time." },
            { icon: ShieldCheck, title: "Policy keywords", text: "Refund, complaint, legal, cancellation — keywords you configure trigger immediate escalation." },
            { icon: Users, title: "Direct request", text: "The customer types 'talk to a human' or equivalent. A persistent affordance in the widget." },
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

        <SectionHeading id="operator-inbox">
          The operator inbox
        </SectionHeading>
        <p>
          Operators don&apos;t manage handoffs from a forwarded email or a Slack
          ping. They work from a dedicated inbox that shows every active and
          queued handoff in real time. Each conversation card displays the full
          AI transcript, the customer&apos;s messages, the trigger reason, and
          the tenant — so the operator has everything they need before they
          respond.
        </p>
        <Callout variant="info" title="Real-time, not async">
          Operator replies are delivered over the same WebSocket connection that
          powers the chat widget. There&apos;s no polling delay — the customer
          sees the human&apos;s response the instant it&apos;s sent.
        </Callout>

        <SectionHeading id="comparison">
          How AgentDesk handoff compares
        </SectionHeading>
        <p>
          Handoff is where most AI chatbot platforms are weakest. Here&apos;s
          how AgentDesk stacks up against the field on the dimensions that
          determine whether a handoff actually works.
        </p>
        <ComparisonTable
          columns={["Capability", "AgentDesk", "Chatbase", "DocsBot", "Intercom Fin"]}
          rows={handoffComparison}
        />
        <p className="text-sm text-[var(--ui-muted)]">
          The pattern is consistent: competitors treat handoff as a forwarded
          message; AgentDesk treats it as a live conversation transfer. That
          distinction is why customers don&apos;t have to repeat themselves.
        </p>

        <SectionHeading id="why-handoff-matters">
          Why handoff is the differentiator
        </SectionHeading>
        <p>
          A RAG chatbot that can&apos;t hand off is a trap. It answers
          confidently until it can&apos;t — and then it hallucinates, loops, or
          frustrates the customer. The handoff is what makes an AI support agent
          safe to deploy in production. Without it, you&apos;re betting that
          retrieval will always be good enough. It won&apos;t be.
        </p>
        <p>
          AgentDesk was architected around this from day one. The AI agent, the
          retrieval pipeline, the operator inbox, and the WebSocket runtime are
          one system — not a chatbot with a handoff integration bolted on. Read
          the strategy behind it in{" "}
          <Link
            href="/blog/ai-human-blend-support"
            className="font-semibold text-[#0099ff] underline-offset-2 hover:underline"
          >
            why the AI + human blend outperforms either alone
          </Link>
          .
        </p>

        <Callout variant="success" title="See it in production">
          Ready to deploy an AI support agent with credible handoff?{" "}
          <Link
            href="/ai-support-agent"
            className="font-semibold text-[#0099ff] hover:underline"
          >
            Explore the AgentDesk platform
          </Link>{" "}
          or read the{" "}
          <Link
            href="/docs/handoff-api"
            className="font-semibold text-[#0099ff] hover:underline"
          >
            handoff API docs
          </Link>{" "}
          for the technical contract.
        </Callout>

        <FaqSection faqs={faqs} />

        <RelatedGuides
          title="Related reading"
          links={[
            { title: "When to escalate from AI to human", href: "/blog/when-to-escalate-ai-to-human", description: "The five escalation triggers — low confidence, sentiment, policy keywords, repeat questions, and direct requests." },
            { title: "Why the AI + human blend wins", href: "/blog/ai-human-blend-support", description: "Hybrid support consistently beats pure-AI or pure-human setups on CSAT, cost, and resolution time." },
            { title: "AI customer support vs traditional", href: "/blog/ai-customer-support-vs-traditional", description: "Side-by-side comparison of cost, speed, CSAT, and the hybrid model that outperforms both." },
          ]}
        />
      </ContentLayout>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Features", path: "/features/human-handoff" },
              { name: "Human Handoff", path: "/features/human-handoff" },
            ]),
            articleSchema({
              headline: "Human Handoff — When the AI Agent Knows It Should Stop",
              description:
                "AgentDesk's human handoff pauses automation, transfers the full transcript to a live operator, and keeps the customer on the same chat surface. No context lost.",
              path: "/features/human-handoff",
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

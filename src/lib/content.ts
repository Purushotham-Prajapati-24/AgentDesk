/**
 * Central content manifest for all Phase 2 MDX content.
 *
 * Every content page's frontmatter lives here as typed data so the sitemap,
 * blog index, internal-link blocks, and RelatedGuides components all read from
 * one source of truth. The MDX files themselves hold the long-form body; this
 * manifest holds the metadata that routing, SEO, and navigation need at build
 * time.
 *
 * Adding a new post: create the .mdx file under src/content/, then add its
 * metadata to the relevant array below. generateStaticParams, sitemap, and
 * cross-links update automatically.
 */

import { SITE_PUBLISH_DATE } from "@/lib/site";

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  category: "AEO" | "Comparison" | "How-to" | "Listicle" | "Strategy";
  datePublished: string;
  dateModified?: string;
  author: string;
  readingTime: string;
  excerpt: string;
  /** Cluster this post belongs to — used for internal linking. */
  cluster: "ai-support-agent" | "human-handoff";
  /** Whether this page is a step-by-step guide eligible for HowTo schema. */
  isHowTo?: boolean;
}

export interface ComparisonPageMeta {
  slug: string;
  competitor: string;
  title: string;
  description: string;
  datePublished: string;
  /** The competitor's starting price, for the comparison table. */
  competitorPrice: string;
}

export interface DocPageMeta {
  slug: string;
  title: string;
  description: string;
  category: "start" | "configure" | "deploy" | "api";
  datePublished: string;
  readingTime: string;
  excerpt: string;
}

export interface FeaturePageMeta {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  excerpt: string;
}

/* -------------------------------------------------------------------------- */
/* Cluster A — "AI support agent" primary commercial cluster                   */
/* -------------------------------------------------------------------------- */

export const blogPosts: BlogPostMeta[] = [
  {
    slug: "what-is-rag-chatbot",
    title: "What Is a RAG Chatbot? (Retrieval-Augmented Generation Explained)",
    description:
      "A RAG chatbot retrieves relevant chunks from your own documents before answering, so responses are grounded in verified content instead of model memory. Here's how it works and why it matters for support.",
    category: "AEO",
    datePublished: "2026-07-01",
    author: "AgentDesk Team",
    readingTime: "7 min read",
    excerpt:
      "A RAG chatbot grounds every answer in your own documents using retrieval-augmented generation. Learn the architecture, why it beats fine-tuning for support, and how to ship one.",
    cluster: "ai-support-agent",
  },
  {
    slug: "ai-customer-support-vs-traditional",
    title: "AI Customer Support vs Traditional: When to Use Each (2026)",
    description:
      "AI support agents and traditional support teams aren't competitors — they're layers. Compare cost, speed, CSAT impact, and the hybrid model that outperforms both.",
    category: "Comparison",
    datePublished: "2026-07-01",
    author: "AgentDesk Team",
    readingTime: "8 min read",
    excerpt:
      "AI support handles 60–80% of repetitive tickets instantly; humans handle escalations. Here's the data-backed breakdown of AI vs traditional support and the blend that wins.",
    cluster: "ai-support-agent",
  },
  {
    slug: "how-to-build-rag-chatbot",
    title: "How to Build a RAG Chatbot (Step-by-Step Guide for 2026)",
    description:
      "A practical, end-to-step guide to building a retrieval-augmented generation chatbot: choose an embedding model, set up a vector DB, ingest documents, and wire up the chat loop.",
    category: "How-to",
    datePublished: "2026-07-01",
    author: "AgentDesk Team",
    readingTime: "12 min read",
    excerpt:
      "Build a RAG chatbot from scratch: document ingestion, chunking, embeddings, vector search, prompt construction, and the chat loop. Includes code and architecture diagrams.",
    cluster: "ai-support-agent",
    isHowTo: true,
  },
  {
    slug: "best-ai-support-tools-2026",
    title: "Best AI Support Agent Tools in 2026 (Compared & Ranked)",
    description:
      "We compared the leading AI support agent platforms — AgentDesk, Chatbase, DocsBot, SiteGPT, and Intercom Fin — on RAG quality, human handoff, pricing, and embed options.",
    category: "Listicle",
    datePublished: "2026-07-01",
    author: "AgentDesk Team",
    readingTime: "10 min read",
    excerpt:
      "The 5 best AI support agent tools of 2026, ranked by RAG grounding quality, human handoff depth, embed flexibility, and total cost of ownership.",
    cluster: "ai-support-agent",
  },

  /* ------------------------------------------------------------------------ */
  /* Cluster B — "Human handoff" spokes                                        */
  /* ------------------------------------------------------------------------ */
  {
    slug: "when-to-escalate-ai-to-human",
    title: "When to Escalate from AI to a Human Agent (Triggers & Rules)",
    description:
      "Setting the right escalation triggers is what separates a helpful AI support agent from an annoying one. Here are the signals, thresholds, and rules that work.",
    category: "Strategy",
    datePublished: "2026-07-01",
    author: "AgentDesk Team",
    readingTime: "6 min read",
    excerpt:
      "Confidence drops, sentiment shifts, repeat questions, and policy triggers — the signals that tell your AI support agent when to hand off to a human.",
    cluster: "human-handoff",
  },
  {
    slug: "ai-human-blend-support",
    title: "The AI + Human Blend: Why Hybrid Support Outperforms Either Alone",
    description:
      "Hybrid support — AI for volume, humans for judgment — consistently beats pure-AI or pure-human setups on CSAT, cost, and resolution time. Here's the model.",
    category: "Strategy",
    datePublished: "2026-07-01",
    author: "AgentDesk Team",
    readingTime: "7 min read",
    excerpt:
      "The blended support model: AI deflects the repetitive 70%, humans own the complex 30%, and the handoff between them preserves full context. Here's why it wins.",
    cluster: "human-handoff",
  },
];

/* -------------------------------------------------------------------------- */
/* Cluster C — Comparison / alternatives pages                                */
/* -------------------------------------------------------------------------- */

export const comparisonPages: ComparisonPageMeta[] = [
  {
    slug: "chatbase",
    competitor: "Chatbase",
    title: "Chatbase Alternative: Why Teams Switch to AgentDesk",
    description:
      "An honest Chatbase vs AgentDesk comparison — RAG grounding, human handoff, embed options, pricing, and when Chatbase is actually the better pick.",
    datePublished: "2026-07-01",
    competitorPrice: "$19/mo",
  },
  {
    slug: "docsbot",
    competitor: "DocsBot",
    title: "DocsBot Alternative: Why Teams Switch to AgentDesk",
    description:
      "An honest DocsBot vs AgentDesk comparison — retrieval quality, human handoff, developer experience, pricing, and when DocsBot is actually the better pick.",
    datePublished: "2026-07-01",
    competitorPrice: "$49/mo",
  },
  {
    slug: "sitegpt",
    competitor: "SiteGPT",
    title: "SiteGPT Alternative: Why Teams Switch to AgentDesk",
    description:
      "An honest SiteGPT vs AgentDesk comparison — RAG architecture, embed flexibility, human handoff, pricing, and when SiteGPT is actually the better pick.",
    datePublished: "2026-07-01",
    competitorPrice: "$49/mo",
  },
];

/* -------------------------------------------------------------------------- */
/* Cluster D — Developer docs (MDX migration)                                 */
/* -------------------------------------------------------------------------- */

export const docPages: DocPageMeta[] = [
  {
    slug: "quickstart",
    title: "AgentDesk Quickstart — Live Widget in Under 30 Minutes",
    description:
      "The shortest path from an empty agent to a working, embedded support widget. Five steps: create the agent, add knowledge, customize, deploy, and verify.",
    category: "start",
    datePublished: "2026-07-01",
    readingTime: "8 min read",
    excerpt:
      "Create an agent, upload knowledge, customize the widget, paste one snippet, and open the live preview. Your support widget, live in 30 minutes.",
  },
  {
    slug: "embed-widget",
    title: "Embed the AgentDesk Widget (Script, Iframe, React, Vue)",
    description:
      "Every way to install the AgentDesk support widget on a website: floating script tag, inline iframe, React/Next.js component, and Vue plugin.",
    category: "deploy",
    datePublished: "2026-07-01",
    readingTime: "6 min read",
    excerpt:
      "Choose your install path: a floating launcher script for marketing sites, an inline iframe for support pages, or the React/Vue SDK for app shells.",
  },
  {
    slug: "react-sdk",
    title: "AgentDesk React & Next.js SDK Reference",
    description:
      "The @agentdeskbot/react package: SSR-safe component, props, the /nextjs subpath, and how to mount the widget once across an App Router layout.",
    category: "deploy",
    datePublished: "2026-07-01",
    readingTime: "5 min read",
    excerpt:
      "Install @agentdeskbot/react, mount the widget once in your root layout, and keep the launcher persistent across Next.js App Router route changes.",
  },
  {
    slug: "api-reference",
    title: "AgentDesk API Reference — Chat, Config & Ingestion Endpoints",
    description:
      "The public HTTP contracts used by the AgentDesk widget and chat runtime: chat message, widget config, document upload, and URL ingestion endpoints.",
    category: "api",
    datePublished: "2026-07-01",
    readingTime: "10 min read",
    excerpt:
      "Every public AgentDesk endpoint with method, path, auth level, and request/response shapes for the chat runtime and document ingestion.",
  },
  {
    slug: "handoff-api",
    title: "Human Handoff API — Session Escalation & Operator Inbox",
    description:
      "How a customer session moves from the AI agent into the operator inbox: the handoff token, session preservation, and the real-time message contract.",
    category: "api",
    datePublished: "2026-07-01",
    readingTime: "7 min read",
    excerpt:
      "The handoff token endpoint, session-scoped escalation, and the real-time message contract that keeps customer, bot, and operator on one conversation thread.",
  },
];

/* -------------------------------------------------------------------------- */
/* Feature pages                                                              */
/* -------------------------------------------------------------------------- */

export const featurePages: FeaturePageMeta[] = [
  {
    slug: "human-handoff",
    title: "Human Handoff — When AI Knows It Should Stop",
    description:
      "AgentDesk's human handoff pauses automation, transfers the full transcript to a live operator, and keeps the customer on the same chat surface. No context lost.",
    datePublished: "2026-07-01",
    excerpt:
      "Live agent takeover with full context preservation: automation pauses, the transcript and session token move to the operator inbox, and replies land back in the customer's widget.",
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Get a blog post's metadata by slug. Returns undefined if not found. */
export function getBlogPost(slug: string): BlogPostMeta | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

/** Get a doc page's metadata by slug. Returns undefined if not found. */
export function getDocPage(slug: string): DocPageMeta | undefined {
  return docPages.find((doc) => doc.slug === slug);
}

/** All public content routes for the sitemap, derived from the manifests. */
export function getAllContentRoutes(): Array<{ path: string; lastModified: string }> {
  const routes: Array<{ path: string; lastModified: string }> = [
    { path: "/ai-support-agent", lastModified: SITE_PUBLISH_DATE },
    { path: "/blog", lastModified: SITE_PUBLISH_DATE },
    ...featurePages.map((f) => ({
      path: `/features/${f.slug}`,
      lastModified: f.datePublished,
    })),
    ...blogPosts.map((post) => ({
      path: `/blog/${post.slug}`,
      lastModified: post.dateModified ?? post.datePublished,
    })),
    ...comparisonPages.map((c) => ({
      path: `/alternatives/${c.slug}`,
      lastModified: c.datePublished,
    })),
    ...docPages.map((doc) => ({
      path: `/docs/${doc.slug}`,
      lastModified: doc.datePublished,
    })),
  ];
  return routes;
}

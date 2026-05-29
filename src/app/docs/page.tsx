"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Inbox,
  Layers,
  Palette,
  Search,
  Settings,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";

type DocCategory = "Getting Started" | "Knowledge & Ingestion" | "Widget Embed" | "Developer API";
type SandboxMode = "launcher" | "inline";

type DocSection = {
  id: string;
  title: string;
  category: DocCategory;
  content: React.ReactNode;
};

type CopyButtonProps = {
  copied: boolean;
  onCopy: () => void;
};

const categories: DocCategory[] = ["Getting Started", "Knowledge & Ingestion", "Widget Embed", "Developer API"];

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSection, setActiveSection] = useState<string>("introduction");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sandboxBotId, setSandboxBotId] = useState<string>("6a160c5a00212e6e9da0");
  const [sandboxTheme, setSandboxTheme] = useState<string>("webchat-v1");
  const [sandboxMode, setSandboxMode] = useState<SandboxMode>("launcher");

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const sandboxSnippets = useMemo(() => {
    const host = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return {
      script: `<script
  src="${host}/widget.js"
  data-bot-id="${sandboxBotId}"
  data-theme="${sandboxTheme}"
  data-mode="launcher"
  async
></script>`,
      iframe: `<iframe
  src="${host}/embed/${sandboxBotId}?theme=${sandboxTheme}"
  title="AgentDesk Support"
  style="width: 100%; height: 640px; border: 0;"
></iframe>`,
    };
  }, [sandboxBotId, sandboxTheme]);

  const docSections = useMemo<DocSection[]>(
    () => [
      {
        id: "introduction",
        title: "Introduction",
        category: "Getting Started",
        content: (
          <div className="space-y-6">
            <p className="text-lg leading-8 text-muted-foreground">
              AgentDesk is a developer-facing support platform for grounding AI answers in your own knowledge base, embedding WebChat on customer sites, and routing escalations into a live operator inbox.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureCard
                icon={<Bot aria-hidden="true" className="h-6 w-6 text-primary" />}
                title="Agent Studio"
                text="Configure the bot identity, support brief, fallback behavior, and tenant-scoped instructions."
              />
              <FeatureCard
                icon={<Inbox aria-hidden="true" className="h-6 w-6 text-accent" />}
                title="Live Inbox"
                text="Watch conversations, pause automation, and reply as a human operator without losing context."
              />
              <FeatureCard
                icon={<FileText aria-hidden="true" className="h-6 w-6 text-emerald-400" />}
                title="Knowledge Base"
                text="Upload PDFs, DOCX files, CSVs, text, Markdown, and URLs for retrieval-grounded answers."
              />
              <FeatureCard
                icon={<Workflow aria-hidden="true" className="h-6 w-6 text-indigo-400" />}
                title="WebChat Embed"
                text={
                  <>
                    Ship a Shadow DOM widget with a single <code>&lt;script&gt;</code> tag, or use an <code>&lt;iframe&gt;</code> on dedicated support pages.
                  </>
                }
              />
            </div>
          </div>
        ),
      },
      {
        id: "quickstart",
        title: "Quickstart Guide",
        category: "Getting Started",
        content: (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              The fastest path mirrors modern WebChat products: configure the bot, publish the widget settings, then paste the generated snippet into your site.
            </p>
            <ol className="space-y-4 pl-5 text-sm font-semibold leading-7 text-muted-foreground">
              <li>
                <strong className="text-foreground">Create or select a bot.</strong> Use the Bots page to create a tenant-scoped bot and copy its Bot ID.
              </li>
              <li>
                <strong className="text-foreground">Add source material.</strong> Upload documents or ingest URLs so answers can be grounded in retrieved context.
              </li>
              <li>
                <strong className="text-foreground">Configure WebChat.</strong> In WebChat, set identity, appearance, deploy settings, feature toggles, and optional custom launcher icon.
              </li>
              <li>
                <strong className="text-foreground">Embed the snippet.</strong> Use launcher mode for a floating button or iframe mode for a fixed support surface.
              </li>
            </ol>
            <Note title="Local testing">
              During local development, use the sandbox below to generate snippets against your current origin. For static HTML test pages, serve the file over HTTP instead of opening it directly from disk.
            </Note>
          </div>
        ),
      },
      {
        id: "webchat-configuration",
        title: "WebChat Configuration",
        category: "Widget Embed",
        content: (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              AgentDesk follows the same dashboard mental model as mature WebChat systems: identity, appearance, deploy settings, and feature toggles are configured before publishing the embed.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <FeatureCard icon={<Bot aria-hidden="true" className="h-5 w-5 text-primary" />} title="Bot Identity" text="Bot name, avatar URL, and the short customer-facing operating description." />
              <FeatureCard icon={<Palette aria-hidden="true" className="h-5 w-5 text-accent" />} title="Bot Appearance" text="Header, background, text, bubble colors, typography, custom CSS, and custom launcher icon controls." />
              <FeatureCard icon={<Settings aria-hidden="true" className="h-5 w-5 text-success" />} title="Deploy Settings" text="Bot ID, version tag, theme token, rollout posture, and whether customers use launcher or embedded mode." />
              <FeatureCard icon={<Layers aria-hidden="true" className="h-5 w-5 text-indigo-400" />} title="Feature Toggles" text="Voice, transcript export, file uploads, human handoff, and source citation behavior." />
            </div>
            <Note title="Custom launcher icon">
              In WebChat &gt; Bot Appearance, enable <strong>Use custom launcher icon</strong> and provide a public image URL. The widget config API exposes this as <code>useCustomIcon</code> and <code>widgetIconUrl</code>.
            </Note>
          </div>
        ),
      },
      {
        id: "knowledge-base",
        title: "Knowledge Ingestion & RAG",
        category: "Knowledge & Ingestion",
        content: (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              AgentDesk uses retrieval-augmented generation so bot replies can cite tenant-owned support material instead of relying on generic model memory.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Documents" value="PDF, DOCX, TXT, MD" />
              <StatCard label="Tables" value="CSV" />
              <StatCard label="Storage" value="Appwrite + Qdrant" />
            </div>
            <CodeBlock
              id="rag-flow"
              label="Grounding flow"
              copiedId={copiedId}
              value={`1. Customer asks: "How can I return my order?"
2. AgentDesk searches tenant documents in Qdrant.
3. Matching policy chunks are injected into the answer prompt.
4. The bot responds from retrieved support context.
5. If needed, the customer can be escalated to a human operator.`}
              onCopy={copyToClipboard}
            />
          </div>
        ),
      },
      {
        id: "widget-embedding",
        title: "Widget Embedding Modes",
        category: "Widget Embed",
        content: (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Use launcher mode for the standard floating WebChat button. Use iframe mode when the chat should live inside a dedicated page section.
            </p>

            <h3 className="text-xl font-bold text-foreground">Launcher mode</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Paste this before the closing <code>&lt;/body&gt;</code> tag. The widget mounts into Shadow DOM so host page CSS does not leak into the chat UI.
            </p>
            <CodeBlock
              id="script-embed-basic"
              label="Script launcher"
              copiedId={copiedId}
              value={`<!-- Paste inside your HTML body -->
<script
  src="https://agentdeskbot.vercel.app/widget.js"
  data-bot-id="YOUR_BOT_ID"
  data-theme="webchat-v1"
  data-mode="launcher"
  async
></script>`}
              onCopy={copyToClipboard}
            />

            <h3 className="text-xl font-bold text-foreground">Inline iframe mode</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Use this for help centers, support pages, or any layout where the chat panel should be visible without a floating launcher.
            </p>
            <CodeBlock
              id="iframe-embed-basic"
              label="Iframe embed"
              copiedId={copiedId}
              value={`<iframe
  src="https://agentdeskbot.vercel.app/embed/YOUR_BOT_ID?theme=webchat-v1"
  title="AgentDesk Support"
  style="width: 100%; height: 640px; border: 0;"
></iframe>`}
              onCopy={copyToClipboard}
            />
          </div>
        ),
      },
      {
        id: "programmatic-controls",
        title: "Programmatic Controls",
        category: "Widget Embed",
        content: (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              The launcher script registers an <code>&lt;agentdesk-widget&gt;</code> custom element. Host pages can query it and call public methods such as <code>toggle()</code>.
            </p>
            <CodeBlock
              id="programmatic-js"
              label="Custom host button"
              copiedId={copiedId}
              value={`<!-- Button on your host page -->
<button onclick="toggleWidget()">Support Chat</button>

<script>
function toggleWidget() {
  const widget = document.querySelector('agentdesk-widget');
  if (widget) {
    widget.toggle();
  }
}
</script>`}
              onCopy={copyToClipboard}
            />
          </div>
        ),
      },
      {
        id: "live-handoff",
        title: "Real-time Live Handoff",
        category: "Developer API",
        content: (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              When human handoff is enabled, AgentDesk connects customer sessions to the Socket.io service so operators can watch and respond in real time.
            </p>
            <ul className="list-disc space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
              <li>
                <strong className="text-foreground">Namespace:</strong> widgets connect under <code>/tenant-[tenantId]</code>.
              </li>
              <li>
                <strong className="text-foreground">Customer event:</strong> customer messages are emitted as <code>customer-message</code>.
              </li>
              <li>
                <strong className="text-foreground">Agent event:</strong> operator replies arrive in the widget as <code>agent-message</code>.
              </li>
              <li>
                <strong className="text-foreground">Endpoint:</strong> production URLs should be exposed through <code>NEXT_PUBLIC_WEBSOCKET_URL</code>.
              </li>
            </ul>
            <Note title="Development server">
              Run the WebSocket service with <code>npm run dev:ws</code> when testing live inbox behavior locally.
            </Note>
          </div>
        ),
      },
      {
        id: "api-reference",
        title: "API Reference",
        category: "Developer API",
        content: (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              The public widget uses two server contracts: a config endpoint for rendering and a chat endpoint for sending customer messages.
            </p>
            <CodeBlock
              id="chat-payload"
              label="POST /api/chat/message"
              copiedId={copiedId}
              value={`{
  "bot_id": "6a160c5a00212e6e9da0",
  "tenant_id": "tenant-demo",
  "session_token": "ad_8aef2_3a",
  "message": "Can you check order #1892?"
}`}
              onCopy={copyToClipboard}
            />
            <CodeBlock
              id="widget-config-response"
              label="GET /api/widget/config/[botId]"
              copiedId={copiedId}
              value={`{
  "success": true,
  "data": {
    "botId": "6a160c5a00212e6e9da0",
    "tenantId": "tenant-demo",
    "botName": "AgentDesk Support",
    "greeting": "Hello. How can I help you?",
    "logoUrl": null,
    "useCustomIcon": true,
    "widgetIconUrl": "https://agentdeskbot.vercel.app/custom-icon.png",
    "theme": {
      "headerHsl": "224 20% 18%",
      "backgroundHsl": "224 25% 12%"
    }
  }
}`}
              onCopy={copyToClipboard}
            />
          </div>
        ),
      },
    ],
    [copiedId],
  );

  const filteredSections = docSections.filter((section) => {
    const searchLower = searchQuery.toLowerCase().trim();
    return (
      section.title.toLowerCase().includes(searchLower) ||
      section.category.toLowerCase().includes(searchLower) ||
      section.id.toLowerCase().includes(searchLower)
    );
  });

  const activeSectionData = docSections.find((section) => section.id === activeSection) ?? docSections[0];

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-background text-foreground">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground" href="#docs-content">
        Skip to Content
      </a>
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-4 backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link className="flex items-center gap-2 font-bold text-foreground transition hover:text-primary" href="/">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            <span>AgentDesk</span>
          </Link>
          <span className="text-border">/</span>
          <span className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
            <BookOpen aria-hidden="true" className="h-4 w-4 text-primary" />
            Developer Docs
          </span>
        </div>
        <Link className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground transition hover:text-foreground" href="/login">
          Sign In
        </Link>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-6 sm:px-5 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] lg:py-8">
        <aside className="min-w-0 space-y-6">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <input
              aria-label="Search documentation"
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-card/50 py-2.5 pl-10 pr-4 text-sm font-semibold text-foreground transition focus:border-primary focus:bg-card"
              name="docs-search"
              placeholder="Search documentation..."
              spellCheck={false}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <nav className="space-y-6" aria-label="Documentation sections">
            {categories.map((category) => {
              const categorySections = filteredSections.filter((section) => section.category === category);
              if (categorySections.length === 0) {
                return null;
              }

              return (
                <div className="space-y-2" key={category}>
                  <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground/70">{category}</h2>
                  <ul className="space-y-1">
                    {categorySections.map((section) => (
                      <li key={section.id}>
                        <button
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold transition ${
                            activeSection === section.id
                              ? "border-l-2 border-primary bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-card/30 hover:text-foreground"
                          }`}
                          type="button"
                          onClick={() => setActiveSection(section.id)}
                        >
                          <span>{section.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-10" id="docs-content">
          <article className="studio-surface relative overflow-hidden rounded-xl border border-border p-6 sm:p-8">
            <Terminal aria-hidden="true" className="absolute right-4 top-4 h-32 w-32 text-primary opacity-10" />
            <span className="studio-kicker text-primary">{activeSectionData.category}</span>
            <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-4xl">{activeSectionData.title}</h1>
            <div className="mt-8 leading-relaxed text-foreground">{activeSectionData.content}</div>
          </article>

          <section className="studio-surface rounded-xl border border-border p-6 sm:p-8">
            <span className="studio-kicker flex items-center gap-2 text-accent">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              Interactive Tool
            </span>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-foreground">Embed Code Generator</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Enter your Bot ID and theme token, then copy the launcher script or inline iframe snippet.
            </p>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="space-y-4 sm:border-r sm:border-border/40 sm:pr-6">
                <SandboxInput label="Bot ID" value={sandboxBotId} onChange={setSandboxBotId} />
                <SandboxInput label="Theme token" value={sandboxTheme} onChange={setSandboxTheme} />
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Layout mode</label>
                  <div className="grid gap-2 sm:flex">
                    <ModeButton active={sandboxMode === "launcher"} label="Launcher mode" onClick={() => setSandboxMode("launcher")} />
                    <ModeButton active={sandboxMode === "inline"} label="Inline mode" onClick={() => setSandboxMode("inline")} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4">
                <CodeBlock
                  id={sandboxMode === "launcher" ? "sandbox-script" : "sandbox-iframe"}
                  label={sandboxMode === "launcher" ? "widget script" : "iframe embed"}
                  copiedId={copiedId}
                  value={sandboxMode === "launcher" ? sandboxSnippets.script : sandboxSnippets.iframe}
                  onCopy={copyToClipboard}
                />
                <div className="rounded-lg border border-accent/10 bg-accent/5 p-3 text-xs leading-5 text-muted-foreground">
                  <strong className="text-foreground">Notice:</strong> Custom launcher icons configured in WebChat Bot Appearance load automatically through the widget config API.
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <footer className="mt-12 border-t border-border bg-card/30 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 text-center text-xs text-muted-foreground sm:flex-row">
          <p>(c) 2026 AgentDesk. Built for auditable, human-in-the-loop AI support.</p>
          <div className="flex gap-4">
            <Link className="transition hover:text-foreground" href="/">
              Platform
            </Link>
            <Link className="transition hover:text-foreground" href="/webchat">
              WebChat
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 transition hover:border-primary/30">
      <div className="mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/30 p-4 text-center">
      <strong className="mb-1 block text-foreground">{label}</strong>
      <span className="text-xs font-semibold text-muted-foreground">{value}</span>
    </div>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-r-xl border-l-4 border-primary bg-primary/5 p-4">
      <div className="flex gap-3">
        <ExternalLink aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h4 className="font-bold text-foreground">{title}</h4>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{children}</p>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ copied, onCopy }: CopyButtonProps) {
  return (
    <button className="flex items-center gap-1.5 font-medium transition hover:text-foreground" type="button" onClick={onCopy}>
      {copied ? (
        <>
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-400" />
          <span aria-live="polite" className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function CodeBlock({
  id,
  label,
  value,
  copiedId,
  onCopy,
}: {
  id: string;
  label: string;
  value: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black">
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-2 font-mono text-xs text-muted-foreground">
        <span>{label}</span>
        <CopyButton copied={copiedId === id} onCopy={() => onCopy(value, id)} />
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-foreground">{value}</pre>
    </div>
  );
}

function SandboxInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <input
        autoComplete="off"
        className="w-full rounded-lg border border-border bg-card/60 px-3 py-2 font-mono text-sm text-foreground transition focus:border-accent focus:bg-card"
        name={label.toLowerCase().replace(/\s+/g, "-")}
        spellCheck={false}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`min-h-10 flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition ${
        active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground"
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

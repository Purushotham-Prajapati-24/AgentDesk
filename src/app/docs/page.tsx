"use client";

import React, { useCallback, useMemo, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

type DocCategory = "start" | "configure" | "deploy" | "api";
type DeploymentMode = "script" | "iframe" | "react" | "vue";

type DocSection = {
  id: string;
  title: string;
  summary: string;
  category: DocCategory;
  content: React.ReactNode;
};

type CopyButtonProps = {
  copied: boolean;
  onCopy: () => void;
};

const categories: Array<{
  id: DocCategory;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { id: "start", label: "Start", description: "Product shape and first setup path.", icon: BookOpen },
  { id: "configure", label: "Configure", description: "Knowledge and WebChat customization.", icon: Settings },
  { id: "deploy", label: "Deploy", description: "Script, iframe, React, and Vue installs.", icon: Workflow },
  { id: "api", label: "API", description: "Widget controls, handoff, and contracts.", icon: Terminal },
];

const deploymentModes: Array<{
  id: DeploymentMode;
  label: string;
  hint: string;
}> = [
  { id: "script", label: "Script", hint: "Floating launcher for any website." },
  { id: "iframe", label: "Iframe", hint: "Inline support panel inside a page." },
  { id: "react", label: "React / Next.js", hint: "App shell install using next/script." },
  { id: "vue", label: "Vue", hint: "Vue component that injects the launcher." },
];

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSection, setActiveSection] = useState<string>("introduction");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sandboxBotId, setSandboxBotId] = useState<string>("6a160c5a00212e6e9da0");
  const [sandboxTheme, setSandboxTheme] = useState<string>("webchat-v1");
  const [sandboxMode, setSandboxMode] = useState<DeploymentMode>("script");
  const [snippetHost] = useState<string>(() =>
    typeof window === "undefined" ? "https://agentdeskbot.vercel.app" : window.location.origin,
  );

  const copyToClipboard = useCallback((text: string, id: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const sandboxSnippets = useMemo<Record<DeploymentMode, string>>(() => {
    return {
      script: `<script
  src="${snippetHost}/widget.js"
  data-bot-id="${sandboxBotId}"
  data-theme="${sandboxTheme}"
  data-mode="launcher"
  async
></script>`,
      iframe: `<iframe
  src="${snippetHost}/embed/${sandboxBotId}?theme=${sandboxTheme}"
  title="AgentDesk Support"
  style="width: 100%; height: 640px; border: 0;"
></iframe>`,
      react: `import Script from "next/script";

export function AgentDeskWidget() {
  return (
    <Script
      src="${snippetHost}/widget.js"
      strategy="afterInteractive"
      data-bot-id="${sandboxBotId}"
      data-theme="${sandboxTheme}"
      data-mode="launcher"
    />
  );
}`,
      vue: `<template>
  <div />
</template>

<script setup>
import { onMounted } from "vue";

onMounted(() => {
  const script = document.createElement("script");
  script.src = "${snippetHost}/widget.js";
  script.async = true;
  script.dataset.botId = "${sandboxBotId}";
  script.dataset.theme = "${sandboxTheme}";
  script.dataset.mode = "launcher";
  document.body.appendChild(script);
});
</script>`,
    };
  }, [sandboxBotId, sandboxTheme, snippetHost]);

  const docSections = useMemo<DocSection[]>(
    () => [
      {
        id: "introduction",
        title: "Overview",
        summary: "How AgentDesk turns trusted support content into an embeddable AI support surface.",
        category: "start",
        content: (
          <div className="space-y-6">
            <p className="max-w-3xl text-base font-medium leading-7 text-[var(--ui-muted)]">
              AgentDesk is a developer-facing support platform for grounding customer answers in tenant knowledge, embedding WebChat on websites, and preserving context when a human operator takes over.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <CapabilityRow
                icon={<FileText aria-hidden="true" className="h-5 w-5" />}
                title="Train"
                text="Upload documents, tables, Markdown, text files, and public URLs into the selected agent workspace."
              />
              <CapabilityRow
                icon={<Palette aria-hidden="true" className="h-5 w-5" />}
                title="Configure"
                text="Control identity, appearance, header styling, message input styling, and customer-facing feature toggles."
              />
              <CapabilityRow
                icon={<Workflow aria-hidden="true" className="h-5 w-5" />}
                title="Embed"
                text="Install the launcher with a script, place an iframe, or mount from React, Next.js, or Vue apps."
              />
              <CapabilityRow
                icon={<Inbox aria-hidden="true" className="h-5 w-5" />}
                title="Operate"
                text="Watch customer sessions, route handoff, and reply from the live inbox without losing conversation state."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <DocMetric label="Runtime" value="Widget + iframe" />
              <DocMetric label="Knowledge" value="Appwrite + Qdrant" />
              <DocMetric label="Handoff" value="Socket.io" />
            </div>
          </div>
        ),
      },
      {
        id: "quickstart",
        title: "Quickstart",
        summary: "The shortest path from an empty agent to a working support widget.",
        category: "start",
        content: (
          <div className="space-y-5">
            <p className="max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">
              The setup path follows the product workflow: choose the agent, add knowledge, tune the chat surface, deploy the snippet, then test the public preview.
            </p>
            <div className="grid gap-3">
              <DocStep number="01" title="Create or select an agent">
                Use the Agents area to create a tenant-scoped bot, then keep its Bot ID available for WebChat and embed snippets.
              </DocStep>
              <DocStep number="02" title="Add source material">
                Upload documents or ingest URLs so the model can answer from retrieved support context instead of generic memory.
              </DocStep>
              <DocStep number="03" title="Customize WebChat">
                Configure identity, appearance, deployment settings, and customer-facing feature toggles from the WebChat page.
              </DocStep>
              <DocStep number="04" title="Deploy one snippet">
                Use Script for a floating launcher, Iframe for a fixed page surface, or framework snippets for app shells.
              </DocStep>
              <DocStep number="05" title="Open live preview">
                Verify the saved agent name, greeting, theme, header, message input, launcher, and handoff behavior before shipping.
              </DocStep>
            </div>
            <DocCallout title="Local testing">
              Serve local HTML test pages over HTTP. Browser security rules can block widget script behavior when a page is opened directly from disk.
            </DocCallout>
          </div>
        ),
      },
      {
        id: "webchat-configuration",
        title: "WebChat Configuration",
        summary: "The dashboard controls that define the final customer chat surface.",
        category: "configure",
        content: (
          <div className="space-y-5">
            <p className="max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">
              WebChat settings are grouped the same way operators work: identity first, visual polish second, deployment posture third, and optional customer capabilities last.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <CapabilityRow
                icon={<Bot aria-hidden="true" className="h-5 w-5" />}
                title="Bot Identity"
                text="Bot name, avatar URL, and the short customer-facing operating description."
              />
              <CapabilityRow
                icon={<Palette aria-hidden="true" className="h-5 w-5" />}
                title="Bot Appearance"
                text="Header title, subtitle, background, text, close button color, typography, chat colors, input styling, launcher icon, and custom CSS."
              />
              <CapabilityRow
                icon={<Settings aria-hidden="true" className="h-5 w-5" />}
                title="Deploy Settings"
                text="Bot ID, environment, version tag, rollout strategy, agent ID, and theme ID used by generated snippets."
              />
              <CapabilityRow
                icon={<Layers aria-hidden="true" className="h-5 w-5" />}
                title="Feature Toggles"
                text="Voice, transcript export, file uploads, human handoff, and source citation behavior."
              />
            </div>

            <div className="grid gap-3">
              <DocStep number="A" title="Header controls">
                Set the header title, subtitle, header background, header text colors, close button color, and header font family.
              </DocStep>
              <DocStep number="B" title="Message input controls">
                Set the input placeholder, input background, input text color, placeholder color, border color, and input font family.
              </DocStep>
              <DocStep number="C" title="Custom launcher icon">
                The launcher icon URL is editable only when Use custom launcher icon is enabled. Leave the toggle off to use the default launcher.
              </DocStep>
            </div>
          </div>
        ),
      },
      {
        id: "knowledge-base",
        title: "Knowledge & Ingestion",
        summary: "How uploaded and crawled source material becomes retrievable support context.",
        category: "configure",
        content: (
          <div className="space-y-5">
            <p className="max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">
              AgentDesk uses retrieval-augmented generation so answers can cite tenant-owned support material instead of relying only on model memory.
            </p>

            <div className="grid gap-3 sm:grid-cols-5">
              {["Upload", "Chunk", "Embed", "Retrieve", "Answer"].map((step, index) => (
                <DocMetric key={step} label={`0${index + 1}`} value={step} />
              ))}
            </div>

            <DocCodeBlock
              id="rag-flow"
              label="grounding flow"
              copiedId={copiedId}
              value={`1. Customer asks: "How can I return my order?"
2. AgentDesk searches tenant documents in Qdrant.
3. Matching policy chunks are added to the answer prompt.
4. The bot responds from retrieved support context.
5. If confidence is low, the customer can be escalated to a human operator.`}
              onCopy={copyToClipboard}
            />

            <DocCallout title="Indexing rule">
              Sources are stored and processed against the selected agent. Use the same agent ID in WebChat that you used during upload or URL ingestion.
            </DocCallout>
          </div>
        ),
      },
      {
        id: "widget-embedding",
        title: "Deployment Options",
        summary: "Choose the Script, iframe, React, Next.js, or Vue install path that matches the host website or app shell.",
        category: "deploy",
        content: (
          <div className="space-y-6">
            <DeploymentRow mode="Script" bestFor="Any marketing site, help center, or static HTML page.">
              <ol className="list-decimal space-y-2 pl-5 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                <li>Open the global HTML layout, footer injection field, or site-wide custom code area.</li>
                <li>Paste the script once, directly before the closing body tag.</li>
                <li>Replace the Bot ID and theme token with the values from WebChat deploy settings.</li>
                <li>Load the public page and confirm the launcher does not cover sticky buttons or cookie banners.</li>
              </ol>
              <DocCodeBlock
                id="script-embed-basic"
                label="script install"
                copiedId={copiedId}
                value={`<body>
  <main>...</main>

  <script
    src="https://agentdeskbot.vercel.app/widget.js"
    data-bot-id="YOUR_BOT_ID"
    data-theme="webchat-v1"
    data-mode="launcher"
    async
  ></script>
</body>`}
                onCopy={copyToClipboard}
              />
            </DeploymentRow>

            <DeploymentRow mode="Iframe Embed" bestFor="Support pages where the chat should be visible immediately.">
              <ol className="list-decimal space-y-2 pl-5 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                <li>Place the iframe inside the exact help page section where customers expect support.</li>
                <li>Give the iframe a stable height; 640px is a good desktop starting point.</li>
                <li>Use a full-width responsive wrapper on mobile.</li>
                <li>Compare the iframe against the preview URL for the same bot ID.</li>
              </ol>
              <DocCodeBlock
                id="iframe-embed-basic"
                label="iframe install"
                copiedId={copiedId}
                value={`<section class="support-chat">
  <iframe
    src="https://agentdeskbot.vercel.app/embed/YOUR_BOT_ID?theme=webchat-v1"
    title="AgentDesk Support"
    style="width: 100%; height: 640px; border: 0;"
  ></iframe>
</section>`}
                onCopy={copyToClipboard}
              />
            </DeploymentRow>

            <DeploymentRow mode="React / Next.js" bestFor="App shells where the launcher should persist across routes.">
              <ol className="list-decimal space-y-2 pl-5 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                <li>Create a small widget component instead of repeating the snippet on every page.</li>
                <li>Render it once near the root layout or authenticated app shell.</li>
                <li>Use only public values in the client bundle: Bot ID, theme token, and mode.</li>
                <li>Navigate between routes and confirm only one launcher appears.</li>
              </ol>
              <DocCodeBlock
                id="react-embed-basic"
                label="next/script install"
                copiedId={copiedId}
                value={`import Script from "next/script";

export function SupportWidget() {
  return (
    <Script
      src="https://agentdeskbot.vercel.app/widget.js"
      strategy="afterInteractive"
      data-bot-id="YOUR_BOT_ID"
      data-theme="webchat-v1"
      data-mode="launcher"
    />
  );
}`}
                onCopy={copyToClipboard}
              />
            </DeploymentRow>

            <DeploymentRow mode="Vue" bestFor="Vue apps that need the standard launcher without a framework package.">
              <ol className="list-decimal space-y-2 pl-5 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                <li>Create a small component for the widget script.</li>
                <li>Mount it once in the main layout or root app component.</li>
                <li>Append the script in onMounted so it only runs in the browser.</li>
                <li>Check route changes and hot reload for duplicate launchers during development.</li>
              </ol>
              <DocCodeBlock
                id="vue-embed-basic"
                label="vue install"
                copiedId={copiedId}
                value={`<script setup>
import { onMounted } from "vue";

onMounted(() => {
  const script = document.createElement("script");
  script.src = "https://agentdeskbot.vercel.app/widget.js";
  script.async = true;
  script.dataset.botId = "YOUR_BOT_ID";
  script.dataset.theme = "webchat-v1";
  script.dataset.mode = "launcher";
  document.body.appendChild(script);
});
</script>`}
                onCopy={copyToClipboard}
              />
            </DeploymentRow>
          </div>
        ),
      },
      {
        id: "programmatic-controls",
        title: "Programmatic Controls",
        summary: "Host page controls that can interact with the installed widget element.",
        category: "api",
        content: (
          <div className="space-y-5">
            <p className="max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">
              The launcher script registers one custom element named <code>agentdesk-widget</code>. The current public methods are <code>toggle()</code> and <code>sendMessage(text)</code>.
            </p>
            <DocCodeBlock
              id="programmatic-js"
              label="host page controls"
              copiedId={copiedId}
              value={`<button onclick="toggleSupport()">Support Chat</button>
<button onclick="askShipping()">Ask about shipping</button>

<script>
function getWidget() {
  return document.querySelector("agentdesk-widget");
}

function toggleSupport() {
  getWidget()?.toggle();
}

function askShipping() {
  getWidget()?.sendMessage("Can you explain the shipping policy?");
}
</script>`}
              onCopy={copyToClipboard}
            />
            <DocCallout title="Current method surface">
              Avoid documenting separate open or close calls until they exist on the custom element. Use toggle for launcher visibility today.
            </DocCallout>
          </div>
        ),
      },
      {
        id: "live-handoff",
        title: "Live Handoff",
        summary: "How customer sessions move from automation into the operator inbox.",
        category: "api",
        content: (
          <div className="space-y-5">
            <p className="max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">
              When human handoff is enabled, the widget keeps the session token and emits customer activity to the real-time service so operators can continue the same conversation.
            </p>
            <div className="grid gap-3">
              <DocStep number="01" title="Customer starts in WebChat">
                The widget persists the session token and stores the visible conversation history for the selected bot.
              </DocStep>
              <DocStep number="02" title="Handoff stays tenant-scoped">
                Messages are associated with the bot and tenant from the widget config response.
              </DocStep>
              <DocStep number="03" title="Operator replies in the inbox">
                Live replies arrive back in the widget as operator messages while the customer stays in the same chat surface.
              </DocStep>
            </div>
            <DocCallout title="Development server">
              Run the WebSocket service with the project WebSocket command when testing live inbox behavior locally.
            </DocCallout>
          </div>
        ),
      },
      {
        id: "api-reference",
        title: "API Reference",
        summary: "The public contracts used by the widget and chat runtime.",
        category: "api",
        content: (
          <div className="space-y-5">
            <div className="grid gap-3">
              <EndpointRow method="GET" path="/api/widget/config/[botId]" purpose="Returns saved widget identity, appearance, endpoints, and feature behavior." auth="Public widget read" />
              <EndpointRow method="POST" path="/api/chat/message" purpose="Sends a customer message and returns the generated support reply." auth="Public widget session" />
              <EndpointRow method="POST" path="/api/documents/upload" purpose="Uploads files for tenant-scoped source ingestion." auth="Dashboard session" />
              <EndpointRow method="POST" path="/api/documents/url" purpose="Queues public URLs or sitemaps for source ingestion." auth="Dashboard session" />
            </div>

            <DocCodeBlock
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
            <DocCodeBlock
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
    [copiedId, copyToClipboard],
  );

  const searchLower = searchQuery.toLowerCase().trim();
  const filteredSections = docSections.filter((section) => {
    if (!searchLower) {
      return true;
    }

    const categoryLabel = categories.find((category) => category.id === section.category)?.label ?? section.category;
    return (
      section.title.toLowerCase().includes(searchLower) ||
      section.summary.toLowerCase().includes(searchLower) ||
      categoryLabel.toLowerCase().includes(searchLower) ||
      section.id.toLowerCase().includes(searchLower)
    );
  });

  const activeSectionData = docSections.find((section) => section.id === activeSection) ?? docSections[0];
  const visibleSectionData = filteredSections.find((section) => section.id === activeSection) ?? filteredSections[0] ?? activeSectionData;
  const activeCategory = categories.find((category) => category.id === visibleSectionData.category) ?? categories[0];
  const ActiveCategoryIcon = activeCategory.icon;
  const activeSnippet = sandboxSnippets[sandboxMode];

  return (
    <div className="cockpit-lane flex min-h-screen min-w-0 flex-col bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#0099ff] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#041018]"
        href="#docs-content"
      >
        Skip to Content
      </a>

      <header className="sticky top-0 z-50 border-b border-[var(--ui-border)] bg-[var(--ui-bg)]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-full border border-transparent px-2 text-sm font-semibold text-[var(--ui-muted)] transition hover:border-[var(--ui-border)] hover:bg-[var(--ui-panel)] hover:text-[var(--ui-text)]" href="/">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              AgentDesk
            </Link>
            <span className="hidden h-5 w-px bg-[var(--ui-border)] sm:block" />
            <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 text-sm font-semibold text-[var(--ui-text)]">
              <BookOpen aria-hidden="true" className="h-4 w-4 text-[#0099ff]" />
              Developer Docs
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle variant="cockpit" />
            <Link className="hidden min-h-10 items-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 text-sm font-semibold text-[var(--ui-muted)] transition hover:border-[#0099ff]/60 hover:text-[var(--ui-text)] sm:inline-flex" href="/webchat">
              WebChat
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#0099ff]/25 bg-[radial-gradient(circle_at_18%_18%,rgba(0,153,255,0.28),transparent_26rem),radial-gradient(circle_at_84%_12%,rgba(106,76,245,0.22),transparent_28rem),linear-gradient(135deg,#090909_0%,#111827_48%,#0b1220_100%)] text-[#f8fbff] shadow-[0_24px_70px_rgba(0,153,255,0.12)]">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-7">
            <div className="min-w-0">
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 font-mono text-xs font-semibold uppercase text-[#8bd8ff]">
                Developer cockpit
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.02em] text-[#f8fbff] sm:text-5xl lg:text-6xl">
                Build, embed, and operate AgentDesk support surfaces.
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-[#c8d4df] sm:text-base">
                Configure the agent, connect trusted knowledge, deploy WebChat, and hand off live conversations with one consistent product workflow.
              </p>
            </div>

            <div className="grid content-between gap-4 rounded-[1.5rem] border border-white/15 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <div>
                <p className="font-mono text-xs font-semibold uppercase text-[#8bd8ff]">Docs map</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-[#0099ff]/70 hover:bg-[#0099ff]/10"
                        key={category.id}
                        type="button"
                        onClick={() => {
                          const firstSection = docSections.find((section) => section.category === category.id);
                          if (firstSection) {
                            setActiveSection(firstSection.id);
                          }
                        }}
                      >
                        <Icon aria-hidden="true" className="h-4 w-4 text-[#8bd8ff]" />
                        <p className="mt-2 text-sm font-semibold text-[#f8fbff]">{category.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs font-medium leading-5 text-[#aab7c2]">
                Updated around the same deployment modes and customization controls used by the WebChat workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-5 px-4 pb-8 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8">
        <aside className="min-w-0">
          <div className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]">
            <div className="relative shrink-0">
              <Search aria-hidden="true" className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--ui-muted)]" />
              <input
                aria-label="Search documentation"
                autoComplete="off"
                className="min-h-11 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] py-2.5 pl-10 pr-4 text-sm font-semibold text-[var(--ui-text)] transition placeholder:text-[var(--ui-muted)] focus:border-[#0099ff] focus:bg-[var(--ui-panel-2)]"
                name="docs-search"
                placeholder="Search docs..."
                spellCheck={false}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto space-y-5 pr-1" aria-label="Documentation sections">
              {categories.map((category) => {
                const categorySections = filteredSections.filter((section) => section.category === category.id);
                const Icon = category.icon;

                if (categorySections.length === 0) {
                  return null;
                }

                return (
                  <div className="space-y-2" key={category.id}>
                    <div className="flex items-center gap-2 px-1">
                      <Icon aria-hidden="true" className="h-3.5 w-3.5 text-[#0099ff]" />
                      <h2 className="studio-kicker text-[var(--ui-muted)]">{category.label}</h2>
                    </div>
                    <ul className="space-y-1">
                      {categorySections.map((section) => (
                        <li key={section.id}>
                          <button
                            className={`group flex w-full items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                              visibleSectionData.id === section.id
                                ? "border-[#0099ff]/70 bg-[#0099ff]/10 text-[var(--ui-text)]"
                                : "border-transparent text-[var(--ui-muted)] hover:border-[var(--ui-border)] hover:bg-[var(--ui-panel-2)] hover:text-[var(--ui-text)]"
                            }`}
                            type="button"
                            onClick={() => setActiveSection(section.id)}
                          >
                            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${visibleSectionData.id === section.id ? "bg-[#0099ff]" : "bg-[var(--ui-border)] group-hover:bg-[#0099ff]/70"}`} />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold leading-5">{section.title}</span>
                              <span className="mt-1 line-clamp-2 block text-xs font-medium leading-5 text-[var(--ui-muted)]">{section.summary}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              {filteredSections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                  No docs match this search.
                  <button className="mt-3 block rounded-full bg-[#0099ff] px-3 py-2 text-xs font-semibold text-[#041018]" type="button" onClick={() => setSearchQuery("")}>
                    Clear search
                  </button>
                </div>
              ) : null}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 space-y-5" id="docs-content">
          <article className="overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
            <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="studio-kicker inline-flex items-center gap-2 text-[#0099ff]">
                    <ActiveCategoryIcon aria-hidden="true" className="h-3.5 w-3.5" />
                    {activeCategory.label}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.02em] text-[var(--ui-text)] sm:text-3xl">{visibleSectionData.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">{visibleSectionData.summary}</p>
                </div>
                <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-muted)]">
                  #{visibleSectionData.id}
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {filteredSections.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-[var(--ui-border)] bg-[var(--ui-bg)] p-6 text-center">
                  <Search aria-hidden="true" className="mx-auto h-5 w-5 text-[#0099ff]" />
                  <p className="mt-3 text-base font-semibold text-[var(--ui-text)]">No documentation matches your search.</p>
                  <p className="mt-2 text-sm font-medium text-[var(--ui-muted)]">Try a deployment mode, API path, or WebChat setting name.</p>
                </div>
              ) : (
                visibleSectionData.content
              )}
            </div>
          </article>

          <section className="overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
            <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-5 py-4 sm:px-6">
              <p className="studio-kicker inline-flex items-center gap-2 text-[#0099ff]">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                Interactive tool
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--ui-text)]">Deployment Snippet Generator</h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">
                Enter the public bot ID and theme token, choose the deployment target, then copy the exact snippet for the current host.
              </p>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[320px_minmax(0,1fr)] sm:p-6">
              <div className="space-y-4">
                <DocField label="Bot ID" value={sandboxBotId} onChange={setSandboxBotId} />
                <DocField label="Theme token" value={sandboxTheme} onChange={setSandboxTheme} />
                <div>
                  <label className="studio-kicker mb-2 block text-[var(--ui-muted)]">Deployment mode</label>
                  <div className="grid gap-2">
                    {deploymentModes.map((mode) => (
                      <SnippetModeButton
                        active={sandboxMode === mode.id}
                        hint={mode.hint}
                        key={mode.id}
                        label={mode.label}
                        onClick={() => setSandboxMode(mode.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="min-w-0 space-y-3">
                <DocCodeBlock
                  id={`sandbox-${sandboxMode}`}
                  label={`${deploymentModes.find((mode) => mode.id === sandboxMode)?.label ?? "Snippet"} snippet`}
                  copiedId={copiedId}
                  value={activeSnippet}
                  onCopy={copyToClipboard}
                />
                <div className="rounded-2xl border border-[#0099ff]/25 bg-[#0099ff]/10 p-3 text-xs font-medium leading-5 text-[var(--ui-muted)]">
                  <strong className="text-[var(--ui-text)]">Preview rule:</strong> custom header, message input, launcher icon, and feature toggle changes load through the widget config API for the selected bot.
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <footer className="mt-auto border-t border-[var(--ui-border)] bg-[var(--ui-bg)] py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 text-center text-xs font-medium text-[var(--ui-muted)] sm:flex-row">
          <p>(c) 2026 AgentDesk. Developer documentation for embedded, human-in-the-loop support.</p>
          <div className="flex gap-4">
            <Link className="transition hover:text-[var(--ui-text)]" href="/webchat">
              WebChat
            </Link>
            <Link className="transition hover:text-[var(--ui-text)]" href="/documents">
              Knowledge
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CapabilityRow({ icon, title, text }: { icon: React.ReactNode; title: string; text: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ui-panel-2)] text-[#0099ff]">{icon}</span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[var(--ui-text)]">{title}</h3>
        <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{text}</p>
      </div>
    </div>
  );
}

function DocMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4">
      <p className="studio-kicker text-[#0099ff]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-[var(--ui-text)]">{value}</p>
    </div>
  );
}

function DocStep({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--ui-panel-2)] font-mono text-xs font-semibold text-[#0099ff]">{number}</span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[var(--ui-text)]">{title}</h3>
        <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{children}</p>
      </div>
    </div>
  );
}

function DeploymentRow({ mode, bestFor, children }: { mode: string; bestFor: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-b border-[var(--ui-border)] pb-6 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-[var(--ui-text)]">{mode}</h3>
          <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{bestFor}</p>
        </div>
        <span className="rounded-full border border-[#0099ff]/35 bg-[#0099ff]/10 px-3 py-1 font-mono text-xs font-semibold text-[#0099ff]">
          deploy
        </span>
      </div>
      {children}
    </section>
  );
}

function EndpointRow({ method, path, purpose, auth }: { method: "GET" | "POST"; path: string; purpose: string; auth: string }) {
  const methodClass = method === "GET" ? "border-[#0099ff]/40 bg-[#0099ff]/10 text-[#0099ff]" : "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]";

  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 md:grid-cols-[86px_minmax(0,1fr)_150px] md:items-center">
      <span className={`w-fit rounded-full border px-3 py-1 font-mono text-xs font-semibold ${methodClass}`}>{method}</span>
      <div className="min-w-0">
        <p className="break-all font-mono text-sm font-semibold text-[var(--ui-text)]">{path}</p>
        <p className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{purpose}</p>
      </div>
      <span className="w-fit rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-muted)] md:justify-self-end">
        {auth}
      </span>
    </div>
  );
}

function DocCallout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#0099ff]/25 bg-[#0099ff]/10 p-4">
      <div className="flex gap-3">
        <ExternalLink aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#0099ff]" />
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-[var(--ui-text)]">{title}</h4>
          <div className="mt-1 text-sm font-medium leading-6 text-[var(--ui-muted)]">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ copied, onCopy }: CopyButtonProps) {
  return (
    <button className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 font-medium transition hover:bg-white/5 hover:text-[var(--ui-text)]" type="button" onClick={onCopy}>
      {copied ? (
        <>
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-[#22c55e]" />
          <span aria-live="polite" className="text-[#22c55e]">
            Copied
          </span>
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

function DocCodeBlock({
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
    <div className="overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[#07090b]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-4 py-2 font-mono text-xs text-[var(--ui-muted)]">
        <span className="truncate">{label}</span>
        <CopyButton copied={copiedId === id} onCopy={() => onCopy(value, id)} />
      </div>
      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-[#d6e4ef]">{value}</pre>
    </div>
  );
}

function DocField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="studio-kicker mb-2 block text-[var(--ui-muted)]">{label}</span>
      <input
        autoComplete="off"
        className="min-h-11 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 py-2 font-mono text-sm text-[var(--ui-text)] transition placeholder:text-[var(--ui-muted)] focus:border-[#0099ff] focus:bg-[var(--ui-panel-2)]"
        name={label.toLowerCase().replace(/\s+/g, "-")}
        spellCheck={false}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SnippetModeButton({ active, hint, label, onClick }: { active: boolean; hint: string; label: string; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-2xl border px-3 py-2.5 text-left transition ${
        active ? "border-[#0099ff]/70 bg-[#0099ff]/10 text-[var(--ui-text)]" : "border-[var(--ui-border)] bg-[var(--ui-bg)] text-[var(--ui-muted)] hover:border-[#0099ff]/50 hover:text-[var(--ui-text)]"
      }`}
      type="button"
      onClick={onClick}
    >
      <span className="block text-sm font-semibold">{label}</span>
      <span className="mt-1 block text-xs font-medium leading-5 text-[var(--ui-muted)]">{hint}</span>
    </button>
  );
}

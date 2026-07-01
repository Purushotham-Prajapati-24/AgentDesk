import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  FileText,
  Inbox,
  Layers,
  Package,
  Palette,
  Settings,
  Terminal,
  Workflow,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { breadcrumbSchema, techArticleSchema } from "@/lib/seo/jsonld";
import { SITE_PUBLISH_DATE } from "@/lib/site";
import {
  CapabilityRow,
  DeploymentRow,
  DocCallout,
  DocCodeBlock,
  DocMetric,
  DocStep,
  EndpointRow,
} from "./doc-primitives";
import { DocsExplorer, type DocSectionMeta } from "./DocsExplorer";
import { SnippetGenerator } from "./SnippetGenerator";

/**
 * /docs — Server Component.
 *
 * Every documentation section is rendered as inline JSX in this file so the
 * full text is present in the initial HTML response. This is the single
 * biggest GEO/AEO lever: AI crawlers (GPTBot, PerplexityBot, Claude-Web)
 * and Googlebot now see the complete documentation instead of an empty
 * client-rendered shell. Interactive concerns (search/nav, snippet generator)
 * are isolated into client islands imported below.
 */
export const metadata: Metadata = {
  title: "Developer Docs — Embed, Configure & Operate AgentDesk",
  description:
    "Complete AgentDesk developer documentation: embed the support widget (script, iframe, React, Vue), configure RAG knowledge, integrate human handoff, and use the chat API.",
  alternates: {
    canonical: "/docs",
  },
  openGraph: {
    type: "article",
    title: "AgentDesk Developer Docs — Embed, Configure & Operate",
    description:
      "Embed the support widget, configure RAG knowledge, integrate human handoff, and use the chat API.",
    url: "/docs",
  },
  robots: {
    index: true,
    follow: true,
  },
};

/** Section metadata — passed to the DocsExplorer island for nav rendering. */
const sectionMeta: DocSectionMeta[] = [
  { id: "introduction", title: "Overview", summary: "How AgentDesk turns trusted support content into an embeddable AI support surface.", category: "start" },
  { id: "quickstart", title: "Quickstart", summary: "The shortest path from an empty agent to a working support widget.", category: "start" },
  { id: "webchat-configuration", title: "WebChat Configuration", summary: "The dashboard controls that define the final customer chat surface.", category: "configure" },
  { id: "knowledge-base", title: "Knowledge & Ingestion", summary: "How uploaded and crawled source material becomes retrievable support context.", category: "configure" },
  { id: "widget-embedding", title: "Deployment Options", summary: "Choose the Script, iframe, React, Next.js, or Vue install path.", category: "deploy" },
  { id: "packages", title: "Packages", summary: "The npm packages that ship the AgentDesk widget for each framework.", category: "deploy" },
  { id: "programmatic-controls", title: "Programmatic Controls", summary: "Host page controls that can interact with the installed widget element.", category: "api" },
  { id: "live-handoff", title: "Live Handoff", summary: "How customer sessions move from automation into the operator inbox.", category: "api" },
  { id: "api-reference", title: "API Reference", summary: "The public contracts used by the widget and chat runtime.", category: "api" },
];

const publishedDate = SITE_PUBLISH_DATE;

export default function DocsPage() {
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
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-transparent px-2 text-sm font-semibold text-[var(--ui-muted)] transition hover:border-[var(--ui-border)] hover:bg-[var(--ui-panel)] hover:text-[var(--ui-text)]"
              href="/"
            >
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
            <Link
              className="hidden min-h-10 items-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 text-sm font-semibold text-[var(--ui-muted)] transition hover:border-[#0099ff]/60 hover:text-[var(--ui-text)] sm:inline-flex"
              href="/webchat"
            >
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
              <p className="mt-4 text-xs font-medium text-[#aab7c2]">
                Last updated: {publishedDate} · Maintained by the AgentDesk Team
              </p>
            </div>

            <div className="grid content-between gap-4 rounded-[1.5rem] border border-white/15 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <div>
                <p className="font-mono text-xs font-semibold uppercase text-[#8bd8ff]">Docs map</p>
                <p className="mt-4 text-sm font-medium leading-6 text-[#c8d4df]">
                  Start with Overview, then move through Configure, Deploy, and API sections. Use the search on the left to jump to any topic.
                </p>
              </div>
              <p className="text-xs font-medium leading-5 text-[#aab7c2]">
                Updated around the same deployment modes and customization controls used by the WebChat workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-5 px-4 pb-8 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8">
        <DocsExplorer sections={sectionMeta} />

        <main className="min-w-0 space-y-5" id="docs-content">
          {/* ────────────────────────────────────────────────────────────────
              All documentation sections rendered inline as server HTML.
              Each <section id="..."> is crawlable and links from the nav.
          ──────────────────────────────────────────────────────────────── */}

          <DocSection id="introduction" title="Overview" eyebrow="Start" icon={BookOpen} summary="How AgentDesk turns trusted support content into an embeddable AI support surface.">
            <p className="max-w-3xl text-base font-medium leading-7 text-[var(--ui-muted)]">
              AgentDesk is a developer-facing support platform for grounding customer answers in tenant knowledge, embedding WebChat on websites, and preserving context when a human operator takes over.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <CapabilityRow icon={<FileText aria-hidden="true" className="h-5 w-5" />} title="Train" text="Upload documents, tables, Markdown, text files, and public URLs into the selected agent workspace." />
              <CapabilityRow icon={<Palette aria-hidden="true" className="h-5 w-5" />} title="Configure" text="Control identity, appearance, header styling, message input styling, and customer-facing feature toggles." />
              <CapabilityRow icon={<Workflow aria-hidden="true" className="h-5 w-5" />} title="Embed" text="Install the launcher with a script, place an iframe, or mount from React, Next.js, or Vue apps." />
              <CapabilityRow icon={<Inbox aria-hidden="true" className="h-5 w-5" />} title="Operate" text="Watch customer sessions, route handoff, and reply from the live inbox without losing conversation state." />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <DocMetric label="Runtime" value="Widget + iframe" />
              <DocMetric label="Knowledge" value="Appwrite + Qdrant" />
              <DocMetric label="Handoff" value="Socket.io" />
            </div>
          </DocSection>

          <DocSection id="quickstart" title="Quickstart" eyebrow="Start" icon={BookOpen} summary="The shortest path from an empty agent to a working support widget.">
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
          </DocSection>

          <DocSection id="webchat-configuration" title="WebChat Configuration" eyebrow="Configure" icon={Settings} summary="The dashboard controls that define the final customer chat surface.">
            <p className="max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">
              WebChat settings are grouped the same way operators work: identity first, visual polish second, deployment posture third, and optional customer capabilities last.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <CapabilityRow icon={<Bot aria-hidden="true" className="h-5 w-5" />} title="Bot Identity" text="Bot name, avatar URL, and the short customer-facing operating description." />
              <CapabilityRow icon={<Palette aria-hidden="true" className="h-5 w-5" />} title="Bot Appearance" text="Header title, subtitle, background, text, close button color, typography, chat colors, input styling, launcher icon, and custom CSS." />
              <CapabilityRow icon={<Settings aria-hidden="true" className="h-5 w-5" />} title="Deploy Settings" text="Bot ID, environment, version tag, rollout strategy, agent ID, and theme ID used by generated snippets." />
              <CapabilityRow icon={<Layers aria-hidden="true" className="h-5 w-5" />} title="Feature Toggles" text="Voice, transcript export, file uploads, human handoff, and source citation behavior." />
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
          </DocSection>

          <DocSection id="knowledge-base" title="Knowledge & Ingestion" eyebrow="Configure" icon={Settings} summary="How uploaded and crawled source material becomes retrievable support context.">
            <p className="max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">
              AgentDesk uses retrieval-augmented generation so answers can cite tenant-owned support material instead of relying only on model memory.
            </p>

            <div className="grid gap-3 sm:grid-cols-5">
              {["Upload", "Chunk", "Embed", "Retrieve", "Answer"].map((step, index) => (
                <DocMetric key={step} label={`0${index + 1}`} value={step} />
              ))}
            </div>

            <DocCodeBlockStatic
              label="grounding flow"
              value={`1. Customer asks: "How can I return my order?"
2. AgentDesk searches tenant documents in Qdrant.
3. Matching policy chunks are added to the answer prompt.
4. The bot responds from retrieved support context.
5. If confidence is low, the customer can be escalated to a human operator.`}
            />

            <DocCallout title="Indexing rule">
              Sources are stored and processed against the selected agent. Use the same agent ID in WebChat that you used during upload or URL ingestion.
            </DocCallout>
          </DocSection>

          <DocSection id="widget-embedding" title="Deployment Options" eyebrow="Deploy" icon={Workflow} summary="Choose the Script, iframe, React, Next.js, or Vue install path that matches the host website or app shell.">
            <div className="space-y-6">
              <DeploymentRow mode="Script" bestFor="Any marketing site, help center, or static HTML page.">
                <ol className="list-decimal space-y-2 pl-5 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                  <li>Open the global HTML layout, footer injection field, or site-wide custom code area.</li>
                  <li>Paste the script once, directly before the closing body tag.</li>
                  <li>Replace the Bot ID and theme token with the values from WebChat deploy settings.</li>
                  <li>Load the public page and confirm the launcher does not cover sticky buttons or cookie banners.</li>
                </ol>
                <DocCodeBlockStatic
                  label="script install"
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
                />
              </DeploymentRow>

              <DeploymentRow mode="Iframe Embed" bestFor="Support pages where the chat should be visible immediately.">
                <ol className="list-decimal space-y-2 pl-5 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                  <li>Place the iframe inside the exact help page section where customers expect support.</li>
                  <li>Give the iframe a stable height; 640px is a good desktop starting point.</li>
                  <li>Use a full-width responsive wrapper on mobile.</li>
                  <li>Compare the iframe against the preview URL for the same bot ID.</li>
                </ol>
                <DocCodeBlockStatic
                  label="iframe install"
                  value={`<section class="support-chat">
  <iframe
    src="https://agentdeskbot.vercel.app/embed/YOUR_BOT_ID?theme=webchat-v1"
    title="AgentDesk Support"
    style="width: 100%; height: 640px; border: 0;"
  ></iframe>
</section>`}
                />
              </DeploymentRow>

              <DeploymentRow mode="React / Next.js" bestFor="App shells where the launcher should persist across routes.">
                <ol className="list-decimal space-y-2 pl-5 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                  <li>Create a small widget component instead of repeating the snippet on every page.</li>
                  <li>Render it once near the root layout or authenticated app shell.</li>
                  <li>Use only public values in the client bundle: Bot ID, theme token, and mode.</li>
                  <li>Navigate between routes and confirm only one launcher appears.</li>
                </ol>
                <DocCodeBlockStatic
                  label="next/script install"
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
                />
              </DeploymentRow>

              <DeploymentRow mode="Vue" bestFor="Vue apps that need the standard launcher without a framework package.">
                <ol className="list-decimal space-y-2 pl-5 text-sm font-medium leading-6 text-[var(--ui-muted)]">
                  <li>Create a small component for the widget script.</li>
                  <li>Mount it once in the main layout or root app component.</li>
                  <li>Append the script in onMounted so it only runs in the browser.</li>
                  <li>Check route changes and hot reload for duplicate launchers during development.</li>
                </ol>
                <DocCodeBlockStatic
                  label="vue install"
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
                />
              </DeploymentRow>
            </div>
          </DocSection>

          <DocSection id="packages" title="Packages" eyebrow="Deploy" icon={Workflow} summary="The npm packages that ship the AgentDesk widget for each framework.">
            <p className="max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">
              The AgentDesk widget is published as three npm packages — one per supported framework plus a shared core. Install only the one your framework needs; <code>core</code> is pulled in transitively by the React and Vue SDKs.
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              <CapabilityRow icon={<Package aria-hidden="true" className="h-5 w-5" />} title="@agentdeskbot/core" text="Shared TypeScript types and the widget instance registry. Use when building a custom framework adapter." />
              <CapabilityRow icon={<Package aria-hidden="true" className="h-5 w-5" />} title="@agentdeskbot/react" text="React & Next.js SDK. Includes a /nextjs subpath that is SSR-safe for the Next.js App Router." />
              <CapabilityRow icon={<Package aria-hidden="true" className="h-5 w-5" />} title="@agentdeskbot/vue" text="Vue 3 & Nuxt 3 SDK. Ships a global AgentDeskPlugin so the component can be used without per-file imports." />
            </div>

            <DocCodeBlockStatic
              label="install all packages"
              value={`npm install @agentdeskbot/core@0.1.0 \\
  @agentdeskbot/react@0.1.0 \\
  @agentdeskbot/vue@0.1.0`}
            />

            <DocCallout title="Versioning">
              All three packages share the same version and are released together. Pin them in lockfiles to keep types in sync.
            </DocCallout>
          </DocSection>

          <DocSection id="programmatic-controls" title="Programmatic Controls" eyebrow="API" icon={Terminal} summary="Host page controls that can interact with the installed widget element.">
            <p className="max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">
              The launcher script registers one custom element named <code>agentdesk-widget</code>. The current public methods are <code>toggle()</code> and <code>sendMessage(text)</code>.
            </p>
            <DocCodeBlockStatic
              label="host page controls"
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
            />
            <DocCallout title="Current method surface">
              Avoid documenting separate open or close calls until they exist on the custom element. Use toggle for launcher visibility today.
            </DocCallout>
          </DocSection>

          <DocSection id="live-handoff" title="Live Handoff" eyebrow="API" icon={Terminal} summary="How customer sessions move from automation into the operator inbox.">
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
          </DocSection>

          <DocSection id="api-reference" title="API Reference" eyebrow="API" icon={Terminal} summary="The public contracts used by the widget and chat runtime.">
            <div className="grid gap-3">
              <EndpointRow method="GET" path="/api/widget/config/[botId]" purpose="Returns saved widget identity, appearance, endpoints, and feature behavior." auth="Public widget read" />
              <EndpointRow method="POST" path="/api/chat/message" purpose="Sends a customer message and returns the generated support reply." auth="Public widget session" />
              <EndpointRow method="POST" path="/api/documents/upload" purpose="Uploads files for tenant-scoped source ingestion." auth="Dashboard session" />
              <EndpointRow method="POST" path="/api/documents/url" purpose="Queues public URLs or sitemaps for source ingestion." auth="Dashboard session" />
            </div>

            <DocCodeBlockStatic
              label="POST /api/chat/message"
              value={`{
  "bot_id": "6a160c5a00212e6e9da0",
  "tenant_id": "tenant-demo",
  "session_token": "ad_8aef2_3a",
  "message": "Can you check order #1892?"
}`}
            />
            <DocCodeBlockStatic
              label="GET /api/widget/config/[botId]"
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
            />
          </DocSection>

          {/* Interactive snippet generator — client island. Lives outside
              the section list so it's always visible. */}
          <SnippetGenerator />
        </main>
      </div>

      <footer className="mt-auto border-t border-[var(--ui-border)] bg-[var(--ui-bg)] py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 text-center text-xs font-medium text-[var(--ui-muted)] sm:flex-row">
          <p>© 2026 AgentDesk. Developer documentation for embedded, human-in-the-loop support.</p>
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

      {/* Page-level structured data: BreadcrumbList + TechArticle. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Docs", path: "/docs" },
            ]),
            techArticleSchema({
              headline: "AgentDesk Developer Docs",
              description:
                "Complete AgentDesk developer documentation: embed the support widget, configure RAG knowledge, integrate human handoff, and use the chat API.",
              path: "/docs",
              datePublished: publishedDate,
              authorName: "AgentDesk Team",
            }),
          ]),
        }}
      />
    </div>
  );
}

/** Server-side wrapper for each documentation section — scroll target + heading. */
function DocSection({
  id,
  title,
  eyebrow,
  icon: Icon,
  summary,
  children,
}: {
  id: string;
  title: string;
  eyebrow: string;
  icon: React.ComponentType<{
    "aria-hidden"?: boolean | "true" | "false";
    className?: string;
  }>;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]"
    >
      <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="studio-kicker inline-flex items-center gap-2 text-[#0099ff]">
              <Icon aria-hidden="true" className="h-3.5 w-3.5" />
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.02em] text-[var(--ui-text)] sm:text-3xl">
              {title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">{summary}</p>
          </div>
          <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-muted)]">
            #{id}
          </span>
        </div>
      </div>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

/** Static code block (server-only — no copy button). Used in the documentation
 *  sections where the content is reference material, not interactive. */
function DocCodeBlockStatic({ label, value }: { label: string; value: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[#07090b]">
      <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-4 py-2 font-mono text-xs text-[var(--ui-muted)]">
        <span className="truncate">{label}</span>
      </div>
      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-[#d6e4ef]">
        {value}
      </pre>
    </div>
  );
}

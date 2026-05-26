"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Bot, 
  Braces, 
  BookOpen, 
  Code, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  HelpCircle, 
  Inbox, 
  Layers, 
  Search, 
  Settings, 
  Sparkles, 
  Terminal, 
  Workflow 
} from "lucide-react";

type DocSection = {
  id: string;
  title: string;
  category: "Getting Started" | "Knowledge & Ingestion" | "Widget Embed" | "Developer API";
  content: React.ReactNode;
};

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("introduction");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sandbox State
  const [sandboxBotId, setSandboxBotId] = useState("6a160c5a00212e6e9da0");
  const [sandboxTheme, setSandboxTheme] = useState("webchat-v1");
  const [sandboxMode, setSandboxMode] = useState<"launcher" | "inline">("launcher");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sandboxSnippets = useMemo(() => {
    const host = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return {
      script: `<script\n  src="${host}/widget.js"\n  data-bot-id="${sandboxBotId}"\n  data-theme="${sandboxTheme}"\n  async\n></script>`,
      iframe: `<iframe\n  src="${host}/embed/${sandboxBotId}?theme=${sandboxTheme}"\n  title="AgentDesk Support"\n  style="width: 100%; height: 640px; border: 0;"\n></iframe>`,
    };
  }, [sandboxBotId, sandboxTheme]);

  const docSections: DocSection[] = [
    {
      id: "introduction",
      title: "Introduction",
      category: "Getting Started",
      content: (
        <div className="space-y-6">
          <p className="text-lg leading-8 text-muted-foreground">
            Welcome to the <strong>AgentDesk Developer Center</strong>. AgentDesk is a high-performance orchestration workspace designed to ground AI support agents in verified documents while maintaining a secure, real-time fallback mechanism for human operators.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 mt-6">
            <div className="rounded-xl border border-border bg-card/50 p-5 hover:border-primary/30 transition">
              <Bot className="h-6 w-6 text-primary mb-3" />
              <h3 className="text-lg font-bold text-foreground">Agent Studio</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-6">
                Configure identity, baseline greeting prompts, and fine-tune response rules for tenant-scoped agents.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/50 p-5 hover:border-accent/30 transition">
              <Inbox className="h-6 w-6 text-accent mb-3" />
              <h3 className="text-lg font-bold text-foreground">Live Inbox</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-6">
                Monitor current agent states, pause automation in real-time, and take over the conversation instantly.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/50 p-5 hover:border-emerald-500/30 transition">
              <FileText className="h-6 w-6 text-emerald-400 mb-3" />
              <h3 className="text-lg font-bold text-foreground">Knowledge Base</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-6">
                Ground your support agents with direct uploads of PDF, DOCX, CSV, TXT, or Markdown documents.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/50 p-5 hover:border-indigo-500/30 transition">
              <Workflow className="h-6 w-6 text-indigo-400 mb-3" />
              <h3 className="text-lg font-bold text-foreground">Embed Widget</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-6">
                Embed your custom-styled chat widget on any website using a single optimized <code>&lt;script&gt;</code> tag or standard <code>&lt;iframe&gt;</code>.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "quickstart",
      title: "Quickstart Guide",
      category: "Getting Started",
      content: (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Get an interactive AI support agent live on your website in less than 2 minutes. Follow this step-by-step walkthrough:
          </p>

          <ol className="space-y-6 list-decimal list-inside pl-2">
            <li className="text-foreground font-bold">
              <span className="font-normal text-muted-foreground ml-2">
                Create your Agent in the <strong>Agent Studio</strong> and assign a unique <strong>Bot ID</strong>.
              </span>
            </li>
            <li className="text-foreground font-bold">
              <span className="font-normal text-muted-foreground ml-2">
                Go to the <strong>Knowledge Base</strong>, upload your support articles or policy documents, and let the indexer build your search embeddings.
              </span>
            </li>
            <li className="text-foreground font-bold">
              <span className="font-normal text-muted-foreground ml-2">
                Go to the <strong>WebChat Control Room</strong> to configure colors, choose fonts, and toggle feature settings (e.g. enabling human handoff).
              </span>
            </li>
            <li className="text-foreground font-bold">
              <span className="font-normal text-muted-foreground ml-2">
                Copy the generated snippet from the <strong>Embed Sandbox</strong> below and paste it directly into your HTML document!
              </span>
            </li>
          </ol>

          <div className="mt-6 border-l-4 border-primary bg-primary/5 p-4 rounded-r-xl">
            <div className="flex gap-3">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-foreground">Pro Tip: Local Host Testing</h4>
                <p className="text-sm text-muted-foreground mt-1 leading-6">
                  When testing embeds on your local developer machine, you can run a simple HTTP server (like VS Code Live Server or python -m http.server) to load your pages cleanly.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "knowledge-base",
      title: "Knowledge Ingestion & RAG",
      category: "Knowledge & Ingestion",
      content: (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            AgentDesk utilizes a highly optimized Retrieval-Augmented Generation (RAG) architecture powered by Qdrant vector databases. Instead of responding with generic training context, agents retrieve matching snippets from your uploaded documents to construct fully-grounded support replies.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6">Supported Document Formats</h3>
          <div className="grid gap-3 sm:grid-cols-3 mt-4">
            <div className="border border-border bg-card/30 p-4 rounded-lg text-center">
              <strong className="text-foreground block mb-1">Standard Documents</strong>
              <span className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD</span>
            </div>
            <div className="border border-border bg-card/30 p-4 rounded-lg text-center">
              <strong className="text-foreground block mb-1">Tabular Data</strong>
              <span className="text-xs text-muted-foreground">CSV (perfect for orders/pricing)</span>
            </div>
            <div className="border border-border bg-card/30 p-4 rounded-lg text-center">
              <strong className="text-foreground block mb-1">Automatic Text Extraction</strong>
              <span className="text-xs text-muted-foreground">Pre-processed & chunked in milliseconds</span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-foreground mt-6">How Answers are Grounded</h3>
          <div className="relative border border-border bg-card/25 p-5 rounded-xl font-mono text-sm leading-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 text-xs text-muted-foreground">
              <span>Grounding Flowchart</span>
              <span>Vector Search Context</span>
            </div>
            <div className="space-y-2">
              <div className="text-primary font-bold">1. Customer Query: "How can I return my order?"</div>
              <div className="text-muted-foreground">↓ AgentDesk performs a hybrid vector search on Qdrant...</div>
              <div className="text-emerald-400 font-bold">2. Retrieved Chunk: "policy.pdf: Returns are allowed within 30 days of purchase..."</div>
              <div className="text-muted-foreground">↓ LLM synthesizes response ONLY using the retrieved context...</div>
              <div className="text-foreground font-bold">3. Generated Response: "Based on our policy document, you can return items within 30 days..."</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "widget-embedding",
      title: "Widget Embedding Modes",
      category: "Widget Embed",
      content: (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            The AgentDesk widget can be embedded using two primary modes: <strong>Launcher Mode</strong> (which injects a floating bubble at the bottom-right corner) and <strong>Inline Mode</strong> (which loads the chat console statically inside any section or page layout).
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6">1. Launcher Mode (Recommended)</h3>
          <p className="text-sm text-muted-foreground leading-6">
            Paste this optimized script tag directly before the closing `&lt;/body&gt;` tag of your site. This injects the floating chat button and handles all lifecycle interactions. Shadow DOM encapsulation ensures the widget styles never interfere with your host page styling.
          </p>

          <div className="relative group rounded-xl border border-border bg-black overflow-hidden mt-3">
            <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground font-mono">
              <span>Script launcher</span>
              <button 
                onClick={() => copyToClipboard(`<script src="http://localhost:3000/widget.js" data-bot-id="YOUR_BOT_ID" async></script>`, "script-embed-basic")}
                className="flex items-center gap-1.5 hover:text-foreground font-medium transition"
              >
                {copiedId === "script-embed-basic" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 font-mono text-xs text-foreground overflow-x-auto leading-5">
              {`<!-- Paste inside your HTML body -->
<script
  src="https://YOUR_DOMAIN/widget.js"
  data-bot-id="YOUR_BOT_ID"
  async
></script>`}
            </pre>
          </div>

          <h3 className="text-xl font-bold text-foreground mt-6">2. Inline Mode (Iframe)</h3>
          <p className="text-sm text-muted-foreground leading-6">
            To embed the chat widget as a static block directly within a specific section of your page (e.g., on a dedicated customer support page), use the inline iframe embedding.
          </p>

          <div className="relative group rounded-xl border border-border bg-black overflow-hidden mt-3">
            <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground font-mono">
              <span>Iframe embed</span>
              <button 
                onClick={() => copyToClipboard(`<iframe src="http://localhost:3000/embed/YOUR_BOT_ID" title="Support" style="width:100%;height:640px;border:0"></iframe>`, "iframe-embed-basic")}
                className="flex items-center gap-1.5 hover:text-foreground font-medium transition"
              >
                {copiedId === "iframe-embed-basic" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 font-mono text-xs text-foreground overflow-x-auto leading-5">
              {`<iframe
  src="https://YOUR_DOMAIN/embed/YOUR_BOT_ID"
  title="AgentDesk Support"
  style="width: 100%; height: 640px; border: 0;"
></iframe>`}
            </pre>
          </div>
        </div>
      )
    },
    {
      id: "programmatic-controls",
      title: "Programmatic Controls",
      category: "Widget Embed",
      content: (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            The AgentDesk widget registers itself as an HTML5 Custom Element: <code>&lt;agentdesk-widget&gt;</code>. This exposes native JavaScript controls, allowing you to trigger actions directly from other buttons, forms, or navigation links on your site!
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6">Toggling the Widget via Custom Buttons</h3>
          <p className="text-sm text-muted-foreground leading-6">
            You can call the public <code>.toggle()</code> method directly on the custom element instance.
          </p>

          <div className="relative group rounded-xl border border-border bg-black overflow-hidden mt-3">
            <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground font-mono">
              <span>Interactive HTML / JS</span>
              <button 
                onClick={() => copyToClipboard(`<!-- Button on your host page -->\n<button onclick="toggleWidget()">Support</button>\n\n<script>\nfunction toggleWidget() {\n  const widget = document.querySelector('agentdesk-widget');\n  if (widget) {\n    widget.toggle();\n  }\n}\n</script>`, "programmatic-js")}
                className="flex items-center gap-1.5 hover:text-foreground font-medium transition"
              >
                {copiedId === "programmatic-js" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 font-mono text-xs text-foreground overflow-x-auto leading-5">
              {`<!-- Button on your host page -->
<button onclick="toggleWidget()">Support Chat</button>

<script>
function toggleWidget() {
  const widget = document.querySelector('agentdesk-widget');
  if (widget) {
    widget.toggle(); // programmatically opens/closes the chat pane!
  }
}
</script>`}
            </pre>
          </div>
        </div>
      )
    },
    {
      id: "live-handoff",
      title: "Real-time Live Handoff",
      category: "Developer API",
      content: (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            A key advantage of AgentDesk is the <strong>Human Takeover Protocol</strong>. If the customer specifically requests a human, or if the AI confidence drops, the agent automatically initiates a live handoff socket session.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6">WebSocket Socket.io State</h3>
          <p className="text-sm text-muted-foreground leading-6">
            The widget connects to the background WebSocket server (listening on port <code>4000</code>). When the handoff starts:
          </p>

          <ul className="space-y-3 pl-5 list-disc text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">AI Pause:</strong> The AI engine is paused in-session so it won&apos;t reply over the human operator.
            </li>
            <li>
              <strong className="text-foreground">Socket namespace:</strong> Tunnels customer messages directly into `websocket-server/server.js` namespace <code>/tenant-[tenantId]</code>.
            </li>
            <li>
              <strong className="text-foreground">Operator Handoff Event:</strong> Emitted via <code>customer-message</code> event, notifying human dashboards immediately.
            </li>
          </ul>

          <div className="mt-6 border border-yellow-500/20 bg-yellow-500/5 p-4 rounded-xl">
            <div className="flex gap-3">
              <ExternalLink className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-foreground">WebSocket Endpoint Contract</h4>
                <p className="text-sm text-muted-foreground mt-1 leading-6">
                  The WebSocket service endpoint is served dynamically under `NEXT_PUBLIC_WEBSOCKET_URL`. Make sure your Node.js websocket-server package is running using <code>npm run dev:ws</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "api-reference",
      title: "API Reference",
      category: "Developer API",
      content: (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Integrate with the AgentDesk engine directly via REST. We expose endpoints for messaging and configurations.
          </p>

          <h3 className="text-lg font-bold text-foreground mt-6">1. Post Chat Message</h3>
          <p className="text-xs font-bold text-muted-foreground"><code>POST /api/chat/message</code></p>

          <div className="relative group rounded-xl border border-border bg-black overflow-hidden mt-3">
            <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground font-mono">
              <span>JSON request payload</span>
            </div>
            <pre className="p-4 font-mono text-xs text-foreground overflow-x-auto leading-5">
              {`{
  "bot_id": "6a160c5a00212e6e9da0",
  "tenant_id": "tenant-demo",
  "session_token": "ad_8aef2...3a",
  "message": "Can you check order #1892?"
}`}
            </pre>
          </div>

          <h3 className="text-lg font-bold text-foreground mt-6">2. Retrieve Widget Configuration</h3>
          <p className="text-xs font-bold text-muted-foreground"><code>GET /api/widget/config/[botId]</code></p>

          <div className="relative group rounded-xl border border-border bg-black overflow-hidden mt-3">
            <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground font-mono">
              <span>JSON response payload</span>
            </div>
            <pre className="p-4 font-mono text-xs text-foreground overflow-x-auto leading-5">
              {`{
  "success": true,
  "data": {
    "botId": "6a160c5a00212e6e9da0",
    "tenantId": "tenant-demo",
    "botName": "AgentDesk Support",
    "greeting": "Hello. How can I help you?",
    "logoUrl": null,
    "widgetIconUrl": "https://YOUR_DOMAIN/custom-icon.png",
    "useCustomIcon": true,
    "theme": {
      "headerHsl": "224 20% 18%",
      "backgroundHsl": "224 25% 12%"
    }
  }
}`}
            </pre>
          </div>
        </div>
      )
    }
  ];

  const filteredSections = docSections.filter(section => {
    const searchLower = searchQuery.toLowerCase();
    return (
      section.title.toLowerCase().includes(searchLower) ||
      section.category.toLowerCase().includes(searchLower) ||
      section.id.toLowerCase().includes(searchLower)
    );
  });

  const activeSectionData = docSections.find(s => s.id === activeSection) || docSections[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-foreground hover:text-primary transition">
            <ArrowLeft className="h-4 w-4" />
            <span>AgentDesk</span>
          </Link>
          <span className="text-border">/</span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>Developer Docs</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground transition">
            Sign In to Studio
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 px-6 py-8">
        
        {/* Left Sidebar */}
        <aside className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground focus:bg-card focus:border-primary transition"
            />
          </div>

          <div className="space-y-6">
            {(["Getting Started", "Knowledge & Ingestion", "Widget Embed", "Developer API"] as const).map(category => {
              const categorySections = filteredSections.filter(s => s.category === category);
              if (categorySections.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{category}</h4>
                  <ul className="space-y-1">
                    {categorySections.map(section => (
                      <li key={section.id}>
                        <button
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold leading-normal transition flex items-center justify-between ${
                            activeSection === section.id 
                              ? "bg-primary/10 text-primary border-l-2 border-primary" 
                              : "text-muted-foreground hover:text-foreground hover:bg-card/30"
                          }`}
                        >
                          <span>{section.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Reading Content Pane */}
        <main className="space-y-10">
          
          <article className="studio-surface p-8 rounded-xl border border-border relative overflow-hidden">
            <div className="absolute right-4 top-4 text-primary opacity-10">
              <Terminal className="h-32 w-32" />
            </div>
            
            <span className="studio-kicker text-primary">{activeSectionData.category}</span>
            <h1 className="text-4xl font-extrabold uppercase mt-2 text-foreground tracking-tight">{activeSectionData.title}</h1>
            
            <div className="mt-8 text-foreground leading-relaxed">
              {activeSectionData.content}
            </div>
          </article>

          {/* Interactive Embed Sandbox Playground */}
          <section className="studio-surface p-8 rounded-xl border border-border">
            <span className="studio-kicker text-accent flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Interactive Tool
            </span>
            <h2 className="text-2xl font-black uppercase mt-2 text-foreground tracking-tight">Embed Code Generator</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Paste your Bot ID and customize options to generate a fully optimized script or iframe code snippet instantly.
            </p>

            <div className="grid gap-6 mt-6 sm:grid-cols-2">
              <div className="space-y-4 border-r border-border/40 pr-0 sm:pr-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Bot ID</label>
                  <input 
                    type="text" 
                    value={sandboxBotId}
                    onChange={(e) => setSandboxBotId(e.target.value)}
                    className="w-full bg-card/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:bg-card focus:border-accent transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Theme Token</label>
                  <input 
                    type="text" 
                    value={sandboxTheme}
                    onChange={(e) => setSandboxTheme(e.target.value)}
                    className="w-full bg-card/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:bg-card focus:border-accent transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Layout Mode</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSandboxMode("launcher")}
                      className={`flex-1 py-2 text-sm font-bold border rounded-lg transition ${
                        sandboxMode === "launcher" 
                          ? "bg-accent/10 border-accent text-accent" 
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Launcher mode
                    </button>
                    <button 
                      onClick={() => setSandboxMode("inline")}
                      className={`flex-1 py-2 text-sm font-bold border rounded-lg transition ${
                        sandboxMode === "inline" 
                          ? "bg-accent/10 border-accent text-accent" 
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Inline mode
                    </button>
                  </div>
                </div>
              </div>

              {/* Code Snippet Outputs */}
              <div className="flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Generated Snippet</span>
                  
                  {sandboxMode === "launcher" ? (
                    <div className="relative group rounded-lg border border-border bg-black overflow-hidden">
                      <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-1.5 text-[10px] text-muted-foreground font-mono">
                        <span>widget script</span>
                        <button 
                          onClick={() => copyToClipboard(sandboxSnippets.script, "sandbox-script")}
                          className="flex items-center gap-1 hover:text-foreground transition"
                        >
                          {copiedId === "sandbox-script" ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 font-mono text-[11px] text-foreground overflow-x-auto leading-4">
                        {sandboxSnippets.script}
                      </pre>
                    </div>
                  ) : (
                    <div className="relative group rounded-lg border border-border bg-black overflow-hidden">
                      <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-1.5 text-[10px] text-muted-foreground font-mono">
                        <span>iframe embed</span>
                        <button 
                          onClick={() => copyToClipboard(sandboxSnippets.iframe, "sandbox-iframe")}
                          className="flex items-center gap-1 hover:text-foreground transition"
                        >
                          {copiedId === "sandbox-iframe" ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 font-mono text-[11px] text-foreground overflow-x-auto leading-4">
                        {sandboxSnippets.iframe}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground bg-accent/5 border border-accent/10 p-3 rounded-lg mt-4 leading-5">
                  <strong>Notice:</strong> In script launcher mode, custom launcher icons configured inside the studio will automatically load without code changes!
                </div>
              </div>
            </div>
          </section>

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6 bg-card/30">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AgentDesk. Built for secure, auditable, human-in-the-loop AI support.</p>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-foreground transition">Platform</Link>
            <Link href="/login" className="hover:text-foreground transition">Studio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

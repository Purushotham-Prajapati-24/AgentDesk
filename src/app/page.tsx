import Link from "next/link";
import { ArrowRight, Bot, CreditCard, FileText, Inbox, LockKeyhole, Radio, ShieldCheck, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CodePanel, MetricTile, StatusPill } from "@/components/ui/Signal";
import { DarkVeil } from "@/components/reactbits/DarkVeil";
import { SplitText } from "@/components/reactbits/SplitText";
import { ClickSpark } from "@/components/reactbits/ClickSpark";

const commandLinks = [
  {
    href: "/inbox",
    title: "Live inbox",
    description: "Watch socket state, pause automation, and reply as the human operator.",
    icon: Inbox,
  },
  {
    href: "/bots",
    title: "Agent studio",
    description: "Tune instruction policy, fallbacks, and tenant-scoped support behavior.",
    icon: Bot,
  },
  {
    href: "/documents",
    title: "Knowledge base",
    description: "Upload the source files that ground answers before conversations start.",
    icon: FileText,
  },
  {
    href: "/billing",
    title: "Usage ledger",
    description: "Track credits, message volume, sessions, and storage from one console.",
    icon: CreditCard,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative isolate overflow-hidden border-b border-border px-4 py-5 sm:px-6 lg:px-8">
        <DarkVeil />
        <div className="relative mx-auto grid min-h-[calc(100vh-40px)] max-w-7xl content-between gap-10">
          <nav className="sticky top-4 z-10 flex items-center justify-between gap-4 rounded-xl border border-border bg-background/75 px-3 py-3 backdrop-blur">
            <Link className="flex items-center gap-3 font-bold" href="/">
              <span className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/50 bg-primary/10 text-primary">
                <Radio aria-hidden="true" className="h-5 w-5" />
              </span>
              AgentDesk
            </Link>
            <div className="hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
              <a href="#platform">Platform</a>
              <a href="#security">Security</a>
              <a href="#usage">Usage</a>
            </div>
            <Link href="/login">
              <Button size="sm" variant="outline" rightIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}>
                Enter
              </Button>
            </Link>
          </nav>

          <div className="grid gap-8 pb-8 pt-8 lg:grid-cols-[1fr_430px] lg:items-end">
            <div className="studio-enter">
              <StatusPill tone="hot">Agent orchestration workspace</StatusPill>
              <h1 className="mt-5 max-w-5xl text-[clamp(3.6rem,10vw,8.5rem)] font-bold leading-[0.9]">
                <SplitText text="Build support agents with a human switch." />
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-muted-foreground">
                AgentDesk gives support teams a dark production console for AI agents, knowledge ingestion, live handoff, widget styling,
                and usage control.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ClickSpark>
                  <Link href="/inbox">
                    <Button rightIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}>Open live desk</Button>
                  </Link>
                </ClickSpark>
                <Link href="/webchat">
                  <Button variant="secondary" rightIcon={<Workflow aria-hidden="true" className="h-4 w-4" />}>
                    Shape the widget
                  </Button>
                </Link>
              </div>
            </div>

            <div className="studio-surface rounded-xl p-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <p className="studio-kicker text-muted-foreground">Routing preview</p>
                <StatusPill tone="info">Socket online</StatusPill>
              </div>
              <div className="mt-4 grid gap-3">
                <MetricTile label="Response layer" value="AI + Human" detail="Escalate without losing context" tone="hot" />
                <MetricTile label="Knowledge flow" value="Docs" detail="PDF, DOCX, CSV, TXT, MD" tone="info" />
                <CodePanel title="agent.policy.json">
                  <pre>{`{
  "tenant": "tenant_demo",
  "handoff": "manual-ready",
  "rag": ["policy.pdf", "orders.csv"],
  "fallback": "verified-context-only"
}`}</pre>
                </CodePanel>
              </div>
            </div>
          </div>

          <div id="platform" className="grid gap-3 pb-4 md:grid-cols-4">
            {commandLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link className="rounded-lg border border-border bg-card/85 p-4 transition hover:-translate-y-1 hover:border-primary/70" href={link.href} key={link.href}>
                  <Icon aria-hidden="true" className="h-5 w-5 text-primary" />
                  <h2 className="mt-4 text-lg font-bold leading-tight">{link.title}</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{link.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="security" className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="studio-surface rounded-xl p-6">
          <ShieldCheck aria-hidden="true" className="h-6 w-6 text-primary" />
          <h2 className="mt-4 text-3xl font-bold">Operational trust, visible by default.</h2>
          <p className="mt-3 max-w-2xl font-medium leading-7 text-muted-foreground">
            Every screen is designed around production support realities: source grounding, tenant isolation, human takeover, and
            auditable usage.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Handoff", "Pause AI in-session"],
            ["RAG", "Document-grounded answers"],
            ["Tenant", "Scoped bot configs"],
            ["Widget", "Stable embed contract"],
          ].map(([title, detail]) => (
            <div className="rounded-lg border border-border bg-secondary/50 p-4" key={title}>
              <LockKeyhole aria-hidden="true" className="h-5 w-5 text-accent" />
              <p className="mt-4 font-mono text-2xl font-bold text-foreground">{title}</p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="usage" className="border-t border-border px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-xl border border-primary/30 bg-primary/10 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="studio-kicker text-primary">Ready for the desk</p>
            <h2 className="mt-2 text-3xl font-bold">Start with the live inbox, then tune the agent.</h2>
          </div>
          <Link href="/login">
            <Button rightIcon={<Zap aria-hidden="true" className="h-4 w-4" />}>Access workspace</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { ArrowRight, Bot, CreditCard, FileText, Inbox, Radio, ShieldCheck, Workflow } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MetricTile, StatusPill } from "@/components/ui/Signal";

const commandLinks = [
  {
    href: "/inbox",
    title: "Live inbox",
    description: "Watch the AI handoff line, pause automation, and answer as a human agent.",
    icon: Inbox,
  },
  {
    href: "/bots",
    title: "Bot studio",
    description: "Tune instructions, fallback behavior, and tenant-scoped support personas.",
    icon: Bot,
  },
  {
    href: "/documents",
    title: "Knowledge intake",
    description: "Upload the policies, manuals, and source files that ground support answers.",
    icon: FileText,
  },
  {
    href: "/billing",
    title: "Usage ledger",
    description: "Track credit balance, message volume, sessions, and document storage.",
    icon: CreditCard,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-line">
      <section className="relative overflow-hidden border-b-2 border-line bg-panel-warm px-4 py-5 sm:px-6 lg:px-8">
        <div className="absolute right-4 top-4 hidden border-2 border-line bg-yellow px-3 py-2 font-mono text-xs font-black lg:block">
          SUPPORT SIGNAL / ONLINE
        </div>
        <div className="mx-auto grid min-h-[calc(100vh-40px)] max-w-7xl content-between gap-10">
          <nav className="flex items-center justify-between gap-4">
            <Link className="flex items-center gap-3 font-black" href="/">
              <span className="flex h-11 w-11 items-center justify-center border-2 border-line bg-signal text-white shadow-[4px_4px_0_#17120D]">
                <Radio aria-hidden="true" className="h-5 w-5" />
              </span>
              AgentDesk
            </Link>
            <Link href="/login">
              <Button size="sm" variant="outline" rightIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}>
                Enter
              </Button>
            </Link>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
            <div className="signal-enter">
              <p className="signal-kicker text-muted">AI helpdesk command surface</p>
              <h1 className="mt-4 max-w-5xl text-[clamp(4rem,14vw,11rem)] font-black uppercase leading-[0.78]">
                Support without the silent queue.
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-muted">
                Build support agents, ground them in documents, watch live conversations, and switch to human control before
                a customer gets stuck.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/inbox">
                  <Button rightIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}>Open live desk</Button>
                </Link>
                <Link href="/bots/customizer">
                  <Button variant="secondary" rightIcon={<Workflow aria-hidden="true" className="h-4 w-4" />}>
                    Shape the widget
                  </Button>
                </Link>
              </div>
            </div>

            <div className="signal-panel rotate-0 p-4 lg:-rotate-2">
              <div className="flex items-center justify-between border-b-2 border-line pb-3">
                <p className="signal-kicker">Today&apos;s fabric</p>
                <StatusPill tone="hot">Handoff armed</StatusPill>
              </div>
              <div className="mt-4 grid gap-3">
                <MetricTile label="Response stack" value="AI + Human" detail="Escalate without losing context" tone="warn" />
                <MetricTile label="Knowledge flow" value="Docs" detail="PDF, DOCX, CSV, TXT, MD" />
                <MetricTile label="Widget state" value="Embed" detail="Shadow DOM fixture ready" tone="dark" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 pb-4 md:grid-cols-4">
            {commandLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Link
                  className="hard-hover border-2 border-line bg-panel p-4 shadow-[4px_4px_0_rgba(23,18,13,0.22)]"
                  href={link.href}
                  key={link.href}
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <Icon aria-hidden="true" className="h-5 w-5 text-signal" />
                  <h2 className="mt-4 text-lg font-black leading-tight">{link.title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-muted">{link.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_1fr_1fr] lg:px-8">
        <div className="border-2 border-line bg-panel p-5">
          <ShieldCheck aria-hidden="true" className="h-6 w-6 text-coral" />
          <h2 className="mt-4 text-2xl font-black">Complex support, visible control.</h2>
          <p className="mt-3 font-semibold leading-7 text-muted">
            The interface is built around the critical moments: what the agent knows, when it should stop, and who owns the reply.
          </p>
        </div>
        <div className="border-2 border-line bg-yellow p-5 lg:translate-y-6">
          <h2 className="font-mono text-5xl font-black">24/7</h2>
          <p className="mt-3 font-black">Always-on intake with human override.</p>
        </div>
        <div className="border-2 border-line bg-line p-5 text-panel lg:-translate-y-4">
          <h2 className="font-mono text-5xl font-black text-yellow">RAG</h2>
          <p className="mt-3 font-black">Answers grounded by documents, not guesses.</p>
        </div>
      </section>
    </main>
  );
}

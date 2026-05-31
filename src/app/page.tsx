import Link from "next/link";
import { ArrowRight, Bot, CreditCard, FileText, Inbox, MessageSquare, Radio, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

const showcaseCards = [
  {
    title: "RAG engine",
    eyebrow: "verified answers",
    description: "Upload policies, tables, manuals, and help-center pages before the bot responds.",
    href: "/documents",
    icon: FileText,
    className: "bg-[linear-gradient(135deg,#ff5530,#f59e0b)]",
  },
  {
    title: "Live handoff",
    eyebrow: "human switch",
    description: "Pause automation, inspect the session, and reply from the operator desk.",
    href: "/inbox",
    icon: Inbox,
    className: "bg-[linear-gradient(135deg,#1456f0,#22c5a5)]",
  },
];

const platformLinks = [
  ["Agent Studio", "Shape instructions, fallbacks, and tenant-scoped bot behavior.", "/bots", Bot],
  ["WebChat", "Style the customer-facing widget and copy production embed snippets.", "/webchat", MessageSquare],
  ["Monitor", "Track session pressure, active customers, and handoff volume.", "/monitor", Workflow],
  ["Billing", "Read credits, usage volume, storage, and transaction history.", "/billing", CreditCard],
] as const;

export default function Home() {
  return (
    <main className="cream-lane min-h-screen overflow-hidden">
      <section className="relative isolate min-h-[96svh] overflow-hidden px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <span className="pastel-bloom left-[6%] top-24 h-52 w-52 bg-[#b8f2d2]" />
        <span className="pastel-bloom right-[10%] top-32 h-64 w-64 bg-[#b8dcff] [animation-delay:2s]" />
        <span className="pastel-bloom bottom-20 left-[40%] h-44 w-44 bg-[#ffd8c2] [animation-delay:5s]" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between border-b border-[#eceae4] py-4">
          <Link className="flex items-center gap-3 font-semibold text-[#1c1c1c]" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1c1c1c] text-[#fcfbf8]">
              <Radio aria-hidden="true" className="h-5 w-5" />
            </span>
            AgentDesk
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-[#5f5f5d] md:flex">
            <a href="#modules">Modules</a>
            <a href="#proof">Proof</a>
            <Link href="/docs">Docs</Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Link href="/login">
              <Button size="sm" rightIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}>
                Enter
              </Button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 pt-20 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-end lg:pt-28">
          <div className="studio-enter">
            <p className="font-mono text-xs font-semibold uppercase text-[#ff5530]">AI support with an operator grip</p>
            <h1 className="editorial-display mt-5 max-w-5xl text-[4.8rem] text-[#1c1c1c] sm:text-[6.8rem] lg:text-[8rem]">
              Support agents that know when to stop.
            </h1>
            <p className="mt-7 max-w-2xl font-[var(--font-inter)] text-lg leading-8 tracking-[0.01em] text-[#5f5f5d]">
              AgentDesk gives teams a composed customer surface, verified knowledge retrieval, and a precise human takeover path when judgment matters.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/login">
                <Button className="w-full rounded-full px-6 sm:w-auto" size="lg" rightIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}>
                  Open workspace
                </Button>
              </Link>
              <Link href="/docs">
                <Button className="w-full rounded-full border-[#1c1c1c]/20 text-[#1c1c1c] sm:w-auto" size="lg" variant="outline">
                  Read docs
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {showcaseCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Link
                  className={`${card.className} studio-enter group min-h-[260px] overflow-hidden rounded-3xl p-8 text-white transition hover:-translate-y-1`}
                  href={card.href}
                  key={card.title}
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs font-semibold uppercase text-white/80">{card.eyebrow}</p>
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <h2 className="mt-16 text-4xl font-semibold tracking-[-0.04em]">{card.title}</h2>
                  <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-white/82">{card.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="modules" className="border-y border-[#eceae4] bg-[#fcfbf8] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <h2 className="editorial-display max-w-3xl text-6xl text-[#1c1c1c]">Every surface has a job.</h2>
            <p className="max-w-md text-sm font-medium leading-6 text-[#5f5f5d]">
              The dashboard stays dense and technical. Customer and entry pages stay warm, readable, and deliberately restrained.
            </p>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-4">
            {platformLinks.map(([title, description, href, Icon]) => (
              <Link className="group min-h-56 border border-[#eceae4] bg-[#f7f4ed] p-5 transition hover:border-[#5f5f5d]" href={href} key={title}>
                <Icon aria-hidden="true" className="h-5 w-5 text-[#1456f0]" />
                <h3 className="mt-12 text-2xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">{title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-[#5f5f5d]">{description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-[#1c1c1c] p-8 text-[#fcfbf8]">
            <ShieldCheck aria-hidden="true" className="h-6 w-6 text-[#22c55e]" />
            <h2 className="mt-16 max-w-xl text-5xl font-semibold leading-none tracking-[-0.04em]">Source-grounded until a person takes over.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["01", "Tenant-scoped bots"],
              ["02", "Document-grounded replies"],
              ["03", "Socket-backed handoff"],
            ].map(([number, label]) => (
              <div className="border border-[#eceae4] bg-[#fcfbf8] p-6" key={number}>
                <p className="font-mono text-3xl text-[#ff5530]">{number}</p>
                <p className="mt-20 text-lg font-semibold text-[#1c1c1c]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-[#eceae4] py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold uppercase text-[#1456f0]">Ready for production support</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">Start in the inbox, tune from the evidence.</h2>
          </div>
          <Link href="/login">
            <Button className="rounded-full" rightIcon={<Sparkles aria-hidden="true" className="h-4 w-4" />}>
              Access AgentDesk
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}

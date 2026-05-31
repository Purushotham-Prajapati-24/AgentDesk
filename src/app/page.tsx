import Link from "next/link";
import { ArrowRight, Bot, CreditCard, FileText, Inbox, MessageSquare, Radio, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";

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
      <section className="relative isolate h-screen flex flex-col justify-start gap-2 sm:gap-4 lg:gap-8 overflow-hidden px-4 pb-6 pt-2 sm:px-6 lg:px-8">
        <nav className="relative z-10 mx-auto flex w-full max-w-7xl lg:max-w-[95vw] items-center justify-between border-b border-[#eceae4] py-4">
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

        <HeroGeometric
          actions={
            <div className="flex flex-row gap-2 w-full sm:w-auto">
              <Link href="/login" className="flex-1 sm:flex-initial">
                <Button className="w-full rounded-full px-3 sm:px-6 text-xs sm:text-sm h-10 sm:h-12" rightIcon={<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />}>
                  Open workspace
                </Button>
              </Link>
              <Link href="/docs" className="flex-1 sm:flex-initial">
                <Button className="w-full rounded-full border-[#1c1c1c]/20 text-[#1c1c1c] px-3 sm:px-6 text-xs sm:text-sm h-10 sm:h-12" variant="outline">
                  Read docs
                </Button>
              </Link>
            </div>
          }
          description="AgentDesk gives teams a composed customer surface, verified knowledge retrieval, and a precise human takeover path when judgment matters."
          sideContent={
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-1 w-full">
              {showcaseCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <Link
                    className={`${card.className} studio-enter group min-h-[140px] sm:min-h-[160px] overflow-hidden rounded-2xl p-4 sm:p-6 text-white shadow-[0_16px_48px_rgba(28,28,28,0.12)] transition hover:-translate-y-1`}
                    href={card.href}
                    key={card.title}
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[9px] sm:text-[10px] font-semibold uppercase text-white/80 tracking-wider">{card.eyebrow}</p>
                      <Icon aria-hidden="true" className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    </div>
                    <h2 className="mt-3 sm:mt-6 text-lg sm:text-2xl font-semibold tracking-[-0.03em]">{card.title}</h2>
                    <p className="mt-1 sm:mt-1.5 max-w-sm text-[10px] sm:text-xs font-normal leading-normal sm:leading-relaxed text-white/80">{card.description}</p>
                  </Link>
                );
              })}
            </div>
          }
          title={
            <>
              Support Agent<br />
              that knows when to<br />
              <span className="bg-gradient-to-r from-[#ff5530] to-[#f59e0b] bg-clip-text text-transparent">Stop.</span>
            </>
          }
        />
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

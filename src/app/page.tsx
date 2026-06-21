import Link from "next/link";
import { ArrowRight, Bot, CreditCard, FileText, Inbox, MessageSquare, Radio, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { MagneticText } from "@/components/ui/morphing-cursor";
import { AuthAwareCta } from "@/components/AuthAwareCta";

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
  {
    title: "Agent Studio",
    eyebrow: "Build",
    description: "Create tenant-scoped agents with instructions, fallback rules, and tool boundaries before they answer customers.",
    href: "/bots",
    icon: Bot,
  },
  {
    title: "WebChat",
    eyebrow: "Launch",
    description: "Tune the widget identity, launcher, theme, and production embed without touching app code.",
    href: "/webchat",
    icon: MessageSquare,
  },
  {
    title: "Monitor",
    eyebrow: "Supervise",
    description: "Track active sessions, escalation pressure, paused automations, and handoff outcomes in real time.",
    href: "/monitor",
    icon: Workflow,
  },
  {
    title: "Billing",
    eyebrow: "Control",
    description: "Review credits, message volume, storage, and transaction history before costs surprise the team.",
    href: "/billing",
    icon: CreditCard,
  },
] as const;

const proofPoints = [
  {
    number: "01",
    title: "Tenant isolation",
    description: "Prompts, documents, widget settings, and conversations stay scoped to the selected workspace.",
  },
  {
    number: "02",
    title: "Verified retrieval",
    description: "Uploaded policies, manuals, and help docs are searched before the assistant replies.",
  },
  {
    number: "03",
    title: "Human takeover",
    description: "Operators pause automation, respond over the live socket, and keep the transcript intact.",
  },
] as const;

export default function Home() {
  return (
    <main className="cream-lane min-h-screen overflow-hidden">
      <section className="marketing-dark-band relative isolate flex h-screen flex-col justify-start gap-2 overflow-hidden bg-[var(--marketing-bg)] px-4 pb-6 pt-2 text-[var(--marketing-ink)] sm:gap-4 sm:px-6 lg:px-8">
        <nav className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between border-b border-[var(--marketing-border)] py-4 lg:max-w-[95vw]">
          <Link className="flex items-center gap-3 font-semibold text-[var(--marketing-ink)]" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--marketing-inverse)] text-[var(--marketing-on-inverse)]">
              <Radio aria-hidden="true" className="h-5 w-5" />
            </span>
            AgentDesk
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-[var(--marketing-muted)] md:flex">
            <a href="#modules">Modules</a>
            <a href="#proof">Proof</a>
            <Link href="/docs">Docs</Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="cockpit" />
            <AuthAwareCta
              ariaLabel="Enter AgentDesk"
              busyClassName="inline-flex min-h-9 cursor-wait items-center justify-center gap-2 rounded-full border border-transparent bg-gradient-to-r from-[#22c55e] to-[#4ade80] px-4 text-xs font-semibold text-white opacity-80 shadow-[0_12px_28px_rgba(34,197,94,0.22)]"
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-transparent bg-gradient-to-r from-[#22c55e] to-[#4ade80] px-4 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(34,197,94,0.22)] transition hover:-translate-y-0.5 hover:from-[#16a34a] hover:to-[#22c55e] active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0"
            >
              <span>Enter</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </AuthAwareCta>
          </div>
        </nav>

        <HeroGeometric
          actions={
            <div className="flex flex-row gap-2 w-full sm:w-auto">
              <AuthAwareCta
                ariaLabel="Open workspace"
                busyClassName="inline-flex h-10 w-full cursor-wait items-center justify-center gap-2 rounded-full border border-transparent bg-gradient-to-r from-[#1456f0] to-[#0099ff] px-3 text-xs font-semibold text-white opacity-80 shadow-[0_16px_36px_rgba(20,86,240,0.24)] sm:h-12 sm:px-6 sm:text-sm"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-transparent bg-gradient-to-r from-[#1456f0] to-[#0099ff] px-3 text-xs font-semibold text-white shadow-[0_16px_36px_rgba(20,86,240,0.24)] transition hover:-translate-y-0.5 hover:from-[#114cd6] hover:to-[#38bdf8] active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0 sm:h-12 sm:px-6 sm:text-sm"
              >
                <span>Open workspace</span>
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </AuthAwareCta>
              <Link href="/docs" className="flex-1 sm:flex-initial">
                <span className="inline-flex h-10 w-full items-center justify-center rounded-full border border-[var(--marketing-border)] bg-[var(--marketing-chip)]/80 px-3 text-xs font-semibold text-[var(--marketing-ink)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[#0099ff] hover:bg-[#0099ff]/15 active:scale-[0.98] sm:h-12 sm:px-6 sm:text-sm">
                  Read docs
                </span>
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
                    className={`${card.className} studio-enter group min-h-[140px] overflow-hidden rounded-2xl p-4 text-white shadow-[0_16px_48px_rgba(28,28,28,0.12)] ring-1 ring-white/15 transition hover:-translate-y-1 sm:min-h-[160px] sm:p-6`}
                    href={card.href}
                    key={card.title}
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs font-semibold uppercase text-white/80 tracking-wide sm:text-sm">{card.eyebrow}</p>
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
              <MagneticText
                className="align-baseline bg-gradient-to-r from-[#ff5530] to-[#f59e0b] bg-clip-text text-transparent"
                cursorClassName="bg-gradient-to-r from-[#ff5530] to-[#f59e0b] text-[#ff5530]"
                hoverText="Stop."
                hoverTextClassName="text-[var(--marketing-bg)]"
                text="Stop."
                textClassName="bg-gradient-to-r from-[#ff5530] to-[#f59e0b] bg-clip-text text-transparent"
              />
            </>
          }
        />
      </section>

      <section id="modules" className="marketing-dark-band border-y border-[var(--marketing-border)] bg-[var(--marketing-bg)] px-4 py-16 text-[var(--marketing-ink)] sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold uppercase text-[#ff5530]">AI support workspace</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--marketing-ink)] sm:text-5xl lg:text-6xl">
                Build, launch, and supervise one support agent.
              </h2>
            </div>
            <p className="max-w-md text-base font-medium leading-7 text-[var(--marketing-muted)]">
              AgentDesk keeps knowledge, widget styling, live conversations, and spend controls in one workspace so automation never drifts from your service policy.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platformLinks.map(({ title, eyebrow, description, href, icon: Icon }) => (
              <Link
                className="marketing-dark-surface group flex min-h-72 flex-col rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-surface)] p-6 text-[var(--marketing-ink)] transition hover:-translate-y-1 hover:border-[var(--marketing-ink)] hover:bg-[var(--marketing-bg)] hover:shadow-[0_16px_40px_rgba(10,10,10,0.08)]"
                href={href}
                key={title}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-[var(--marketing-chip-border)] bg-[var(--marketing-chip)] px-3 py-1 text-xs font-semibold text-[var(--marketing-muted)]">{eyebrow}</span>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--marketing-inverse)] text-[var(--marketing-on-inverse)] transition group-hover:bg-[#ff5530] group-hover:text-white">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-auto pt-12">
                  <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--marketing-ink)]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--marketing-muted)]">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="marketing-dark-band bg-[var(--marketing-surface)] px-4 pb-8 pt-14 text-[var(--marketing-ink)] sm:px-6 sm:pb-10 sm:pt-16 lg:px-8 lg:pb-10 lg:pt-20">
        <div className="mx-auto grid max-w-7xl gap-5 sm:gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-[var(--marketing-inverse)] p-7 text-[var(--marketing-on-inverse)] sm:p-8">
            <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-[radial-gradient(circle,#ff5530_0%,rgba(255,85,48,0.42)_34%,rgba(255,85,48,0)_70%)]" />
            <div className="absolute -bottom-16 left-8 h-56 w-56 rounded-full bg-[radial-gradient(circle,#1456f0_0%,rgba(20,86,240,0.32)_35%,rgba(20,86,240,0)_72%)]" />
            <div className="relative">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--marketing-on-inverse)] text-[var(--marketing-inverse)]">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </span>
              <h2 className="mt-12 max-w-xl text-4xl font-semibold leading-[1.03] tracking-[-0.04em] sm:text-5xl">
                Ground every answer. Escalate with full context.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 opacity-70">
                The bot starts from your documents, stays scoped to the selected tenant, and hands the thread to a human operator when confidence or policy requires it.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {proofPoints.map(({ number, title, description }) => (
              <div className="marketing-dark-surface flex min-h-72 flex-col rounded-2xl border border-[var(--marketing-border)] bg-[var(--marketing-bg)] p-6" key={number}>
                <p className="font-mono text-4xl font-semibold text-[#ff5530]">{number}</p>
                <div className="mt-auto pt-12">
                  <h3 className="text-xl font-semibold leading-tight tracking-[-0.02em] text-[var(--marketing-ink)]">{title}</h3>
                  <p className="mt-4 text-sm leading-6 text-[var(--marketing-muted)]">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-dark-band bg-[var(--marketing-surface)] px-4 pb-16 pt-4 text-[var(--marketing-ink)] sm:px-6 sm:pb-20 sm:pt-5 lg:px-8 lg:pb-24">
        <div className="marketing-dark-surface mx-auto flex max-w-7xl flex-col gap-6 rounded-[1.75rem] border border-[var(--marketing-border)] bg-[var(--marketing-bg)] p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <p className="font-mono text-xs font-semibold uppercase text-[#1456f0]">Ready for production support</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-[var(--marketing-ink)]">
              Open the workspace and tune from real conversations.
            </h2>
          </div>
          <AuthAwareCta
            ariaLabel="Open AgentDesk"
            busyClassName="marketing-cta inline-flex min-h-11 cursor-wait items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold opacity-80"
            busyStyle={{
              backgroundColor: "var(--marketing-inverse)",
              borderColor: "var(--marketing-inverse)",
              color: "var(--marketing-on-inverse)",
            }}
            className="marketing-cta inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0"
            style={{
              backgroundColor: "var(--marketing-inverse)",
              borderColor: "var(--marketing-inverse)",
              color: "var(--marketing-on-inverse)",
            }}
          >
            <span>Open AgentDesk</span>
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          </AuthAwareCta>
        </div>
      </section>
    </main>
  );
}

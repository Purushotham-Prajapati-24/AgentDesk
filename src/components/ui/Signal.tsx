"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Boxes,
  CreditCard,
  FileText,
  Inbox,
  LayoutDashboard,
  MonitorUp,
  Radio,
  TestTube2,
} from "lucide-react";
import React from "react";

type StatusTone = "hot" | "warn" | "neutral" | "danger" | "dark";

const navItems = [
  { href: "/", label: "Workspace", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/bots", label: "Bots", icon: Bot },
  { href: "/bots/customizer", label: "Customizer", icon: MonitorUp },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/widget-test.html", label: "Widget Test", icon: TestTube2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-line">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-b-2 border-line bg-line text-panel lg:border-b-0 lg:border-r-2">
          <div className="sticky top-0 flex flex-col gap-5 p-4 lg:min-h-screen">
            <Link className="group border-2 border-panel p-4 transition hover:-translate-y-0.5 hover:bg-panel hover:text-line" href="/">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center border-2 border-panel bg-yellow text-line group-hover:border-line">
                  <Boxes aria-hidden="true" className="h-6 w-6" />
                </span>
                <div>
                  <p className="signal-kicker text-yellow group-hover:text-muted">AgentDesk</p>
                  <p className="text-lg font-extrabold leading-none">Signal Ops</p>
                </div>
              </div>
            </Link>

            <nav aria-label="Workspace navigation" className="grid gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    className={`flex min-h-11 items-center gap-3 border-2 px-3 py-2 text-sm font-extrabold transition duration-200 ease-out ${
                      active
                        ? "border-yellow bg-yellow text-line"
                        : "border-transparent text-panel hover:border-panel hover:bg-panel hover:text-line"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-2 border-panel p-3">
              <p className="signal-kicker text-yellow">Live fabric</p>
              <div className="mt-3 flex items-center gap-2 text-sm font-bold">
                <Radio aria-hidden="true" className="h-4 w-4 text-coral" />
                Human handoff ready
              </div>
            </div>
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="signal-enter border-b-2 border-line bg-panel-warm px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="signal-kicker text-muted">{kicker}</p>
          <h1 className="mt-2 max-w-4xl text-4xl font-black leading-[0.95] text-line sm:text-5xl">{title}</h1>
          {description ? <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`signal-panel signal-enter ${className}`}>{children}</section>;
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: StatusTone }) {
  const toneClass: Record<StatusTone, string> = {
    hot: "border-line bg-signal text-white",
    warn: "border-line bg-yellow text-line",
    neutral: "border-line bg-panel-warm text-line",
    danger: "border-line bg-coral text-white",
    dark: "border-line bg-line text-panel",
  };

  return (
    <span className={`inline-flex min-h-7 items-center border px-2.5 py-1 font-mono text-xs font-bold ${toneClass[tone]}`}>
      {children}
    </span>
  );
}

export function MetricTile({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail?: string; tone?: StatusTone }) {
  const toneClass: Record<StatusTone, string> = {
    hot: "bg-signal text-white",
    warn: "bg-yellow text-line",
    neutral: "bg-panel text-line",
    danger: "bg-coral text-white",
    dark: "bg-line text-panel",
  };

  return (
    <article className={`border-2 border-line p-4 shadow-[5px_5px_0_#17120D] ${toneClass[tone]}`}>
      <p className="signal-kicker opacity-80">{label}</p>
      <p className="mt-3 font-mono text-3xl font-black leading-none">{value}</p>
      {detail ? <p className="mt-3 text-sm font-bold opacity-80">{detail}</p> : null}
    </article>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-2 border-dashed border-line bg-panel-warm p-6 text-center">
      <p className="text-base font-black text-line">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-muted">{description}</p>
    </div>
  );
}

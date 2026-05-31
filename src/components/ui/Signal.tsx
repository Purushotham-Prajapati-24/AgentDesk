"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Boxes,
  ChartNoAxesCombined,
  CreditCard,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Radio,
  ShieldCheck,
  TestTube2,
} from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

type StatusTone = "hot" | "warn" | "neutral" | "danger" | "dark" | "info";

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/monitor", label: "Monitor", icon: ChartNoAxesCombined },
  { href: "/bots", label: "Agents", icon: Bot },
  { href: "/webchat", label: "WebChat", icon: MessagesSquare },
  { href: "/documents", label: "Knowledge", icon: FileText },
  { href: "/billing", label: "Usage", icon: CreditCard },
  { href: "/widget-test.html", label: "Widget Test", icon: TestTube2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="cockpit-lane min-h-screen overflow-x-hidden">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="sticky top-0 z-40 border-b border-[#1a1a1a] bg-[#090909] lg:static lg:border-b-0 lg:border-r">
          <div className="flex min-w-0 flex-col gap-3 p-3 lg:sticky lg:top-0 lg:min-h-screen lg:gap-5 lg:p-4">
            <Link className="group border border-[#1a1a1a] bg-[#141414] p-3 transition hover:border-[#0099ff]/70 lg:p-4" href="/">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#262626] bg-white text-[#090909] lg:h-11 lg:w-11">
                  <Boxes aria-hidden="true" className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="studio-kicker text-[#0099ff]">AgentDesk</p>
                  <p className="truncate text-base font-semibold leading-none text-white lg:text-lg">Operator cockpit</p>
                </div>
              </div>
            </Link>

            <nav aria-label="Workspace navigation" className="flex min-w-0 gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    className={cn(
                      "relative flex min-h-10 shrink-0 items-center gap-2 border px-3 py-2 text-sm font-semibold transition duration-200 ease-out lg:min-h-11 lg:gap-3",
                      active
                        ? "border-white bg-white text-[#090909] before:absolute before:left-0 before:top-1 before:h-[calc(100%-8px)] before:w-1 before:bg-[#0099ff]"
                        : "border-transparent text-[#999999] hover:border-[#262626] hover:bg-[#141414] hover:text-white",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex min-w-0 items-center gap-2 lg:mt-auto lg:flex-col lg:items-stretch lg:gap-4">
              <ThemeToggle compact variant="cockpit" />

              <button
                className="flex min-h-10 shrink-0 items-center gap-2 border border-transparent px-3 py-2 text-sm font-semibold text-[#999999] transition duration-200 ease-out hover:border-[#dc2626]/30 hover:bg-[#dc2626]/10 hover:text-[#ef4444] lg:min-h-11 lg:gap-3"
                onClick={() => void logout()}
                type="button"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                Sign out
              </button>

              <div className="hidden border border-[#1a1a1a] bg-[#141414] p-3 sm:block">
                <p className="studio-kicker text-[#999999]">Live fabric</p>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <Radio aria-hidden="true" className="h-4 w-4 text-[#22c55e]" />
                  Human handoff ready
                </div>
              </div>
            </div>
          </div>
        </aside>
        <main className="min-w-0 bg-[#090909]">{children}</main>
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
    <section className="studio-enter border-b border-[#1a1a1a] bg-[#090909] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="studio-kicker text-[#0099ff]">{kicker}</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-white sm:text-4xl lg:text-5xl">{title}</h1>
          {description ? <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-[#999999]">{description}</p> : null}
        </div>
        {action ? <div className="min-w-0 shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("studio-surface studio-enter", className)}>{children}</section>;
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: StatusTone }) {
  const toneClass: Record<StatusTone, string> = {
    hot: "border-primary/50 bg-primary/10 text-primary",
    warn: "border-[#22c55e]/50 bg-[#22c55e]/10 text-[#22c55e]",
    neutral: "border-border bg-secondary text-muted-foreground",
    danger: "border-destructive/50 bg-destructive/10 text-destructive",
    dark: "border-border bg-card-elevated text-foreground",
    info: "border-accent/50 bg-accent/10 text-accent",
  };

  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 font-mono text-xs font-semibold", toneClass[tone])}>
      {children}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: StatusTone;
}) {
  const toneClass: Record<StatusTone, string> = {
    hot: "border-[#ff5530]/45 bg-[#ff5530]/10 text-[#ff5530]",
    warn: "border-[#22c55e]/45 bg-[#22c55e]/10 text-[#22c55e]",
    neutral: "border-[#262626] bg-[#141414] text-white",
    danger: "border-[#dc2626]/45 bg-[#dc2626]/10 text-[#ef4444]",
    dark: "border-[#262626] bg-[#1c1c1c] text-white",
    info: "border-[#0099ff]/45 bg-[#0099ff]/10 text-[#0099ff]",
  };

  return (
    <article className={cn("border p-4", toneClass[tone])}>
      <p className="studio-kicker opacity-80">{label}</p>
      <p className="mt-3 font-mono text-3xl font-bold leading-none">{value}</p>
      {detail ? <p className="mt-3 text-sm font-medium text-[#999999]">{detail}</p> : null}
    </article>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="border border-dashed border-[#262626] bg-[#141414] p-6 text-center">
      <ShieldCheck aria-hidden="true" className="mx-auto h-5 w-5 text-[#0099ff]" />
      <p className="mt-3 text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-[#999999]">{description}</p>
    </div>
  );
}

export function CodePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[#07090b]">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="studio-kicker text-muted-foreground">{title}</p>
        <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_18px_rgba(34,211,238,0.65)]" />
      </div>
      <div className="overflow-x-auto p-4 font-mono text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}

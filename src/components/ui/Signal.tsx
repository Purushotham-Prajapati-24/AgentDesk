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
  Menu,
  MessagesSquare,
  Radio,
  ShieldCheck,
  TestTube2,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentSection = useMemo(() => {
    return navItems.find((item) => (item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`))) ?? navItems[0];
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileNavOpen]);

  return (
    <div className="cockpit-lane min-h-screen overflow-x-hidden">
      <div className="grid min-h-screen lg:grid-cols-[292px_1fr]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(88vw,320px)] max-h-[100svh] border-r border-[var(--ui-border)] bg-[var(--ui-bg)] transition-transform duration-300 lg:static lg:z-auto lg:w-auto lg:max-h-none lg:translate-x-0 lg:border-r lg:border-b-0",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex min-h-[100svh] min-w-0 flex-col gap-3 overflow-y-auto p-3 safe-bottom-padding lg:sticky lg:top-0 lg:min-h-screen lg:gap-5 lg:overflow-visible lg:p-4">
            <div className="flex items-center justify-between">
              <Link className="group rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-3 transition hover:border-[#0099ff]/70 lg:p-4" href="/">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-text)] text-[var(--ui-bg)] lg:h-11 lg:w-11">
                    <Boxes aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="studio-kicker text-[#0099ff]">AgentDesk</p>
                    <p className="truncate text-base font-semibold leading-none text-[var(--ui-text)] lg:text-lg">Operator cockpit</p>
                  </div>
                </div>
              </Link>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--ui-muted)] hover:bg-[var(--ui-panel)] hover:text-[var(--ui-text)] lg:hidden"
                onClick={() => setMobileNavOpen(false)}
                type="button"
                aria-label="Close navigation"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <nav aria-label="Workspace navigation" className="flex min-w-0 flex-col gap-1 overflow-y-auto lg:grid lg:overflow-visible">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    className={cn(
                      "flex min-h-11 shrink-0 items-center gap-3 rounded-full border px-3 py-2 text-sm font-semibold transition duration-200 ease-out",
                      active
                        ? "border-[#0099ff] bg-[#0099ff] text-white"
                        : "border-transparent text-[var(--ui-muted)] hover:border-[var(--ui-border)] hover:bg-[var(--ui-panel)] hover:text-[var(--ui-text)]",
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex min-w-0 items-center gap-2 lg:mt-auto lg:flex-col lg:items-stretch lg:gap-4">
              <ThemeToggle variant="cockpit" />

              <button
                className="flex min-h-11 shrink-0 items-center gap-3 rounded-full border border-transparent px-3 py-2 text-sm font-semibold text-[var(--ui-muted)] transition duration-200 ease-out hover:border-[#dc2626]/30 hover:bg-[#dc2626]/10 hover:text-[#ef4444]"
                onClick={() => void logout()}
                type="button"
              >
                <LogOut aria-hidden="true" className="h-5 w-5" />
                Sign out
              </button>

              <div className="hidden rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-3 sm:block">
                <p className="studio-kicker text-[var(--ui-muted)]">Live fabric</p>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--ui-text)]">
                  <Radio aria-hidden="true" className="h-4 w-4 text-[#22c55e]" />
                  Human handoff ready
                </div>
              </div>
            </div>
          </div>
        </aside>

        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <main className="relative min-w-0 bg-[var(--ui-bg)]">
          <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-bg)] px-4 py-2 lg:hidden">
            <button
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--ui-muted)] hover:bg-[var(--ui-panel)] hover:text-[var(--ui-text)]"
              onClick={() => setMobileNavOpen(true)}
              type="button"
              aria-label="Open navigation"
            >
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="studio-kicker text-[var(--ui-blue)]">AgentDesk</p>
              <p className="truncate text-sm font-semibold text-[var(--ui-text)]">{currentSection.label}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#22c55e]/35 bg-[#22c55e]/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#22c55e]">
              <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
              Live
            </div>
          </div>
          {children}
        </main>
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

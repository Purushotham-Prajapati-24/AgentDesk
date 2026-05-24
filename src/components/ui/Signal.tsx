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

type StatusTone = "hot" | "warn" | "neutral" | "danger" | "dark" | "info";

const navItems = [
  { href: "/", label: "Workspace", icon: LayoutDashboard },
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-border bg-card/95 backdrop-blur lg:border-b-0 lg:border-r">
          <div className="sticky top-0 flex flex-col gap-5 p-4 lg:min-h-screen">
            <Link className="group rounded-lg border border-border bg-card-elevated p-4 transition hover:border-primary/70" href="/">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-md border border-primary/50 bg-primary/10 text-primary">
                  <Boxes aria-hidden="true" className="h-6 w-6" />
                </span>
                <div>
                  <p className="studio-kicker text-primary">AgentDesk</p>
                  <p className="text-lg font-bold leading-none text-foreground">Dark Studio</p>
                </div>
              </div>
            </Link>

            <nav aria-label="Workspace navigation" className="grid gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm font-semibold transition duration-200 ease-out",
                      active
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground",
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

            <div className="mt-auto flex flex-col gap-4">
              <button
                className="flex min-h-11 items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm font-semibold text-muted-foreground transition duration-200 ease-out hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void logout()}
                type="button"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                Sign out
              </button>

              <div className="rounded-lg border border-border bg-secondary/60 p-3">
                <p className="studio-kicker text-muted-foreground">Live fabric</p>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Radio aria-hidden="true" className="h-4 w-4 text-accent" />
                  Human handoff ready
                </div>
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
    <section className="studio-enter border-b border-border bg-card/70 px-4 py-6 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="studio-kicker text-primary">{kicker}</p>
          <h1 className="mt-2 max-w-4xl text-4xl font-bold leading-[1.02] text-foreground sm:text-5xl">{title}</h1>
          {description ? <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("studio-surface studio-enter rounded-lg", className)}>{children}</section>;
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: StatusTone }) {
  const toneClass: Record<StatusTone, string> = {
    hot: "border-primary/50 bg-primary/10 text-primary",
    warn: "border-success/50 bg-success/10 text-success",
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
    hot: "border-primary/45 bg-primary/10 text-primary",
    warn: "border-success/45 bg-success/10 text-success",
    neutral: "border-border bg-card text-foreground",
    danger: "border-destructive/45 bg-destructive/10 text-destructive",
    dark: "border-border bg-secondary text-foreground",
    info: "border-accent/45 bg-accent/10 text-accent",
  };

  return (
    <article className={cn("rounded-lg border p-4", toneClass[tone])}>
      <p className="studio-kicker opacity-80">{label}</p>
      <p className="mt-3 font-mono text-3xl font-bold leading-none">{value}</p>
      {detail ? <p className="mt-3 text-sm font-medium text-muted-foreground">{detail}</p> : null}
    </article>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-secondary/50 p-6 text-center">
      <ShieldCheck aria-hidden="true" className="mx-auto h-5 w-5 text-primary" />
      <p className="mt-3 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{description}</p>
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
      <div className="p-4 font-mono text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}

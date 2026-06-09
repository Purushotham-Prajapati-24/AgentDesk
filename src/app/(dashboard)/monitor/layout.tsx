"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, MessagesSquare, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/monitor/conversations", label: "Conversations", icon: MessagesSquare, detail: "Live sessions" },
  { href: "/monitor/users", label: "Users", icon: UsersRound, detail: "Customer ledger" },
  { href: "/monitor/analytics", label: "Analytics", icon: BarChart3, detail: "Operations signal" },
];

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="cockpit-lane min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <header className="px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ui-text)] text-[var(--ui-bg)]">
                <Activity aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="studio-kicker text-[var(--ui-blue)]">Monitor cockpit</p>
                <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ui-text)] sm:text-2xl">
                  Customer operations, live context, and support health.
                </h1>
              </div>
            </div>

            <nav aria-label="Monitor navigation" className="grid w-full min-w-0 gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[520px]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = pathname === tab.href || (pathname === "/monitor" && tab.href === "/monitor/conversations");
                return (
                  <Link
                    className={cn(
                      "inline-flex min-h-[44px] min-w-0 items-center justify-center gap-3 rounded-full border px-4 py-2 text-left transition duration-200 ease-out lg:justify-start",
                      active
                        ? "border-[var(--ui-blue)] bg-[var(--ui-blue)] text-white"
                        : "border-[var(--ui-border)] bg-[var(--ui-bg)] text-[var(--ui-muted)] hover:border-[var(--ui-blue)]/60 hover:text-[var(--ui-text)]",
                    )}
                    href={tab.href}
                    key={tab.href}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold leading-4">{tab.label}</span>
                      <span className={cn("block truncate text-xs font-medium leading-5", active ? "text-white/75" : "text-[var(--ui-muted)]")}>{tab.detail}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

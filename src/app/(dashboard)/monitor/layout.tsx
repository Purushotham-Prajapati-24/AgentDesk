"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, MessagesSquare, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/monitor/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/monitor/users", label: "Users", icon: UsersRound },
  { href: "/monitor/analytics", label: "Analytics", icon: BarChart3 },
];

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card/60 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/40 bg-accent/10 text-accent">
              <Activity aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="studio-kicker text-accent">Monitor</p>
              <p className="text-sm font-semibold text-muted-foreground">Conversation operations and customer health</p>
            </div>
          </div>

          <nav aria-label="Monitor navigation" className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = pathname === tab.href;
              return (
                <Link
                  className={cn(
                    "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                  href={tab.href}
                  key={tab.href}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}

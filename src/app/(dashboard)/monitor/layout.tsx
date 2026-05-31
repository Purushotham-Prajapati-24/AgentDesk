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
    <div className="cockpit-lane min-h-screen">
      <div className="border-b border-[#262626] bg-[#090909] px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center border border-[#0099ff]/40 bg-[#0099ff]/10 text-[#0099ff]">
              <Activity aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="studio-kicker text-[#0099ff]">Monitor</p>
              <p className="text-sm font-medium text-[#999999]">Conversation operations and customer health</p>
            </div>
          </div>

          <nav aria-label="Monitor navigation" className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = pathname === tab.href;
              return (
                <Link
                  className={cn(
                    "inline-flex min-h-10 shrink-0 items-center gap-2 border px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "border-white bg-white text-[#090909]"
                      : "border-[#262626] bg-[#141414] text-[#999999] hover:border-[#0099ff]/50 hover:text-white",
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

"use client";

import type React from "react";
import { Moon, Monitor, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ThemeMode, useTheme } from "@/context/ThemeContext";

const options: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
  { value: "light", label: "Light theme", icon: <Sun aria-hidden="true" className="h-4 w-4" /> },
  { value: "dark", label: "Dark theme", icon: <Moon aria-hidden="true" className="h-4 w-4" /> },
  { value: "system", label: "System theme", icon: <Monitor aria-hidden="true" className="h-4 w-4" /> },
];

export function ThemeToggle({ variant = "cream", compact = false }: { variant?: "cream" | "cockpit"; compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const isCockpit = variant === "cockpit";

  return (
    <div
      aria-label="Theme selector"
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 self-start rounded-full border p-1",
        isCockpit ? "border-[var(--ui-border)] bg-[var(--ui-panel)]" : "border-[var(--cream-border)] bg-[var(--cream-card)]",
      )}
      role="group"
    >
      {options.map((option) => {
        const active = theme === option.value;
        return (
          <button
            aria-label={option.label}
            title={option.label}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-2 rounded-full px-2.5 text-xs font-semibold transition active:scale-[0.98]",
              compact && "w-8 px-0",
              active
                ? isCockpit
                  ? "bg-[#0099ff] text-[#041018] shadow-[0_0_0_1px_rgba(0,153,255,0.24)]"
                  : "bg-[#1456f0] text-white shadow-[0_0_0_1px_rgba(20,86,240,0.18)]"
                : isCockpit
                  ? "text-[var(--ui-muted)] hover:bg-[#0099ff]/10 hover:text-[var(--ui-text)]"
                  : "text-[var(--cream-muted)] hover:bg-[var(--cream-bg)] hover:text-[var(--cream-ink)]",
            )}
            key={option.value}
            onClick={() => setTheme(option.value)}
            type="button"
          >
            {option.icon}
            {compact ? <span className="sr-only">{option.label}</span> : <span className="hidden sm:inline">{option.value}</span>}
          </button>
        );
      })}
    </div>
  );
}

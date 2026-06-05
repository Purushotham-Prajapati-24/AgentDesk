"use client";

import type React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function WebChatDropdown({
  id,
  title,
  description,
  icon,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[var(--ui-border)] bg-[var(--ui-panel)]">
      <button
        aria-controls={`${id}-panel`}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-4 border-b px-4 py-4 text-left transition-colors",
          open
            ? "border-[var(--ui-blue)] bg-[var(--ui-blue)] text-white"
            : "border-[var(--ui-border)] text-[var(--ui-text)] hover:bg-[var(--ui-panel-2)]",
        )}
        onClick={() => onToggle(id)}
        type="button"
      >
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center border", open ? "border-white/45 text-white" : "border-[var(--ui-border)] text-[var(--ui-blue)]")}>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">{title}</span>
          <span className={cn("mt-1 block text-sm font-medium leading-5", open ? "text-white/80" : "text-[var(--ui-muted)]")}>{description}</span>
        </span>
        <ChevronDown aria-hidden="true" className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")} id={`${id}-panel`}>
        <div className="overflow-hidden">
          <div className="p-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

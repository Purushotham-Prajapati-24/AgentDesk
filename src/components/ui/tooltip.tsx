import React from "react";
import { cn } from "@/lib/utils";

export function Tooltip({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-foreground shadow-lg group-hover:block">
        {label}
      </span>
    </span>
  );
}

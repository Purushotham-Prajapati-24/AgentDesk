"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function Dialog({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">{children}</div>;
}

export function DialogContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto max-h-[calc(100svh-32px)] w-[min(calc(100vw-32px),48rem)] overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-2xl sm:p-5", className)} {...props} />;
}

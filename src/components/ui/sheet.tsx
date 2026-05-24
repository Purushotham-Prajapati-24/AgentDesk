"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function Sheet({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-black/70">{children}</div>;
}

export function SheetContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <aside className={cn("ml-auto h-full w-full max-w-sm border-l border-border bg-card p-5 shadow-2xl", className)} {...props} />;
}

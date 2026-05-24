"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function Dialog({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">{children}</div>;
}

export function DialogContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-2xl", className)} {...props} />;
}

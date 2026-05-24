"use client";

import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

const AccordionContext = createContext<{ value: string; setValue: (value: string) => void } | null>(null);

export function Accordion({ defaultValue = "", children, className = "" }: { defaultValue?: string; children: React.ReactNode; className?: string }) {
  const [value, setValue] = useState(defaultValue);
  return <AccordionContext.Provider value={{ value, setValue }}><div className={cn("divide-y divide-border rounded-lg border border-border", className)}>{children}</div></AccordionContext.Provider>;
}

export function AccordionItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <div data-value={value}>{children}</div>;
}

export function AccordionTrigger({ value, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = useContext(AccordionContext);
  return <button className={cn("flex w-full items-center justify-between px-4 py-3 text-left font-semibold", className)} onClick={() => ctx?.setValue(ctx.value === value ? "" : value)} type="button" {...props} />;
}

export function AccordionContent({ value, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = useContext(AccordionContext);
  if (ctx?.value !== value) return null;
  return <div className={cn("px-4 pb-4 text-sm text-muted-foreground", className)} {...props} />;
}

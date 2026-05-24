"use client";

import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

const TabsContext = createContext<{ value: string; setValue: (value: string) => void } | null>(null);

export function Tabs({ defaultValue, children, className = "" }: { defaultValue: string; children: React.ReactNode; className?: string }) {
  const [value, setValue] = useState(defaultValue);
  return <TabsContext.Provider value={{ value, setValue }}><div className={className}>{children}</div></TabsContext.Provider>;
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex rounded-lg border border-border bg-secondary p-1", className)} {...props} />;
}

export function TabsTrigger({ value, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = useContext(TabsContext);
  return <button className={cn("rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground data-[active=true]:bg-card data-[active=true]:text-foreground", className)} data-active={ctx?.value === value} onClick={() => ctx?.setValue(value)} type="button" {...props} />;
}

export function TabsContent({ value, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return <div className={cn("mt-4", className)} {...props} />;
}

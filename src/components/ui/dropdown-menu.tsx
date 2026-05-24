"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export function DropdownMenu({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button type="button" onClick={() => setOpen((current) => !current)}>{trigger}</button>
      {open ? <div className="absolute right-0 top-full z-30 mt-2 min-w-48 rounded-lg border border-border bg-popover p-1 shadow-xl">{children}</div> : null}
    </div>
  );
}

export function DropdownMenuItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground", className)} {...props} />;
}

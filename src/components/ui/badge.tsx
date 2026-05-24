import React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground", className)} {...props} />;
}

import React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-28 w-full rounded-md border border-input bg-card-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary", className)} {...props} />;
}

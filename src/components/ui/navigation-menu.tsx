import React from "react";
import { cn } from "@/lib/utils";

export function NavigationMenu({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <nav className={cn("flex items-center gap-2", className)} {...props} />;
}

export function NavigationMenuItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground", className)} {...props} />;
}

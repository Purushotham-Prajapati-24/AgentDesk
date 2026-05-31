"use client";

import type React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function WebChatDropdown({
  id,
  title,
  description,
  icon,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[#262626] bg-[#141414]">
      <button
        aria-controls={`${id}-panel`}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-4 border-b px-4 py-4 text-left transition-colors",
          open ? "border-[#0099ff] bg-white text-[#090909]" : "border-[#262626] text-white hover:bg-white/5",
        )}
        onClick={() => onToggle(id)}
        type="button"
      >
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center border", open ? "border-black text-black" : "border-[#262626] text-[#0099ff]")}>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">{title}</span>
          <span className={cn("mt-1 block text-sm font-medium leading-5", open ? "text-black/70" : "text-[#999999]")}>{description}</span>
        </span>
        <ChevronDown aria-hidden="true" className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")} id={`${id}-panel`}>
        <div className="overflow-hidden">
          <div className="p-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { cn } from "@/lib/utils";

export function SplitText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={cn("inline-block", className)} aria-label={text}>
      {text.split(" ").map((word, index) => (
        <span
          aria-hidden="true"
          className="inline-block translate-y-2 opacity-0 [animation:studio-enter_520ms_ease-out_forwards]"
          key={`${word}-${index}`}
          style={{ animationDelay: `${index * 55}ms` }}
        >
          {word}
          {index < text.split(" ").length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </span>
  );
}

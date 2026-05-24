"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

type Spark = { id: number; x: number; y: number };

export function ClickSpark({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [sparks, setSparks] = useState<Spark[]>([]);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const spark = {
      id: Date.now(),
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setSparks((current) => [...current.slice(-4), spark]);
    window.setTimeout(() => setSparks((current) => current.filter((item) => item.id !== spark.id)), 560);
  }

  return (
    <div className={cn("relative inline-flex", className)} onClick={handleClick}>
      {children}
      {sparks.map((spark) => (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/70 opacity-0 [animation:click-spark_560ms_ease-out]"
          key={spark.id}
          style={{ left: spark.x, top: spark.y }}
        />
      ))}
    </div>
  );
}

"use client";

import { Agentation } from "agentation";

const AGENTATION_ENDPOINT = process.env.NEXT_PUBLIC_AGENTATION_ENDPOINT || "http://localhost:4747";
const AGENTATION_ENABLED = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DISABLE_AGENTATION !== "true";

export function AgentationToolbar() {
  if (!AGENTATION_ENABLED) {
    return null;
  }

  return <Agentation endpoint={AGENTATION_ENDPOINT} />;
}

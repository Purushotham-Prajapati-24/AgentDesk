"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AgentationToolbar } from "@/components/AgentationToolbar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <AgentationToolbar />
      </AuthProvider>
    </ThemeProvider>
  );
}

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  DocCodeBlock,
  DocField,
  SnippetModeButton,
} from "./doc-primitives";

type DeploymentMode = "script" | "iframe" | "react" | "vue";

const deploymentModes: Array<{
  id: DeploymentMode;
  label: string;
  hint: string;
}> = [
  { id: "script", label: "Script", hint: "Floating launcher for any website." },
  { id: "iframe", label: "Iframe", hint: "Inline support panel inside a page." },
  { id: "react", label: "React / Next.js", hint: "App shell install using next/script." },
  { id: "vue", label: "Vue", hint: "Vue component that injects the launcher." },
];

/**
 * SnippetGenerator — interactive client island.
 *
 * Replaces the previous sandbox state that lived inside the client-only
 * /docs page. Hosts the bot ID / theme / deployment-mode inputs and
 * renders a live, copyable install snippet.
 */
export function SnippetGenerator() {
  const [sandboxBotId, setSandboxBotId] = useState<string>("6a160c5a00212e6e9da0");
  const [sandboxTheme, setSandboxTheme] = useState<string>("webchat-v1");
  const [sandboxMode, setSandboxMode] = useState<DeploymentMode>("script");
  const [snippetHost, setSnippetHost] = useState<string>("https://agentdeskbot.vercel.app");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const updateSnippetHost = () => setSnippetHost(window.location.origin);
    updateSnippetHost();
    window.addEventListener("popstate", updateSnippetHost);
    return () => window.removeEventListener("popstate", updateSnippetHost);
  }, []);

  const copyToClipboard = useCallback((text: string, id: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const sandboxSnippets = useMemo<Record<DeploymentMode, string>>(
    () => ({
      script: `<script
  src="${snippetHost}/widget.js"
  data-bot-id="${sandboxBotId}"
  data-theme="${sandboxTheme}"
  data-mode="launcher"
  async
></script>`,
      iframe: `<iframe
  src="${snippetHost}/embed/${sandboxBotId}?theme=${sandboxTheme}"
  title="AgentDesk Support"
  style="width: 100%; height: 640px; border: 0;"
></iframe>`,
      react: `import Script from "next/script";

export function AgentDeskWidget() {
  return (
    <Script
      src="${snippetHost}/widget.js"
      strategy="afterInteractive"
      data-bot-id="${sandboxBotId}"
      data-theme="${sandboxTheme}"
      data-mode="launcher"
    />
  );
}`,
      vue: `<template>
  <div />
</template>

<script setup>
import { onMounted } from "vue";

onMounted(() => {
  const script = document.createElement("script");
  script.src = "${snippetHost}/widget.js";
  script.async = true;
  script.dataset.botId = "${sandboxBotId}";
  script.dataset.theme = "${sandboxTheme}";
  script.dataset.mode = "launcher";
  document.body.appendChild(script);
});
</script>`,
    }),
    [sandboxBotId, sandboxTheme, snippetHost],
  );

  const activeSnippet = sandboxSnippets[sandboxMode];

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
      <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-5 py-4 sm:px-6">
        <p className="studio-kicker inline-flex items-center gap-2 text-[#0099ff]">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
          Interactive tool
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--ui-text)]">
          Deployment Snippet Generator
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[var(--ui-muted)]">
          Enter the public bot ID and theme token, choose the deployment target, then copy the exact snippet for the current host.
        </p>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[320px_minmax(0,1fr)] sm:p-6">
        <div className="space-y-4">
          <DocField label="Bot ID" value={sandboxBotId} onChange={setSandboxBotId} />
          <DocField label="Theme token" value={sandboxTheme} onChange={setSandboxTheme} />
          <div>
            <label className="studio-kicker mb-2 block text-[var(--ui-muted)]">Deployment mode</label>
            <div className="grid gap-2">
              {deploymentModes.map((mode) => (
                <SnippetModeButton
                  active={sandboxMode === mode.id}
                  hint={mode.hint}
                  key={mode.id}
                  label={mode.label}
                  onClick={() => setSandboxMode(mode.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <DocCodeBlock
            id={`sandbox-${sandboxMode}`}
            label={`${deploymentModes.find((m) => m.id === sandboxMode)?.label ?? "Snippet"} snippet`}
            copiedId={copiedId}
            value={activeSnippet}
            onCopy={copyToClipboard}
          />
          <div className="rounded-2xl border border-[#0099ff]/25 bg-[#0099ff]/10 p-3 text-xs font-medium leading-5 text-[var(--ui-muted)]">
            <strong className="text-[var(--ui-text)]">Preview rule:</strong> custom header, message input, launcher icon, and feature toggle changes load through the widget config API for the selected bot.
          </div>
        </div>
      </div>
    </section>
  );
}

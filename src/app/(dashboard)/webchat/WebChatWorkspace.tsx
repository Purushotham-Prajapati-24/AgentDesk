"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Braces, Check, CheckCircle2, CloudUpload, Copy, Eye, Flag, Palette, RotateCcw, Save, SlidersHorizontal, X } from "lucide-react";
import { listWebChatBots, saveWebChatBotConfig, type WebChatBotSummary } from "@/app/webchat-actions";
import { WebChatDropdown } from "@/components/WebChatDropdown";
import { Button } from "@/components/ui/Button";
import { useWebChatConfig } from "@/context/WebChatConfigContext";
import { useTenant } from "@/context/TenantContext";
import { cn } from "@/lib/utils";
import type { WebChatConfig } from "@/lib/webchat-config";
import { BotAppearanceForm } from "./BotAppearanceForm";
import { BotIdentityForm } from "./BotIdentityForm";
import { DeploySettingsForm } from "./DeploySettingsForm";
import { FeatureToggleForm } from "./FeatureToggleForm";

type SectionId = "identity" | "appearance" | "deploy" | "features";

const sections: Array<{
  id: SectionId;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}> = [
  {
    id: "identity",
    title: "Bot Identity",
    description: "Name, avatar, and operating brief.",
    icon: <Bot aria-hidden="true" className="h-5 w-5" />,
    content: <BotIdentityForm />,
  },
  {
    id: "appearance",
    title: "Bot Appearance",
    description: "Theme colors, typography, and CSS overrides.",
    icon: <Palette aria-hidden="true" className="h-5 w-5" />,
    content: <BotAppearanceForm />,
  },
  {
    id: "deploy",
    title: "Deploy Settings",
    description: "Environment, versioning, and rollout posture.",
    icon: <CloudUpload aria-hidden="true" className="h-5 w-5" />,
    content: <DeploySettingsForm />,
  },
  {
    id: "features",
    title: "Feature Toggles",
    description: "Optional customer-facing capabilities.",
    icon: <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />,
    content: <FeatureToggleForm />,
  },
];

export function WebChatWorkspace() {
  const { tenant } = useTenant();
  const { config, error, replaceConfig, resetConfig } = useWebChatConfig();
  const [openSection, setOpenSection] = useState<SectionId>("identity");
  const [bots, setBots] = useState<WebChatBotSummary[]>([]);
  const [botLoading, setBotLoading] = useState(true);
  const [selectedBotId, setSelectedBotId] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const snippets = useMemo(() => buildSnippets(config), [config]);
  const selectedBot = useMemo(() => bots.find((bot) => bot.id === selectedBotId) ?? null, [bots, selectedBotId]);

  useEffect(() => {
    if (!tenant?.$id) {
      return;
    }

    let active = true;
    listWebChatBots(tenant.$id).then((response) => {
      if (!active) {
        return;
      }

      setBotLoading(false);
      if (!response.success) {
        setSaveState("error");
        setSaveError(response.error);
        return;
      }

      setBots(response.bots);
      const firstBot = response.bots[0];
      if (firstBot) {
        setSelectedBotId(firstBot.id);
        replaceConfig(firstBot.config);
      }
    });

    return () => {
      active = false;
    };
  }, [replaceConfig, tenant?.$id]);

  function selectBot(botId: string) {
    const bot = bots.find((item) => item.id === botId);
    setSelectedBotId(botId);
    setSaveState("idle");
    setSaveError("");
    if (bot) {
      replaceConfig(bot.config);
    }
  }

  async function saveSelectedBotConfig() {
    if (!tenant?.$id || !selectedBotId) {
      setSaveState("error");
      setSaveError("Choose a bot before saving WebChat preferences.");
      return;
    }

    setSaveState("saving");
    setSaveError("");
    const response = await saveWebChatBotConfig({
      tenantId: tenant.$id,
      botId: selectedBotId,
      config,
    });

    if (!response.success) {
      setSaveState("error");
      setSaveError(response.error);
      return;
    }

    setSaveState("saved");
    replaceConfig(response.config);
    setBots((current) =>
      current.map((bot) =>
        bot.id === selectedBotId
          ? {
              ...bot,
              name: response.config.identity.botName,
              config: response.config,
            }
          : bot,
      ),
    );
  }

  return (
    <div className="cockpit-lane min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#12b981]/35 bg-[radial-gradient(circle_at_14%_18%,rgba(20,184,166,0.32)_0%,transparent_28%),radial-gradient(circle_at_86%_8%,rgba(255,122,89,0.28)_0%,transparent_30%),linear-gradient(135deg,#f8fffb_0%,#d7fff1_42%,#e8f1ff_100%)] text-[#083344] shadow-[0_24px_70px_rgba(20,184,166,0.15)] dark:bg-[radial-gradient(circle_at_14%_18%,rgba(20,184,166,0.26)_0%,transparent_30%),radial-gradient(circle_at_86%_8%,rgba(255,122,89,0.22)_0%,transparent_32%),linear-gradient(135deg,#08110f_0%,#0b332e_48%,#10243d_100%)] dark:text-[#ecfeff]">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
            <div className="min-w-0">
              <p className="inline-flex rounded-full border border-[#0f766e]/20 bg-white/55 px-3 py-1 studio-kicker text-[#0f766e] dark:border-white/20 dark:bg-black/20 dark:text-[#ccfbf1]">
                WebChat control room
              </p>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-current sm:text-4xl lg:text-5xl">
                Shape the customer chat surface.
              </h1>
            </div>

            <div className="grid content-between gap-4 rounded-3xl border border-white/35 bg-white/40 p-4 text-[#083344] shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] dark:bg-black/20 dark:text-[#ecfeff]">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs font-semibold uppercase opacity-70">Publishing target</p>
                  <span className="rounded-full border border-white/35 bg-white/35 px-3 py-1 font-mono text-xs font-semibold dark:bg-black/15">
                    {saveState === "saved" ? "saved" : saveState}
                  </span>
                </div>
                <p className="mt-3 min-w-0 break-words text-2xl font-semibold tracking-[-0.03em]">
                  {selectedBot?.name ?? (botLoading ? "Loading bots..." : "Choose a bot")}
                </p>
                <p className="mt-2 break-all font-mono text-xs font-semibold opacity-70">{selectedBotId || tenant?.$id || "No target selected"}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Button
                  className="w-full rounded-full border-white/35 bg-white/35 text-current hover:bg-white/50 dark:bg-black/20 dark:hover:bg-black/30"
                  leftIcon={<RotateCcw aria-hidden="true" className="h-4 w-4" />}
                  onClick={resetConfig}
                  type="button"
                  variant="outline"
                >
                  Reset draft
                </Button>
                <Button
                  className="w-full rounded-full"
                  disabled={!selectedBotId}
                  leftIcon={<Save aria-hidden="true" className="h-4 w-4" />}
                  loading={saveState === "saving"}
                  onClick={() => void saveSelectedBotConfig()}
                  type="button"
                >
                  Save to bot
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 xl:grid-cols-[minmax(360px,0.94fr)_minmax(0,1.06fr)] lg:px-8">
        <aside className="grid min-w-0 content-start gap-4">
          <BotSelector
            bots={bots}
            loading={botLoading}
            selectedBotId={selectedBotId}
            onSelect={selectBot}
          />
          <StatusStrip saveState={saveState} error={saveError || error} />
          {sections.map((section) => (
            <WebChatDropdown
              description={section.description}
              icon={section.icon}
              id={section.id}
              key={section.id}
              onToggle={(id) => setOpenSection(id as SectionId)}
              open={openSection === section.id}
              title={section.title}
            >
              {section.content}
            </WebChatDropdown>
          ))}
        </aside>

        <main className="grid min-w-0 gap-5">
          <WidgetPreview config={config} />
          <section className="grid gap-4 lg:grid-cols-2">
            <CodeBlock label="Script embed" value={snippets.script} />
            <CodeBlock label="Iframe embed" value={snippets.iframe} />
            <CodeBlock label="React" value={snippets.react} />
            <CodeBlock label="Vue" value={snippets.vue} />
          </section>
        </main>
      </div>
    </div>
  );
}

function BotSelector({
  bots,
  loading,
  selectedBotId,
  onSelect,
}: {
  bots: WebChatBotSummary[];
  loading: boolean;
  selectedBotId: string;
  onSelect: (botId: string) => void;
}) {
  return (
    <section className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="studio-kicker text-[#0099ff]">Bot target</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--ui-text)]">Preference owner</h2>
        </div>
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", selectedBotId ? "bg-[#22c55e]/15 text-[#22c55e]" : "bg-destructive/10 text-destructive")}>
          {!selectedBotId ? <AlertTriangle aria-hidden="true" className="h-5 w-5" /> : <CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
        </span>
      </div>
      <select
        className="min-h-12 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 text-sm font-semibold text-[var(--ui-text)] outline-none transition focus:border-[var(--ui-blue)] focus:bg-[var(--ui-panel-2)]"
        disabled={loading || bots.length === 0}
        value={selectedBotId}
        onChange={(event) => onSelect(event.target.value)}
      >
        <option value="">{loading ? "Loading bots..." : "Select a bot"}</option>
        {bots.map((bot) => (
          <option key={bot.id} value={bot.id}>
            {bot.name} / {bot.id}
          </option>
        ))}
      </select>
      <p className="mt-3 text-sm font-medium leading-6 text-[var(--ui-muted)]">
        WebChat preferences are saved to the selected bot&apos;s Appwrite `theme_config`; the embed script reads them with `data-bot-id`.
      </p>
    </section>
  );
}

function StatusStrip({ saveState, error }: { saveState: string; error: string }) {
  const label = saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving" : saveState === "error" ? "Needs attention" : "Draft";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-[1.25rem] border px-4 py-3",
        saveState === "error" ? "border-destructive/45 bg-destructive/10 text-destructive" : "border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-text)]",
      )}
      role={saveState === "error" ? "alert" : "status"}
    >
      <span className="flex items-center gap-2 font-mono text-xs font-semibold uppercase">
        {saveState === "saved" ? <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[#22c55e]" /> : <Flag aria-hidden="true" className="h-4 w-4" />}
        {label}
      </span>
      <span className="text-right text-xs font-semibold text-[var(--ui-muted)]">{error || "Local draft persists in this browser."}</span>
    </div>
  );
}

function WidgetPreview({ config }: { config: WebChatConfig }) {
  const fontFamily = fontStack(config.appearance.fontFamily);
  const headerFontFamily = fontStack(config.appearance.headerFontFamily);
  const inputFontFamily = fontStack(config.appearance.inputFontFamily);
  const headerTitle = config.appearance.headerTitle || config.identity.botName;
  const headerSubtitle = config.appearance.headerSubtitle || `${config.deploy.environment} / ${config.deploy.versionTag}`;
  const inputPlaceholder = config.appearance.inputPlaceholder || "Write your message here...";
  const showCustomIcon = config.appearance.useCustomIcon && isHttpUrl(config.appearance.widgetIconUrl);

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-5 py-4">
        <div>
          <p className="studio-kicker text-[#0099ff]">Live preview</p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--ui-text)]">Customer widget</h2>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ui-text)] text-[var(--ui-bg)]">
          <Eye aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>

      <div className="flex min-h-[540px] items-center justify-center overflow-hidden bg-[var(--ui-bg)] p-4 sm:p-6 lg:min-h-[640px]">
        <div className="relative w-full max-w-[410px]">
          <div
            className="flex h-[min(590px,calc(100svh-220px))] min-h-[440px] w-full flex-col overflow-hidden rounded-2xl border border-[#eceae4]"
            style={{
              background: config.appearance.backgroundColor,
              color: config.appearance.textColor,
              fontFamily,
            }}
          >
            <div
              className="flex items-center justify-between gap-3 border-b border-black/15 px-4 py-4"
              style={{ background: config.appearance.headerColor, fontFamily: headerFontFamily }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 text-lg font-semibold text-black"
                  style={{ background: config.appearance.accentColor }}
                >
                  {config.identity.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-full w-full object-cover" src={config.identity.avatarUrl} />
                  ) : (
                    config.identity.botName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold" style={{ color: config.appearance.headerTextColor }}>
                    {headerTitle}
                  </p>
                  <p className="truncate text-xs font-bold" style={{ color: config.appearance.headerSubtextColor }}>
                    {headerSubtitle}
                  </p>
                </div>
              </div>
              <button
                aria-label="Close widget preview"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20"
                style={{ color: config.appearance.headerCloseButtonColor }}
                title="Close"
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <PreviewBubble color={config.appearance.botBubbleColor} textColor={config.appearance.textColor}>
                {config.identity.description}
              </PreviewBubble>
              <PreviewBubble align="right" color={config.appearance.userBubbleColor} textColor="#000000">
                I need help with my order.
              </PreviewBubble>
              <PreviewBubble color={config.appearance.botBubbleColor} textColor={config.appearance.textColor}>
                I can answer from verified sources{config.features.humanHandoff ? " and bring in a human operator" : ""}.
              </PreviewBubble>
              {config.features.sourceCitations ? (
                <div className="border border-black/20 bg-black/10 px-3 py-2 font-mono text-xs font-semibold">Sources enabled</div>
              ) : null}
            </div>

            <div className="border-t border-black p-4">
              <div className="flex gap-2">
                <div
                  className="flex min-h-12 flex-1 items-center rounded-xl border px-3 text-sm font-semibold"
                  style={{
                    background: config.appearance.inputBackgroundColor,
                    borderColor: config.appearance.inputBorderColor,
                    color: config.appearance.inputPlaceholderColor,
                    fontFamily: inputFontFamily,
                  }}
                >
                  {inputPlaceholder}
                </div>
                <button className="min-h-12 rounded-xl border border-black/10 px-4 text-sm font-semibold text-black" style={{ background: config.appearance.accentColor }} type="button">
                  Send
                </button>
              </div>
            </div>
          </div>

          <button
            aria-label="Launcher preview"
            className="absolute bottom-[-50px] right-[-8px] z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-black/10 text-2xl font-semibold text-black sm:bottom-[-52px] sm:right-[-18px] sm:h-16 sm:w-16 sm:text-3xl"
            style={{ background: config.appearance.accentColor }}
            type="button"
          >
            {showCustomIcon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="h-full w-full object-cover" src={config.appearance.widgetIconUrl} />
            ) : (
              <Bot aria-hidden="true" className="h-7 w-7" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

function PreviewBubble({
  align = "left",
  color,
  textColor,
  children,
}: {
  align?: "left" | "right";
  color: string;
  textColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex", align === "right" ? "justify-end" : "justify-start")}>
      <p className="max-w-[92%] break-words rounded-[18px] border border-black/15 px-4 py-3 text-sm font-medium leading-6 sm:max-w-[82%]" style={{ background: color, color: textColor }}>
        {children}
      </p>
    </div>
  );
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copySnippet() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Braces aria-hidden="true" className="h-4 w-4 shrink-0 text-[#0099ff]" />
          <p className="studio-kicker truncate text-[var(--ui-muted)]">{label}</p>
        </div>
        <button
          aria-label={`Copy ${label}`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--ui-border)] text-[var(--ui-muted)] transition hover:border-[var(--ui-blue)] hover:bg-[var(--ui-blue)]/10 hover:text-[var(--ui-text)]"
          onClick={() => void copySnippet()}
          title={`Copy ${label}`}
          type="button"
        >
          {copied ? <Check aria-hidden="true" className="h-4 w-4 text-[#22c55e]" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
      <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words font-mono text-xs font-semibold leading-5 text-[var(--ui-text)]">{value}</pre>
    </div>
  );
}

function buildSnippets(config: WebChatConfig) {
  const botId = config.deploy.botId || "YOUR_BOT_ID";
  const theme = config.deploy.themeId || config.deploy.versionTag;

  return {
    script: `<script src="https://agentdeskbot.vercel.app/widget.js" data-bot-id="${botId}" data-theme="${theme}" async></script>`,
    iframe: `<iframe src="https://agentdeskbot.vercel.app/embed/${botId}?theme=${theme}" title="${config.identity.botName}" style="width:100%;height:640px;border:0"></iframe>`,
    react: `import { AgentDeskWidget } from "@agentdesk/widget/react";\n\n<AgentDeskWidget botId="${botId}" theme="${theme}" />`,
    vue: `<AgentDeskWidget bot-id="${botId}" theme="${theme}" />`,
  };
}

function fontStack(font: WebChatConfig["appearance"]["fontFamily"]) {
  if (font === "Outfit") {
    return "Outfit, system-ui, sans-serif";
  }

  if (font === "System") {
    return "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  }

  if (font === "Mono") {
    return "Fira Code, Consolas, ui-monospace, monospace";
  }

  return "Inter, system-ui, sans-serif";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

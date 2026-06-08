"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Braces, Check, CheckCircle2, CloudUpload, Copy, Eye, Flag, Palette, RotateCcw, Save, SlidersHorizontal, X } from "lucide-react";
import { listWebChatBots, saveWebChatBotConfig, type WebChatBotSummary } from "@/app/webchat-actions";
import { WebChatDropdown } from "@/components/WebChatDropdown";
import { Button } from "@/components/ui/Button";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/SelectMenu";
import { useWebChatConfig } from "@/context/WebChatConfigContext";
import { useTenant } from "@/context/TenantContext";
import { cn } from "@/lib/utils";
import type { WebChatConfig } from "@/lib/webchat-config";
import { BotAppearanceForm } from "./BotAppearanceForm";
import { BotIdentityForm } from "./BotIdentityForm";
import { DeploySettingsForm } from "./DeploySettingsForm";
import { FeatureToggleForm } from "./FeatureToggleForm";

type SectionId = "identity" | "appearance" | "deploy" | "features";
type DeploymentTabId = "script" | "iframe" | "react" | "vue";

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

const deploymentTabs: Array<{
  id: DeploymentTabId;
  label: string;
  summary: string;
}> = [
  {
    id: "script",
    label: "Script",
    summary: "Floating launcher on any website.",
  },
  {
    id: "iframe",
    label: "Iframe embedded",
    summary: "Inline chat surface inside a page.",
  },
  {
    id: "react",
    label: "React/Next.js",
    summary: "Component install for app shells.",
  },
  {
    id: "vue",
    label: "Vue",
    summary: "Component install for Vue apps.",
  },
];

type DeploymentGuide = {
  title: string;
  intro: string;
  placement: string;
  highlight: string;
  steps: Array<{
    title: string;
    body: string;
    example?: string;
  }>;
};

const deploymentGuides: Record<DeploymentTabId, DeploymentGuide> = {
  script: {
    title: "Install the floating website launcher",
    intro: "Use this when the chat should appear as a floating bubble on your website.",
    placement: "Put the script once, just before the closing </body> tag.",
    highlight: "Keep data-bot-id unchanged. It controls which bot and saved appearance load.",
    steps: [
      {
        title: "Open the global page shell",
        body: "Use the shared HTML layout, theme footer, or site-wide custom-code area.",
      },
      {
        title: "Paste the snippet once",
        body: "Place it after the page content so it loads after the visible page.",
        example: "<body>\n  <main>...</main>\n  <!-- AgentDesk WebChat goes here -->\n  <script ...></script>\n</body>",
      },
      {
        title: "Check the live page",
        body: "Confirm the launcher does not cover cookie banners, checkout buttons, or sticky support controls.",
      },
      {
        title: "Use separate bot IDs per environment",
        body: "Use a staging bot ID or theme tag if your team tests changes before production.",
      },
    ],
  },
  iframe: {
    title: "Embed a full chat panel inside a page",
    intro: "Use this when the chat should be visible inside a help page or dashboard section.",
    placement: "Place the iframe inside the content area where users expect support.",
    highlight: "Give the iframe a stable height, usually around 640px on desktop.",
    steps: [
      {
        title: "Choose the support section",
        body: "Put it under a support heading or beside the article/task it helps with.",
      },
      {
        title: "Wrap it in a responsive container",
        body: "Use a full-width wrapper with enough height for the header, messages, and input.",
        example: '<section class="support-chat">\n  <iframe ...></iframe>\n</section>',
      },
      {
        title: "Check mobile height",
        body: "Preview under 480px width and make sure the message input stays usable.",
      },
      {
        title: "Compare with preview",
        body: "Open the preview link and confirm the iframe shows the same bot, greeting, and theme.",
      },
    ],
  },
  react: {
    title: "Mount the widget in a React or Next.js app",
    intro: "Use this when the launcher should follow users across app routes.",
    placement: "Render the widget once near the root layout, usually after the page children.",
    highlight: "Do not mount it inside every page. That can create duplicate launchers.",
    steps: [
      {
        title: "Create a small client component",
        body: "Keep the widget in a small browser-only component instead of mixing it into page content.",
        example: '"use client";\nimport { AgentDeskWidget } from "@agentdesk/widget/react";\n\nexport function SupportWidget() {\n  return <AgentDeskWidget botId="YOUR_BOT_ID" theme="production" />;\n}',
      },
      {
        title: "Place it in the app shell",
        body: "Render it after the page content so it floats without changing the page layout.",
        example: "<body>\n  {children}\n  <SupportWidget />\n</body>",
      },
      {
        title: "Use the public bot ID",
        body: "The client bundle should only contain the public bot ID and theme tag.",
      },
      {
        title: "Test route changes",
        body: "Navigate across two routes and confirm the launcher appears once and keeps its position.",
      },
    ],
  },
  vue: {
    title: "Register the widget in a Vue app",
    intro: "Use this when the launcher should live in a shared Vue or Nuxt layout.",
    placement: "Place the widget once near the end of App.vue or the default layout template.",
    highlight: "Use kebab-case props in templates: bot-id and theme.",
    steps: [
      {
        title: "Import or register the component",
        body: "Add the widget to the shared layout that wraps your pages.",
        example: '<script setup>\nimport { AgentDeskWidget } from "@agentdesk/widget/vue";\n</script>',
      },
      {
        title: "Place it after the router view",
        body: "Render it after the page outlet so it floats over the app without pushing content.",
        example: "<template>\n  <RouterView />\n  <AgentDeskWidget bot-id=\"YOUR_BOT_ID\" theme=\"production\" />\n</template>",
      },
      {
        title: "Verify production values",
        body: "Confirm bot-id points to the saved bot and theme matches the customer-facing deployment.",
      },
      {
        title: "Check navigation and overlays",
        body: "Open pages with drawers, modals, or sticky footers and make sure the launcher stays reachable.",
      },
    ],
  },
};

export function WebChatWorkspace() {
  const { tenant } = useTenant();
  const { config, error, replaceConfig, resetConfig } = useWebChatConfig();
  const [openSection, setOpenSection] = useState<SectionId | null>("identity");
  const [bots, setBots] = useState<WebChatBotSummary[]>([]);
  const [botLoading, setBotLoading] = useState(true);
  const [selectedBotId, setSelectedBotId] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deployTab, setDeployTab] = useState<DeploymentTabId>("script");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<{ botId: string; botName: string } | null>(null);
  const snippets = useMemo(() => buildSnippets(config), [config]);
  const selectedBot = useMemo(() => bots.find((bot) => bot.id === selectedBotId) ?? null, [bots, selectedBotId]);
  const hasUnsavedChanges = useMemo(() => (selectedBot ? serializeWebChatConfig(config) !== serializeWebChatConfig(selectedBot.config) : false), [config, selectedBot]);
  const canSaveChanges = Boolean(selectedBotId && hasUnsavedChanges && saveState !== "saving");
  const saveButtonActive = Boolean(selectedBotId && (hasUnsavedChanges || saveState === "saving"));
  const saveButtonTitle = !selectedBotId ? "Choose a bot before saving." : hasUnsavedChanges ? "Save changes to this bot." : "No changes to save.";
  const deployPreviewUrl = selectedBotId ? buildEmbedPreviewUrl(selectedBotId) : "";
  const deploymentGuide = deploymentGuides[deployTab];
  const selectedDeploymentLabel = deploymentTabs.find((tab) => tab.id === deployTab)?.label ?? "Deploy";
  const [previewCopied, setPreviewCopied] = useState(false);

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

  useEffect(() => {
    if (!deployModalOpen && !resetConfirmOpen && !saveSuccess) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDeployModalOpen(false);
        setResetConfirmOpen(false);
        setSaveSuccess(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deployModalOpen, resetConfirmOpen, saveSuccess]);

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

    if (!hasUnsavedChanges) {
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
    setSaveSuccess({ botId: selectedBotId, botName: response.config.identity.botName });
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

  function confirmResetConfig() {
    resetConfig();
    setSaveState("idle");
    setSaveError("");
    setResetConfirmOpen(false);
  }

  function openLivePreview(botId: string) {
    window.open(buildEmbedPreviewUrl(botId), "_blank", "noopener,noreferrer");
  }

  async function copyLivePreviewUrl() {
    if (!deployPreviewUrl) {
      return;
    }

    await navigator.clipboard.writeText(deployPreviewUrl);
    setPreviewCopied(true);
    setTimeout(() => setPreviewCopied(false), 1600);
  }

  return (
    <div className="cockpit-lane min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <section className="px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#12b981]/35 bg-[radial-gradient(circle_at_14%_18%,rgba(20,184,166,0.32)_0%,transparent_28%),radial-gradient(circle_at_86%_8%,rgba(255,122,89,0.28)_0%,transparent_30%),linear-gradient(135deg,#f8fffb_0%,#d7fff1_42%,#e8f1ff_100%)] text-[#083344] shadow-[0_24px_70px_rgba(20,184,166,0.15)] dark:bg-[radial-gradient(circle_at_14%_18%,rgba(20,184,166,0.26)_0%,transparent_30%),radial-gradient(circle_at_86%_8%,rgba(255,122,89,0.22)_0%,transparent_32%),linear-gradient(135deg,#08110f_0%,#0b332e_48%,#10243d_100%)] dark:text-[#ecfeff]">
          <div className="grid items-center gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_330px] lg:p-4">
            <div className="min-w-0">
              <p className="inline-flex rounded-full border border-[#0f766e]/20 bg-white/55 px-2.5 py-1 studio-kicker text-[#0f766e] dark:border-white/20 dark:bg-black/20 dark:text-[#ccfbf1]">
                WebChat control room
              </p>
              <h1 className="mt-1.5 max-w-4xl text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-current sm:text-4xl lg:text-[2.75rem]">
                Shape the customer chat surface.
              </h1>
            </div>

            <div className="grid gap-2 rounded-2xl border border-white/35 bg-white/40 p-3 text-[#083344] shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] dark:bg-black/20 dark:text-[#ecfeff]">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs font-semibold uppercase opacity-70">Publishing target</p>
                  <span className="rounded-full border border-white/35 bg-white/35 px-2.5 py-0.5 font-mono text-xs font-semibold dark:bg-black/15">
                    {saveState === "saved" ? "saved" : saveState}
                  </span>
                </div>
                <p className="mt-1.5 min-w-0 break-words text-lg font-semibold tracking-[-0.03em]">
                  {selectedBot?.name ?? (botLoading ? "Loading bots..." : "Choose a bot")}
                </p>
                <p className="mt-0.5 break-all font-mono text-xs font-semibold opacity-70">{selectedBotId || tenant?.$id || "No target selected"}</p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {deployModalOpen ? (
        <div
          aria-labelledby="webchat-deploy-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-3 py-4 shadow-[inset_0_0_160px_rgba(0,0,0,0.72)] backdrop-blur-sm sm:px-5"
          id="webchat-deploy-modal"
          onClick={() => setDeployModalOpen(false)}
          role="dialog"
        >
          <div
            className="flex h-[min(820px,calc(100svh-32px))] w-[min(1120px,calc(100vw-24px))] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#070b14] text-white shadow-[0_34px_120px_rgba(0,0,0,0.62)] sm:w-[min(1120px,calc(100vw-40px))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#0b1020] px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-semibold uppercase text-[#93c5fd]">Deployment guide</p>
                <h2 className="mt-1 truncate text-xl font-semibold tracking-[-0.02em] sm:text-2xl" id="webchat-deploy-title">
                  Publish WebChat with {selectedDeploymentLabel}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  className="h-10 rounded-full border-white/10 bg-white/[0.08] px-3 !text-white hover:bg-white/[0.12] disabled:bg-white/[0.04]"
                  disabled={!selectedBotId}
                  leftIcon={<Eye aria-hidden="true" className="h-4 w-4" />}
                  onClick={() => selectedBotId && openLivePreview(selectedBotId)}
                  size="sm"
                  title={selectedBotId ? "Open live preview in a new tab." : "Choose a bot to open the live preview."}
                  type="button"
                  variant="outline"
                >
                  Live preview
                </Button>
                <button
                  aria-label="Close deployment window"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.08] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
                  onClick={() => setDeployModalOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[244px_minmax(0,1fr)]">
              <div className="shrink-0 border-b border-white/10 bg-[#090e19] p-2 lg:border-b-0 lg:border-r" role="tablist" aria-label="Deployment formats">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {deploymentTabs.map((tab) => {
                    const selected = deployTab === tab.id;

                    return (
                      <button
                        aria-controls={`webchat-deploy-panel-${tab.id}`}
                        aria-selected={selected}
                        className={cn(
                          "min-h-14 rounded-xl px-3 py-2 text-left transition",
                          selected ? "bg-white/[0.1] text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white",
                        )}
                        id={`webchat-deploy-tab-${tab.id}`}
                        key={tab.id}
                        onClick={() => setDeployTab(tab.id)}
                        role="tab"
                        type="button"
                      >
                        <span className="block text-sm font-semibold">{tab.label}</span>
                        <span className={cn("mt-1 block text-[11px] font-medium leading-4", selected ? "text-white/65" : "text-white/40")}>{tab.summary}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                aria-labelledby={`webchat-deploy-tab-${deployTab}`}
                className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]"
                id={`webchat-deploy-panel-${deployTab}`}
                role="tabpanel"
              >
                <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] xl:items-start">
                    <DeploymentGuidePanel guide={deploymentGuide} />
                    <div className="grid gap-2">
                      <p className="font-mono text-[11px] font-semibold uppercase text-[#93c5fd]">Snippet</p>
                      <CodeBlock label={`${selectedDeploymentLabel} snippet`} value={snippets[deployTab]} />
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-[#090e19] p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 font-mono text-[11px] font-semibold uppercase text-white/40">Preview link</p>
                    {deployPreviewUrl ? (
                      <a
                        className="block min-w-0 truncate rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs font-semibold text-white/80 transition hover:border-[#60a5fa]/40 hover:text-white"
                        href={deployPreviewUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {deployPreviewUrl}
                      </a>
                    ) : (
                      <p className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-medium text-white/45">
                        Choose a bot to generate a live preview link.
                      </p>
                    )}
                  </div>
                  <Button
                    className="h-10 rounded-full border-white/10 bg-white/[0.08] px-4 !text-white hover:bg-white/[0.12] disabled:bg-white/[0.04]"
                    disabled={!deployPreviewUrl}
                    leftIcon={previewCopied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                    onClick={copyLivePreviewUrl}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {previewCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {resetConfirmOpen ? (
        <div
          aria-labelledby="webchat-reset-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 shadow-[inset_0_0_160px_rgba(0,0,0,0.72)] backdrop-blur-sm"
          onClick={() => setResetConfirmOpen(false)}
          role="dialog"
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1020] text-white shadow-[0_34px_120px_rgba(0,0,0,0.62)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.28)_0%,transparent_42%),linear-gradient(90deg,rgba(251,191,36,0.14)_0%,rgba(194,65,12,0.12)_100%)]" />
            <button
              aria-label="Close reset confirmation"
              className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.08] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
              onClick={() => setResetConfirmOpen(false)}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>

            <div className="relative grid gap-6 p-6 sm:p-8">
              <div className="grid gap-4 pr-12">
                <div className="flex items-center gap-5">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[#fdba74]/30 bg-[#f97316]/20 text-[#fdba74] shadow-[0_18px_45px_rgba(249,115,22,0.2)]">
                    <AlertTriangle aria-hidden="true" className="h-8 w-8" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-3xl font-semibold leading-[1.05] tracking-[-0.03em]" id="webchat-reset-title">
                      Reset customizations?
                    </h2>
                  </div>
                </div>
                <div>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                    This returns the current WebChat draft to the default identity, appearance, deployment settings, and feature toggles.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#f97316]/25 bg-[#f97316]/10 p-4">
                <p className="text-sm font-semibold text-[#fdba74]">Saved agent settings will not change yet.</p>
                <p className="mt-1 text-sm leading-6 text-white/60">The reset affects this editor draft. Nothing is written to the selected bot until you click Save changes.</p>
              </div>
            </div>

            <div className="grid gap-3 border-t border-white/10 bg-[#070b14] p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6">
              <p className="text-sm font-medium text-white/60">Keep editing, or reset the draft back to defaults.</p>
              <Button
                className="h-10 rounded-full border-white/10 bg-white/[0.08] px-4 !text-white hover:bg-white/[0.12]"
                onClick={() => setResetConfirmOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="h-10 rounded-full border-[#fb923c]/60 bg-[linear-gradient(135deg,#fbbf24_0%,#f97316_48%,#c2410c_100%)] px-4 !text-white shadow-[0_10px_24px_rgba(194,65,12,0.22)] hover:border-[#fdba74]/80 hover:brightness-[1.06]"
                leftIcon={<RotateCcw aria-hidden="true" className="h-4 w-4" />}
                onClick={confirmResetConfig}
                type="button"
              >
                Reset to defaults
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {saveSuccess ? (
        <div
          aria-labelledby="webchat-save-success-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 shadow-[inset_0_0_160px_rgba(0,0,0,0.72)] backdrop-blur-sm"
          onClick={() => setSaveSuccess(null)}
          role="dialog"
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1020] text-white shadow-[0_34px_120px_rgba(0,0,0,0.62)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_24%_0%,rgba(34,197,94,0.24)_0%,transparent_42%),linear-gradient(90deg,rgba(56,189,248,0.12)_0%,rgba(124,58,237,0.12)_100%)]" />
            <button
              aria-label="Close save confirmation"
              className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.08] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
              onClick={() => setSaveSuccess(null)}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>

            <div className="relative grid gap-6 p-6 sm:p-8">
              <div className="flex items-start gap-5 pr-12">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[#86efac]/30 bg-[#22c55e]/20 text-[#86efac] shadow-[0_18px_45px_rgba(34,197,94,0.18)]">
                  <CheckCircle2 aria-hidden="true" className="h-8 w-8" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold uppercase text-[#86efac]">Saved</p>
                  <h2 className="mt-2 text-3xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-4xl" id="webchat-save-success-title">
                    Changes saved successfully.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                    Your WebChat configuration is saved for this agent. Preview the live embed now or open deployment snippets.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,auto)] sm:items-center">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold uppercase text-white/50">Agent</p>
                  <p className="mt-1 truncate text-xl font-semibold tracking-[-0.02em]">{saveSuccess.botName}</p>
                </div>
                <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <p className="font-mono text-[10px] font-semibold uppercase text-white/40">ID</p>
                  <p className="mt-1 break-all font-mono text-xs font-semibold text-white/70">{saveSuccess.botId}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 border-t border-white/10 bg-[#070b14] p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-6">
              <p className="text-sm font-medium text-white/60">Open the live embed or continue to deployment snippets.</p>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#38bdf8]/60 bg-[linear-gradient(135deg,#38bdf8_0%,#2563eb_52%,#1d4ed8_100%)] px-4 text-sm font-semibold !text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:border-[#93c5fd]/80 hover:brightness-[1.06]"
                onClick={() => openLivePreview(saveSuccess.botId)}
                type="button"
              >
                <Eye aria-hidden="true" className="h-4 w-4" />
                Live preview
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#8b5cf6]/60 bg-[linear-gradient(135deg,#38bdf8_0%,#6366f1_46%,#7c3aed_100%)] px-4 text-sm font-semibold !text-white shadow-[0_10px_26px_rgba(99,102,241,0.28)] transition hover:border-[#c4b5fd]/80 hover:brightness-[1.06]"
                onClick={() => {
                  setSaveSuccess(null);
                  setDeployModalOpen(true);
                }}
                type="button"
              >
                <CloudUpload aria-hidden="true" className="h-4 w-4" />
                Deploy
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-7xl items-start gap-5 px-4 pb-8 sm:px-6 xl:grid-cols-[minmax(360px,0.94fr)_minmax(0,1.06fr)] lg:px-8">
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
              onToggle={(id) => setOpenSection((current) => (current === id ? null : (id as SectionId)))}
              open={openSection === section.id}
              title={section.title}
            >
              {section.content}
            </WebChatDropdown>
          ))}
        </aside>

        <main className="grid min-w-0 content-start gap-3">
          <section className="grid gap-2 rounded-[1.25rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-2 sm:grid-cols-3">
            <Button
              className="h-9 w-full rounded-full border-[#fb923c]/60 bg-[linear-gradient(135deg,#fbbf24_0%,#f97316_48%,#c2410c_100%)] px-3 !text-white shadow-[0_10px_24px_rgba(194,65,12,0.22)] hover:border-[#fdba74]/80 hover:brightness-[1.06]"
              leftIcon={<RotateCcw aria-hidden="true" className="h-4 w-4" />}
              onClick={() => setResetConfirmOpen(true)}
              type="button"
              variant="outline"
            >
              Reset
            </Button>
            <Button
              className={cn(
                "h-9 w-full rounded-full px-3 !text-white disabled:shadow-none",
                saveButtonActive
                  ? "border-[#22c55e]/60 bg-[linear-gradient(135deg,#86efac_0%,#22c55e_45%,#15803d_100%)] shadow-[0_10px_24px_rgba(21,128,61,0.24)] hover:border-[#86efac]/80 hover:brightness-[1.06]"
                  : "border-white/10 bg-[linear-gradient(135deg,#334155_0%,#1f2937_55%,#111827_100%)] !text-white/55 shadow-none",
              )}
              disabled={!canSaveChanges}
              leftIcon={<Save aria-hidden="true" className="h-4 w-4" />}
              loading={saveState === "saving"}
              onClick={() => void saveSelectedBotConfig()}
              title={saveButtonTitle}
              type="button"
            >
              Save changes
            </Button>
            <Button
              aria-controls="webchat-deploy-modal"
              aria-expanded={deployModalOpen}
              aria-haspopup="dialog"
              className="h-9 w-full rounded-full border-[#8b5cf6]/60 bg-[linear-gradient(135deg,#38bdf8_0%,#6366f1_46%,#7c3aed_100%)] px-3 !text-white shadow-[0_10px_26px_rgba(99,102,241,0.28)] hover:border-[#c4b5fd]/80 hover:brightness-[1.06]"
              leftIcon={<CloudUpload aria-hidden="true" className="h-4 w-4" />}
              onClick={() => setDeployModalOpen(true)}
              type="button"
            >
              Deploy
            </Button>
          </section>
          <WidgetPreview config={config} />
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
  const botOptions: SelectMenuOption[] = [
    {
      label: loading ? "Loading bots..." : bots.length === 0 ? "No bots available" : "Select a bot",
      value: "",
      description: loading ? "Fetching bot targets" : bots.length === 0 ? "Create a bot before configuring WebChat" : "No preference owner selected",
    },
    ...bots.map((bot) => ({
      label: bot.name,
      value: bot.id,
      description: bot.id,
    })),
  ];

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
      <SelectMenu
        ariaLabel="Bot target"
        disabled={loading || bots.length === 0}
        options={botOptions}
        placeholder={loading ? "Loading bots..." : "Select a bot"}
        value={selectedBotId}
        onChange={onSelect}
      />
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

      <div className="flex min-h-[560px] items-center justify-center overflow-hidden bg-[var(--ui-bg)] p-4 sm:p-5 lg:min-h-[620px]">
        <div className="relative w-full max-w-[410px] pb-14 sm:pb-16">
          <div
            className="flex h-[min(570px,calc(100svh-190px))] min-h-[440px] w-full flex-col overflow-hidden rounded-2xl border border-[#eceae4]"
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
            className="absolute bottom-0 right-[-8px] z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-black/10 text-2xl font-semibold text-black sm:right-[-18px] sm:h-16 sm:w-16 sm:text-3xl"
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

function DeploymentGuidePanel({ guide }: { guide: DeploymentGuide }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="p-4">
        <p className="font-mono text-[11px] font-semibold uppercase text-[#93c5fd]">Install guide</p>
        <h3 className="mt-2 text-lg font-semibold leading-6 tracking-[-0.02em] text-white">{guide.title}</h3>
        <p className="mt-2 text-xs font-medium leading-5 text-white/60">{guide.intro}</p>
      </div>

      <div className="border-y border-white/10 px-4 py-3">
        <p className="text-xs font-medium leading-5 text-white/70">
          <span className="font-mono text-[11px] font-semibold uppercase text-[#93c5fd]">Place it: </span>
          {guide.placement}
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[#facc15]">{guide.highlight}</p>
      </div>

      <ol className="divide-y divide-white/10">
        {guide.steps.map((step, index) => (
          <li className="p-4 transition hover:bg-white/[0.04]" key={step.title}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 font-mono text-xs font-semibold text-[#93c5fd]">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5 text-white">{step.title}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-white/60">{step.body}</p>
                {step.example ? <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-xl bg-black/25 p-2 font-mono text-[11px] font-semibold leading-4 text-[#bfdbfe]">{step.example}</pre> : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#050816]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Braces aria-hidden="true" className="h-4 w-4 shrink-0 text-[#93c5fd]" />
          <p className="font-mono text-[11px] font-semibold uppercase text-white/50">{label}</p>
        </div>
        <button
          aria-label={`Copy ${label}`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/60 transition hover:border-[#60a5fa]/40 hover:bg-white/[0.1] hover:text-white"
          onClick={() => void copySnippet()}
          title={`Copy ${label}`}
          type="button"
        >
          {copied ? <Check aria-hidden="true" className="h-4 w-4 text-[#22c55e]" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] font-semibold leading-5 text-[#dbeafe]">{value}</pre>
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

function buildEmbedPreviewUrl(botId: string) {
  const origin = typeof window === "undefined" ? "http://agentdeskbot.vercel.app" : window.location.origin;
  return `${origin}/embed/${encodeURIComponent(botId)}`;
}

function serializeWebChatConfig(config: WebChatConfig) {
  return JSON.stringify(config);
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

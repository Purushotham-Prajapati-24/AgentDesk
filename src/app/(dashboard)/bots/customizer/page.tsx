"use client";

import { FormEvent, useMemo, useState } from "react";
import { Paintbrush, Save } from "lucide-react";
import { databases } from "@/lib/appwrite";
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/Button";
import { PageHeader, Panel, StatusPill } from "@/components/ui/Signal";

type FontChoice = "Fira" | "Outfit" | "System";

type CustomizerState = {
  botId: string;
  tenantId: string;
  botName: string;
  greeting: string;
  headerColor: string;
  backgroundColor: string;
  textColor: string;
  userBubbleColor: string;
  botBubbleColor: string;
  accentColor: string;
  fontFamily: FontChoice;
  useCustomIcon: boolean;
  widgetIconUrl: string;
};

type SaveState =
  | { status: "idle"; message: "" }
  | { status: "saving"; message: "Saving style..." }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const DEFAULT_STATE: CustomizerState = {
  botId: "",
  tenantId: "",
  botName: "AgentDesk Support",
  greeting: "You hit the support line. I can check policy, answer from documents, or bring in an operator.",
  headerColor: "#0D1013",
  backgroundColor: "#050607",
  textColor: "#F5F1E8",
  userBubbleColor: "#F59E0B",
  botBubbleColor: "#14191E",
  accentColor: "#22D3EE",
  fontFamily: "Fira",
  useCustomIcon: false,
  widgetIconUrl: "",
};

const fontStacks: Record<FontChoice, string> = {
  Fira: "Fira Sans, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  Outfit: "Outfit, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  System: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
};

export default function WidgetCustomizerPage() {
  const { tenant } = useTenant();
  const [config, setConfig] = useState<CustomizerState>({
    ...DEFAULT_STATE,
    tenantId: tenant?.$id ?? DEFAULT_STATE.tenantId,
  });
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });

  const themeConfig = useMemo(() => buildThemeConfig(config), [config]);
  const snippets = useMemo(() => buildEmbedSnippets(config.botId), [config.botId]);

  async function saveTheme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSafeId(config.botId) || !isSafeId(config.tenantId)) {
      setSaveState({ status: "error", message: "Bot and tenant IDs must use letters, numbers, hyphens, or underscores." });
      return;
    }

    setSaveState({ status: "saving", message: "Saving style..." });

    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk",
        process.env.NEXT_PUBLIC_APPWRITE_BOTS_COLLECTION_ID ?? "bots",
        config.botId,
        {
          tenant_id: config.tenantId,
          name: config.botName,
          theme_config: JSON.stringify(themeConfig),
        },
      );

      setSaveState({ status: "success", message: "Widget style saved to the bot configuration." });
    } catch (error: unknown) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "Unable to save widget style." });
    }
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        kicker="Widget design"
        title="Make the embedded bot look unmistakably on duty."
        description="Tune the customer-facing chat widget while preserving the existing widget config contract."
        action={<StatusPill tone="hot">Live preview</StatusPill>}
      />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
        <Panel className="p-5">
          <form className="space-y-5" onSubmit={saveTheme}>
            <section className="border-b border-border pb-4">
              <p className="studio-kicker text-muted-foreground">Control deck</p>
              <h2 className="mt-1 text-2xl font-bold">Theme controls</h2>
            </section>

            <section className="grid gap-3">
              <TextField label="Tenant ID" value={config.tenantId} onChange={(tenantId) => setConfig({ ...config, tenantId })} />
              <TextField label="Bot ID" value={config.botId} onChange={(botId) => setConfig({ ...config, botId })} />
              <TextField label="Bot name" value={config.botName} onChange={(botName) => setConfig({ ...config, botName })} />
              <label className="block">
                <span className="studio-kicker mb-2 block text-muted-foreground">Greeting message</span>
                <textarea
                  className="min-h-28 w-full border border-border bg-card px-3 py-2 text-sm font-bold leading-6 focus:bg-secondary/60"
                  maxLength={300}
                  value={config.greeting}
                  onChange={(event) => setConfig({ ...config, greeting: event.target.value })}
                />
              </label>
            </section>

            <section className="grid gap-3">
              <ColorField label="Header" value={config.headerColor} onChange={(headerColor) => setConfig({ ...config, headerColor })} />
              <ColorField label="Background" value={config.backgroundColor} onChange={(backgroundColor) => setConfig({ ...config, backgroundColor })} />
              <ColorField label="Text" value={config.textColor} onChange={(textColor) => setConfig({ ...config, textColor })} />
              <ColorField label="User bubble" value={config.userBubbleColor} onChange={(userBubbleColor) => setConfig({ ...config, userBubbleColor })} />
              <ColorField label="Bot bubble" value={config.botBubbleColor} onChange={(botBubbleColor) => setConfig({ ...config, botBubbleColor })} />
              <ColorField label="Accent" value={config.accentColor} onChange={(accentColor) => setConfig({ ...config, accentColor })} />
            </section>

            <label className="block">
              <span className="studio-kicker mb-2 block text-muted-foreground">Font</span>
              <select
                className="min-h-11 w-full border border-border bg-card px-3 text-sm font-bold focus:bg-secondary/60"
                value={config.fontFamily}
                onChange={(event) => setConfig({ ...config, fontFamily: event.target.value as FontChoice })}
              >
                <option value="Fira">Fira</option>
                <option value="Outfit">Outfit</option>
                <option value="System">System</option>
              </select>
            </label>

            <section className="grid gap-3 border-t border-border pt-4">
              <label className="flex items-center gap-3">
                <input
                  className="h-5 w-5 accent-primary"
                  checked={config.useCustomIcon}
                  type="checkbox"
                  onChange={(event) => setConfig({ ...config, useCustomIcon: event.target.checked })}
                />
                <span className="text-sm font-bold">Use custom launcher icon</span>
              </label>
              <TextField
                disabled={!config.useCustomIcon}
                label="Custom launcher icon URL"
                value={config.widgetIconUrl}
                onChange={(widgetIconUrl) => setConfig({ ...config, widgetIconUrl })}
              />
            </section>

            {saveState.message ? (
              <div className={saveMessageClass(saveState.status)} role="status">
                {saveState.message}
              </div>
            ) : null}

            <Button
              className="w-full"
              disabled={saveState.status === "saving"}
              leftIcon={<Save aria-hidden="true" className="h-4 w-4" />}
              loading={saveState.status === "saving"}
              type="submit"
            >
              Save style
            </Button>
          </form>
        </Panel>

        <section className="studio-surface relative min-h-[720px] rounded-xl p-5 text-foreground">
          <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-2 font-mono text-xs font-bold text-primary">
            <Paintbrush aria-hidden="true" className="h-4 w-4" />
            WIDGET ARTIFACT
          </div>
          <div className="flex min-h-[680px] items-center justify-center pt-14">
            <WidgetPreview config={config} />
          </div>
          <div className="grid gap-3 border-t border-border pt-5 lg:grid-cols-2">
            <CodeBlock label="Script" value={snippets.script} />
            <CodeBlock label="Iframe" value={snippets.iframe} />
            <CodeBlock label="React" value={snippets.react} />
            <CodeBlock label="Vue" value={snippets.vue} />
          </div>
        </section>
      </div>
    </div>
  );
}

function TextField({ label, value, disabled = false, onChange }: { label: string; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="studio-kicker mb-2 block text-muted-foreground">{label}</span>
      <input
        className="min-h-11 w-full border border-border bg-card px-3 text-sm font-bold focus:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid grid-cols-[1fr_56px] items-end gap-3">
      <span>
        <span className="studio-kicker mb-2 block text-muted-foreground">{label}</span>
        <input
          className="min-h-11 w-full border border-border bg-card px-3 font-mono text-sm font-bold focus:bg-secondary/60"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      <input
        aria-label={`${label} color picker`}
        className="h-11 w-14 border border-border bg-card p-1"
        type="color"
        value={normalizeHex(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-card/80 p-3">
      <p className="studio-kicker mb-2 text-muted-foreground">{label}</p>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-foreground">{value}</pre>
    </div>
  );
}

function WidgetPreview({ config }: { config: CustomizerState }) {
  const showCustomIcon = config.useCustomIcon && isHttpUrl(config.widgetIconUrl);

  return (
    <div className="relative">
      <div
        className="flex h-[620px] w-full max-w-[390px] flex-col overflow-hidden rounded-2xl border border-border shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
        style={{
          background: config.backgroundColor,
          color: config.textColor,
          fontFamily: fontStacks[config.fontFamily],
        }}
      >
        <div className="flex items-center gap-3 border-b border-black/30 px-4 py-4 text-white" style={{ background: config.headerColor }}>
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-white/30 font-bold" style={{ background: config.accentColor }}>
            {config.botName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{config.botName}</p>
            <p className="text-xs font-bold leading-5 opacity-80">Online - answers with source context</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
          <PreviewBubble align="left" color={config.botBubbleColor} textColor={config.textColor}>
            {config.greeting}
          </PreviewBubble>
          <PreviewBubble align="right" color={config.userBubbleColor} textColor="#ffffff">
            Can you help me track my order?
          </PreviewBubble>
          <PreviewBubble align="left" color={config.botBubbleColor} textColor={config.textColor}>
            Yes. I can check policy, source files, and bring in a human operator if the answer needs judgment.
          </PreviewBubble>
        </div>

        <div className="border-t border-black/30 p-4">
          <div className="flex gap-2">
            <div className="flex min-h-11 flex-1 items-center rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-muted-foreground">
              Write your message here...
            </div>
            <button className="min-h-11 rounded-md border border-white/20 px-4 text-sm font-bold text-white" style={{ background: config.accentColor }} type="button">
              Send
            </button>
          </div>
        </div>
      </div>

      <button
        aria-label="Launcher preview"
        className="absolute bottom-[-18px] right-[-18px] flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-0 text-3xl font-black text-white shadow-[0_16px_42px_rgba(0,0,0,0.4)] z-10"
        style={{ background: config.accentColor }}
        type="button"
      >
        {showCustomIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="h-full w-full object-cover" src={config.widgetIconUrl} />
        ) : (
          "✦"
        )}
      </button>
    </div>
  );
}

function PreviewBubble({
  align,
  color,
  textColor,
  children,
}: {
  align: "left" | "right";
  color: string;
  textColor: string;
  children: string;
}) {
  return (
    <div className={`flex ${align === "right" ? "justify-end" : "justify-start"}`}>
      <p className="max-w-[78%] rounded-[18px] border border-white/10 px-4 py-3 text-sm font-bold leading-6" style={{ background: color, color: textColor }}>
        {children}
      </p>
    </div>
  );
}

function buildThemeConfig(config: CustomizerState) {
  return {
    greeting: config.greeting,
    useCustomIcon: config.useCustomIcon,
    widgetIconUrl: config.widgetIconUrl,
    theme: {
      headerHsl: hexToHsl(config.headerColor),
      backgroundHsl: hexToHsl(config.backgroundColor),
      textHsl: hexToHsl(config.textColor),
      mutedTextHsl: "214 12% 66%",
      userBubbleHsl: hexToHsl(config.userBubbleColor),
      botBubbleHsl: hexToHsl(config.botBubbleColor),
      accentHsl: hexToHsl(config.accentColor),
      fontFamily: fontStacks[config.fontFamily],
    },
  };
}

function buildEmbedSnippets(botId: string) {
  const safeBotId = botId || "YOUR_BOT_ID";

  return {
    script: `<script src="https://agentdeskbot.vercel.app/widget.js" data-bot-id="${safeBotId}" async></script>`,
    iframe: `<iframe src="https://agentdeskbot.vercel.app/embed/${safeBotId}" title="AgentDesk support" style="width:100%;height:640px;border:0"></iframe>`,
    react: `import { AgentDeskWidget } from "@agentdesk/widget/react";\n\n<AgentDeskWidget botId="${safeBotId}" />`,
    vue: `const AgentDeskWidget = createAgentDeskVueComponent(Vue);\n\n<AgentDeskWidget bot-id="${safeBotId}" />`,
  };
}

function hexToHsl(hex: string) {
  const normalized = normalizeHex(hex).replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return `0 0% ${Math.round(lightness * 100)}%`;
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue = getHue(red, green, blue, max, delta);
  return `${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function getHue(red: number, green: number, blue: number, max: number, delta: number) {
  if (max === red) {
    return 60 * (((green - blue) / delta) % 6);
  }

  if (max === green) {
    return 60 * ((blue - red) / delta + 2);
  }

  return 60 * ((red - green) / delta + 4);
}

function normalizeHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#F59E0B";
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,120}$/.test(value);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function saveMessageClass(status: SaveState["status"]) {
  if (status === "success") {
    return "border border-border bg-primary/10 px-3 py-2 text-sm font-bold text-foreground";
  }

  if (status === "error") {
    return "border border-border bg-destructive px-3 py-2 text-sm font-bold text-white";
  }

  return "border border-border bg-secondary/60 px-3 py-2 text-sm font-bold text-foreground";
}


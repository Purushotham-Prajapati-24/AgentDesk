"use client";

import { FormEvent, useMemo, useState } from "react";
import { databases } from "@/lib/appwrite";
import { useTenant } from "@/context/TenantContext";

type FontChoice = "Inter" | "Outfit" | "System";

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
};

type SaveState =
  | { status: "idle"; message: "" }
  | { status: "saving"; message: "Saving style..." }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const DEFAULT_STATE: CustomizerState = {
  botId: "test-id",
  tenantId: "tenant_demo",
  botName: "AgentDesk Support",
  greeting: "Hello. I can help with orders, returns, and product questions.",
  headerColor: "#1f2937",
  backgroundColor: "#f8fafc",
  textColor: "#0f172a",
  userBubbleColor: "#0f766e",
  botBubbleColor: "#e2e8f0",
  accentColor: "#0ea5e9",
  fontFamily: "Inter",
};

const fontStacks: Record<FontChoice, string> = {
  Inter: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
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
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[360px_1fr]">
        <form className="space-y-5 rounded-lg border border-slate-300 bg-white p-5 shadow-sm" onSubmit={saveTheme}>
          <section>
            <p className="text-sm font-semibold text-slate-500">Widget design</p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-normal">Customizer</h1>
          </section>

          <section className="grid gap-3">
            <TextField label="Tenant ID" value={config.tenantId} onChange={(tenantId) => setConfig({ ...config, tenantId })} />
            <TextField label="Bot ID" value={config.botId} onChange={(botId) => setConfig({ ...config, botId })} />
            <TextField label="Bot name" value={config.botName} onChange={(botName) => setConfig({ ...config, botName })} />
            <label className="text-sm font-semibold text-slate-700">
              Greeting message
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-slate-950"
                maxLength={300}
                value={config.greeting}
                onChange={(event) => setConfig({ ...config, greeting: event.target.value })}
              />
            </label>
          </section>

          <section className="grid gap-3">
            <ColorField label="Header" value={config.headerColor} onChange={(headerColor) => setConfig({ ...config, headerColor })} />
            <ColorField
              label="Background"
              value={config.backgroundColor}
              onChange={(backgroundColor) => setConfig({ ...config, backgroundColor })}
            />
            <ColorField label="Text" value={config.textColor} onChange={(textColor) => setConfig({ ...config, textColor })} />
            <ColorField
              label="User bubble"
              value={config.userBubbleColor}
              onChange={(userBubbleColor) => setConfig({ ...config, userBubbleColor })}
            />
            <ColorField
              label="Bot bubble"
              value={config.botBubbleColor}
              onChange={(botBubbleColor) => setConfig({ ...config, botBubbleColor })}
            />
            <ColorField label="Accent" value={config.accentColor} onChange={(accentColor) => setConfig({ ...config, accentColor })} />
          </section>

          <label className="block text-sm font-semibold text-slate-700">
            Font
            <select
              className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950"
              value={config.fontFamily}
              onChange={(event) => setConfig({ ...config, fontFamily: event.target.value as FontChoice })}
            >
              <option value="Inter">Inter</option>
              <option value="Outfit">Outfit</option>
              <option value="System">System</option>
            </select>
          </label>

          {saveState.message ? (
            <div className={saveMessageClass(saveState.status)} role="status">
              {saveState.message}
            </div>
          ) : null}

          <button
            className="h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={saveState.status === "saving"}
            type="submit"
          >
            Save Style
          </button>
        </form>

        <section className="flex min-h-[720px] items-center justify-center rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
          <WidgetPreview config={config} />
        </section>
      </div>
    </main>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input
        className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid grid-cols-[1fr_52px] items-center gap-3 text-sm font-semibold text-slate-700">
      <span>
        {label}
        <input
          className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      <input
        aria-label={`${label} color picker`}
        className="mt-6 h-11 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
        type="color"
        value={normalizeHex(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function WidgetPreview({ config }: { config: CustomizerState }) {
  return (
    <div
      className="flex h-[620px] w-full max-w-[390px] flex-col overflow-hidden rounded-lg border border-slate-300 shadow-xl"
      style={{
        background: config.backgroundColor,
        color: config.textColor,
        fontFamily: fontStacks[config.fontFamily],
      }}
    >
      <div className="flex items-center gap-3 px-4 py-4 text-white" style={{ background: config.headerColor }}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full font-bold" style={{ background: config.accentColor }}>
          {config.botName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{config.botName}</p>
          <p className="text-xs leading-5 opacity-80">Online - responds instantly</p>
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
          Yes. I can look up policy and order context, then bring in a human agent when needed.
        </PreviewBubble>
      </div>

      <div className="border-t border-slate-300 p-4">
        <div className="flex gap-2">
          <div className="flex h-11 flex-1 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-500">
            Write your message here...
          </div>
          <button className="h-11 rounded-md px-4 text-sm font-semibold text-white" style={{ background: config.accentColor }} type="button">
            Send
          </button>
        </div>
      </div>
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
      <p className="max-w-[78%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm" style={{ background: color, color: textColor }}>
        {children}
      </p>
    </div>
  );
}

function buildThemeConfig(config: CustomizerState) {
  return {
    greeting: config.greeting,
    theme: {
      headerHsl: hexToHsl(config.headerColor),
      backgroundHsl: hexToHsl(config.backgroundColor),
      textHsl: hexToHsl(config.textColor),
      mutedTextHsl: "215 20% 45%",
      userBubbleHsl: hexToHsl(config.userBubbleColor),
      botBubbleHsl: hexToHsl(config.botBubbleColor),
      accentHsl: hexToHsl(config.accentColor),
      fontFamily: fontStacks[config.fontFamily],
    },
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
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#0ea5e9";
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,120}$/.test(value);
}

function saveMessageClass(status: SaveState["status"]) {
  if (status === "success") {
    return "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700";
  }

  if (status === "error") {
    return "rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700";
  }

  return "rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700";
}

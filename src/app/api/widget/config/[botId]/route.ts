import { NextRequest } from "next/server";
import { Query, type Models } from "node-appwrite";
import { createAdminClient } from "@/lib/server/appwrite";
import { getPublicServerWebSocketUrl } from "@/lib/server/websocket-url";

type WidgetTheme = {
  headerHsl: string;
  backgroundHsl: string;
  textHsl: string;
  mutedTextHsl: string;
  userBubbleHsl: string;
  botBubbleHsl: string;
  accentHsl: string;
  fontFamily: string;
};

type WidgetConfig = {
  botId: string;
  tenantId: string;
  botName: string;
  greeting: string;
  fallbackMessage: string;
  logoUrl: string | null;
  bannerText: string;
  messageEndpoint: string;
  websocketEndpoint: string | null;
  theme: WidgetTheme;
};

type WidgetConfigResponse = {
  success: true;
  data: WidgetConfig;
};

type BotDocument = Models.Document & {
  tenant_id?: unknown;
  name?: unknown;
  fallback_message?: unknown;
  theme_config?: unknown;
};

type WebChatConfigDocument = Models.Document & {
  tenant_id?: unknown;
  bot_id?: unknown;
  bot_name?: unknown;
  avatar_url?: unknown;
  description?: unknown;
  header_color?: unknown;
  background_color?: unknown;
  text_color?: unknown;
  user_bubble_color?: unknown;
  bot_bubble_color?: unknown;
  accent_color?: unknown;
  font_family?: unknown;
  source_citations?: unknown;
};

type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

const BOT_ID_PATTERN = /^[a-zA-Z0-9_-]{3,80}$/;
const HSL_PATTERN = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;

const DEFAULT_THEME: WidgetTheme = {
  headerHsl: "224 20% 18%",
  backgroundHsl: "224 25% 12%",
  textHsl: "210 40% 98%",
  mutedTextHsl: "215 20% 75%",
  userBubbleHsl: "250 85% 60%",
  botBubbleHsl: "224 20% 18%",
  accentHsl: "250 85% 60%",
  fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

const DEMO_CONFIGS: Record<string, WidgetConfig> = {
  "test-id": {
    botId: "test-id",
    tenantId: "tenant-demo",
    botName: "AgentDesk Support",
    greeting: "Hello. I can help with orders, returns, and product questions.",
    fallbackMessage: "I do not have indexed support context for this demo bot yet. Upload a document for this bot, then ask again.",
    logoUrl: null,
    bannerText: "Online - responds instantly",
    messageEndpoint: "/api/chat/message",
    websocketEndpoint: null,
    theme: DEFAULT_THEME,
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(_request: NextRequest, context: { params: Promise<{ botId: string }> }) {
  const requestId = crypto.randomUUID();
  const { botId } = await context.params;

  if (!BOT_ID_PATTERN.test(botId)) {
    return errorResponse("INVALID_BOT_ID", "The requested widget configuration is invalid.", requestId, 422);
  }

  const config = await getConfig(botId);
  if (!config) {
    return errorResponse("BOT_NOT_FOUND", "The requested widget configuration was not found.", requestId, 404);
  }

  return Response.json(
    {
      success: true,
      data: config,
    } satisfies WidgetConfigResponse,
    { status: 200, headers: corsHeaders },
  );
}

async function getConfig(botId: string) {
  const appwriteConfig = await getAppwriteBotConfig(botId);
  if (appwriteConfig) {
    return sanitizeConfig(appwriteConfig);
  }

  const envConfig = parseEnvConfigs()[botId];
  const config = envConfig ?? DEMO_CONFIGS[botId];

  if (!config || config.botId !== botId) {
    return null;
  }

  return sanitizeConfig(config);
}

async function getAppwriteBotConfig(botId: string): Promise<WidgetConfig | null> {
  try {
    const { databases } = await createAdminClient();
    const bot = (await databases.getDocument(databaseId(), botsCollectionId(), botId)) as BotDocument;
    const webChatConfig = await getWebChatConfigDocument(databases, stringValue(bot.tenant_id, ""), botId);
    if (webChatConfig) {
      return widgetConfigFromWebChatDocument(botId, bot, webChatConfig);
    }

    const themeConfig = parseThemeConfig(bot.theme_config);
    const theme = {
      ...DEFAULT_THEME,
      ...themeConfig.theme,
    };

    return {
      botId,
      tenantId: cleanText(stringValue(bot.tenant_id, ""), 80),
      botName: cleanText(stringValue(bot.name, "AgentDesk Support"), 80),
      greeting: cleanText(stringValue(themeConfig.greeting, "Hello. I can help with orders, returns, and product questions."), 300),
      fallbackMessage: cleanText(stringValue(bot.fallback_message, "I could not reach the support engine. Please try again in a moment."), 300),
      logoUrl: sanitizeUrl(themeConfig.logoUrl ?? null),
      bannerText: cleanText(stringValue(themeConfig.bannerText, "Online - responds instantly"), 80),
      messageEndpoint: "/api/chat/message",
      websocketEndpoint: null,
      theme,
    };
  } catch {
    return null;
  }
}

async function getWebChatConfigDocument(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
  botId: string,
) {
  if (!tenantId) {
    return null;
  }

  try {
    const response = await databases.listDocuments(databaseId(), webChatConfigsCollectionId(), [
      Query.equal("tenant_id", tenantId),
      Query.equal("bot_id", botId),
      Query.limit(1),
    ]);

    return (response.documents[0] as WebChatConfigDocument | undefined) ?? null;
  } catch {
    return null;
  }
}

function widgetConfigFromWebChatDocument(botId: string, bot: BotDocument, config: WebChatConfigDocument): WidgetConfig {
  return {
    botId,
    tenantId: cleanText(stringValue(bot.tenant_id, ""), 80),
    botName: cleanText(stringValue(config.bot_name, stringValue(bot.name, "AgentDesk Support")), 80),
    greeting: cleanText(stringValue(config.description, "Hello. I can help with orders, returns, and product questions."), 300),
    fallbackMessage: cleanText(stringValue(bot.fallback_message, "I could not reach the support engine. Please try again in a moment."), 300),
    logoUrl: sanitizeUrl(stringValue(config.avatar_url, "") || null),
    bannerText: "Online - responds instantly",
    messageEndpoint: "/api/chat/message",
    websocketEndpoint: null,
    theme: {
      headerHsl: hexToHsl(stringValue(config.header_color, "#1F2937")),
      backgroundHsl: hexToHsl(stringValue(config.background_color, "#111827")),
      textHsl: hexToHsl(stringValue(config.text_color, "#F9FAFB")),
      mutedTextHsl: DEFAULT_THEME.mutedTextHsl,
      userBubbleHsl: hexToHsl(stringValue(config.user_bubble_color, "#7C3AED")),
      botBubbleHsl: hexToHsl(stringValue(config.bot_bubble_color, "#1F2937")),
      accentHsl: hexToHsl(stringValue(config.accent_color, "#7C3AED")),
      fontFamily: fontStack(stringValue(config.font_family, "Fira")),
    },
  };
}

function parseEnvConfigs(): Record<string, WidgetConfig> {
  const raw = process.env.AGENTDESK_WIDGET_CONFIGS;
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, WidgetConfig>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseThemeConfig(value: unknown): Partial<WidgetConfig> & { theme?: Partial<WidgetTheme> } {
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Partial<WidgetConfig> & { theme?: Partial<WidgetTheme> };
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function sanitizeConfig(config: WidgetConfig): WidgetConfig {
  return {
    botId: cleanText(config.botId, 80),
    tenantId: cleanText(config.tenantId, 80),
    botName: cleanText(config.botName, 80),
    greeting: cleanText(config.greeting, 300),
    fallbackMessage: cleanText(config.fallbackMessage, 300),
    logoUrl: sanitizeUrl(config.logoUrl),
    bannerText: cleanText(config.bannerText, 80),
    messageEndpoint: sanitizeEndpoint(config.messageEndpoint),
    websocketEndpoint: sanitizeWebSocketEndpoint(config.websocketEndpoint) ?? getPublicServerWebSocketUrl(),
    theme: sanitizeTheme(config.theme),
  };
}

function sanitizeTheme(theme: WidgetTheme): WidgetTheme {
  return {
    headerHsl: sanitizeHsl(theme.headerHsl, DEFAULT_THEME.headerHsl),
    backgroundHsl: sanitizeHsl(theme.backgroundHsl, DEFAULT_THEME.backgroundHsl),
    textHsl: sanitizeHsl(theme.textHsl, DEFAULT_THEME.textHsl),
    mutedTextHsl: sanitizeHsl(theme.mutedTextHsl, DEFAULT_THEME.mutedTextHsl),
    userBubbleHsl: sanitizeHsl(theme.userBubbleHsl, DEFAULT_THEME.userBubbleHsl),
    botBubbleHsl: sanitizeHsl(theme.botBubbleHsl, DEFAULT_THEME.botBubbleHsl),
    accentHsl: sanitizeHsl(theme.accentHsl, DEFAULT_THEME.accentHsl),
    fontFamily: cleanText(theme.fontFamily, 180),
  };
}

function sanitizeHsl(value: string, fallback: string) {
  return HSL_PATTERN.test(value) ? value : fallback;
}

function sanitizeEndpoint(value: string) {
  if (value.startsWith("/api/")) {
    return value;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "/api/chat/message";
  } catch {
    return "/api/chat/message";
  }
}

function sanitizeWebSocketEndpoint(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:", "ws:", "wss:"].includes(url.protocol) ? url.toString().replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

function sanitizeUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return ["https:", "data:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanText(value: string, maxLength: number) {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function botsCollectionId() {
  return process.env.APPWRITE_BOTS_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_BOTS_COLLECTION_ID ?? "bots";
}

function webChatConfigsCollectionId() {
  return process.env.APPWRITE_WEBCHAT_CONFIGS_COLLECTION_ID ?? process.env.NEXT_PUBLIC_APPWRITE_WEBCHAT_CONFIGS_COLLECTION_ID ?? "webchat_configs";
}

function hexToHsl(hex: string) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.replace("#", "") : "7C3AED";
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
  return `${Math.round((hue + 360) % 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function getHue(red: number, green: number, blue: number, max: number, delta: number) {
  if (max === red) return 60 * (((green - blue) / delta) % 6);
  if (max === green) return 60 * ((blue - red) / delta + 2);
  return 60 * ((red - green) / delta + 4);
}

function fontStack(font: string) {
  if (font === "Outfit") return "Outfit, system-ui, sans-serif";
  if (font === "System") return "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  if (font === "Mono") return "Fira Code, Consolas, ui-monospace, monospace";
  return "Fira Sans, system-ui, sans-serif";
}

function errorResponse(code: string, message: string, requestId: string, status: number) {
  return Response.json(
    {
      success: false,
      error: { code, message, requestId },
    } satisfies ErrorResponse,
    { status, headers: corsHeaders },
  );
}

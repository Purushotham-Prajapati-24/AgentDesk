import { NextRequest } from "next/server";
import type { Models } from "node-appwrite";
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
      logoUrl: null,
      bannerText: cleanText(stringValue(themeConfig.bannerText, "Online - responds instantly"), 80),
      messageEndpoint: "/api/chat/message",
      websocketEndpoint: null,
      theme,
    };
  } catch {
    return null;
  }
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

function errorResponse(code: string, message: string, requestId: string, status: number) {
  return Response.json(
    {
      success: false,
      error: { code, message, requestId },
    } satisfies ErrorResponse,
    { status, headers: corsHeaders },
  );
}

import { NextRequest } from "next/server";
import { Query, type Models } from "node-appwrite";
import { createAdminClient } from "@/lib/server/appwrite";
import { getPublicServerWebSocketUrl } from "@/lib/server/websocket-url";

type WidgetTheme = {
  headerHsl: string;
  headerTextHsl: string;
  headerSubtextHsl: string;
  headerCloseButtonHsl: string;
  headerFontFamily: string;
  backgroundHsl: string;
  textHsl: string;
  mutedTextHsl: string;
  userBubbleHsl: string;
  botBubbleHsl: string;
  accentHsl: string;
  fontFamily: string;
  inputBackgroundHsl: string;
  inputTextHsl: string;
  inputPlaceholderHsl: string;
  inputBorderHsl: string;
  inputFontFamily: string;
};

type WidgetConfig = {
  botId: string;
  tenantId: string;
  botName: string;
  headerTitle: string;
  headerSubtitle: string;
  greeting: string;
  fallbackMessage: string;
  logoUrl: string | null;
  useCustomIcon: boolean;
  widgetIconUrl: string | null;
  bannerText: string;
  inputPlaceholder: string;
  messageEndpoint: string;
  websocketEndpoint: string | null;
  theme: WidgetTheme;
  proactiveMessage: boolean;
  proactiveMessageText: string;
  proactiveMessageDelay: number;
  proactiveMessageShowOnce: boolean;
  proactiveMessageSound: boolean;
  proactiveMessageAutoclose: number;
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
  proactive_message?: unknown;
  proactive_message_text?: unknown;
  proactive_message_delay?: unknown;
  proactive_message_show_once?: unknown;
  proactive_message_sound?: unknown;
  proactive_message_autoclose?: unknown;
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
  headerHsl: "0 0% 11%",
  headerTextHsl: "0 0% 100%",
  headerSubtextHsl: "0 0% 84%",
  headerCloseButtonHsl: "0 0% 100%",
  headerFontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  backgroundHsl: "43 38% 95%",
  textHsl: "0 0% 11%",
  mutedTextHsl: "60 1% 37%",
  userBubbleHsl: "224 88% 51%",
  botBubbleHsl: "40 50% 98%",
  accentHsl: "204 100% 50%",
  fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  inputBackgroundHsl: "0 0% 100%",
  inputTextHsl: "0 0% 11%",
  inputPlaceholderHsl: "60 1% 37%",
  inputBorderHsl: "40 34% 93%",
  inputFontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
};

const DEMO_CONFIGS: Record<string, WidgetConfig> = {
  "test-id": {
    botId: "test-id",
    tenantId: "tenant-demo",
    botName: "AgentDesk Support",
    headerTitle: "",
    headerSubtitle: "Online - responds instantly",
    greeting: "Hello. I can help with orders, returns, and product questions.",
    fallbackMessage: "I do not have indexed support context for this demo bot yet. Upload a document for this bot, then ask again.",
    logoUrl: null,
    useCustomIcon: false,
    widgetIconUrl: null,
    bannerText: "Online - responds instantly",
    inputPlaceholder: "Write your message here...",
    messageEndpoint: "/api/chat/message",
    websocketEndpoint: null,
    theme: DEFAULT_THEME,
    proactiveMessage: false,
    proactiveMessageText: "Hi! 👋 Need help?",
    proactiveMessageDelay: 5,
    proactiveMessageShowOnce: true,
    proactiveMessageSound: false,
    proactiveMessageAutoclose: 0,
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
    const features = themeConfig.features || {};

    return {
      botId,
      tenantId: cleanText(stringValue(bot.tenant_id, ""), 80),
      botName: cleanText(stringValue(bot.name, "AgentDesk Support"), 80),
      headerTitle: cleanText(stringValue(themeConfig.headerTitle, ""), 80),
      headerSubtitle: cleanText(stringValue(themeConfig.headerSubtitle, stringValue(themeConfig.bannerText, "Online - responds instantly")), 100),
      greeting: cleanText(stringValue(themeConfig.greeting, "Hello. I can help with orders, returns, and product questions."), 300),
      fallbackMessage: cleanText(stringValue(bot.fallback_message, "I could not reach the support engine. Please try again in a moment."), 300),
      logoUrl: sanitizeUrl(themeConfig.logoUrl ?? null),
      useCustomIcon: themeConfig.useCustomIcon === true,
      widgetIconUrl: sanitizeUrl(themeConfig.widgetIconUrl ?? null),
      bannerText: cleanText(stringValue(themeConfig.bannerText, "Online - responds instantly"), 80),
      inputPlaceholder: cleanText(stringValue(themeConfig.inputPlaceholder, "Write your message here..."), 120),
      messageEndpoint: "/api/chat/message",
      websocketEndpoint: null,
      theme,
      proactiveMessage: typeof features.proactiveMessage === "boolean" ? features.proactiveMessage : false,
      proactiveMessageText: cleanText(stringValue(features.proactiveMessageText, "Hi! 👋 Need help?"), 300),
      proactiveMessageDelay: typeof features.proactiveMessageDelay === "number" ? features.proactiveMessageDelay : 5,
      proactiveMessageShowOnce: typeof features.proactiveMessageShowOnce === "boolean" ? features.proactiveMessageShowOnce : true,
      proactiveMessageSound: typeof features.proactiveMessageSound === "boolean" ? features.proactiveMessageSound : false,
      proactiveMessageAutoclose: typeof features.proactiveMessageAutoclose === "number" ? features.proactiveMessageAutoclose : 0,
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
  const themeConfig = parseThemeConfig(bot.theme_config);
  const theme = {
    ...DEFAULT_THEME,
    ...themeConfig.theme,
    headerHsl: hexToHsl(stringValue(config.header_color, "#1F2937")),
    backgroundHsl: hexToHsl(stringValue(config.background_color, "#111827")),
    textHsl: hexToHsl(stringValue(config.text_color, "#F9FAFB")),
    userBubbleHsl: hexToHsl(stringValue(config.user_bubble_color, "#7C3AED")),
    botBubbleHsl: hexToHsl(stringValue(config.bot_bubble_color, "#1F2937")),
    accentHsl: hexToHsl(stringValue(config.accent_color, "#7C3AED")),
    fontFamily: fontStack(stringValue(config.font_family, "Fira")),
  };

  return {
    botId,
    tenantId: cleanText(stringValue(bot.tenant_id, ""), 80),
    botName: cleanText(stringValue(config.bot_name, stringValue(bot.name, "AgentDesk Support")), 80),
    headerTitle: cleanText(stringValue(themeConfig.headerTitle, ""), 80),
    headerSubtitle: cleanText(stringValue(themeConfig.headerSubtitle, stringValue(themeConfig.bannerText, "Online - responds instantly")), 100),
    greeting: cleanText(stringValue(config.description, "Hello. I can help with orders, returns, and product questions."), 300),
    fallbackMessage: cleanText(stringValue(bot.fallback_message, "I could not reach the support engine. Please try again in a moment."), 300),
    logoUrl: sanitizeUrl(stringValue(config.avatar_url, "") || null),
    useCustomIcon: themeConfig.useCustomIcon === true,
    widgetIconUrl: sanitizeUrl(themeConfig.widgetIconUrl ?? null),
    bannerText: "Online - responds instantly",
    inputPlaceholder: cleanText(stringValue(themeConfig.inputPlaceholder, "Write your message here..."), 120),
    messageEndpoint: "/api/chat/message",
    websocketEndpoint: null,
    theme,
    proactiveMessage: typeof config.proactive_message === "boolean" ? config.proactive_message : false,
    proactiveMessageText: cleanText(stringValue(config.proactive_message_text, "Hi! 👋 Need help?"), 300),
    proactiveMessageDelay: typeof config.proactive_message_delay === "number" ? config.proactive_message_delay : 5,
    proactiveMessageShowOnce: typeof config.proactive_message_show_once === "boolean" ? config.proactive_message_show_once : true,
    proactiveMessageSound: typeof config.proactive_message_sound === "boolean" ? config.proactive_message_sound : false,
    proactiveMessageAutoclose: typeof config.proactive_message_autoclose === "number" ? config.proactive_message_autoclose : 0,
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

function parseThemeConfig(value: unknown): Partial<WidgetConfig> & { theme?: Partial<WidgetTheme>; features?: Record<string, unknown> } {
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Partial<WidgetConfig> & { theme?: Partial<WidgetTheme>; features?: Record<string, unknown> };
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
    headerTitle: cleanText(stringValue(config.headerTitle, config.botName), 80),
    headerSubtitle: cleanText(stringValue(config.headerSubtitle, config.bannerText), 100),
    greeting: cleanText(config.greeting, 300),
    fallbackMessage: cleanText(config.fallbackMessage, 300),
    logoUrl: sanitizeUrl(config.logoUrl),
    useCustomIcon: config.useCustomIcon === true,
    widgetIconUrl: sanitizeUrl(config.widgetIconUrl),
    bannerText: cleanText(config.bannerText, 80),
    inputPlaceholder: cleanText(stringValue(config.inputPlaceholder, "Write your message here..."), 120),
    messageEndpoint: sanitizeEndpoint(config.messageEndpoint),
    websocketEndpoint: sanitizeWebSocketEndpoint(config.websocketEndpoint) ?? getPublicServerWebSocketUrl(),
    theme: sanitizeTheme(config.theme),
    proactiveMessage: config.proactiveMessage === true,
    proactiveMessageText: cleanText(config.proactiveMessageText, 300),
    proactiveMessageDelay: typeof config.proactiveMessageDelay === "number" ? config.proactiveMessageDelay : 5,
    proactiveMessageShowOnce: config.proactiveMessageShowOnce === true,
    proactiveMessageSound: config.proactiveMessageSound === true,
    proactiveMessageAutoclose: typeof config.proactiveMessageAutoclose === "number" ? config.proactiveMessageAutoclose : 0,
  };
}

function sanitizeTheme(theme: Partial<WidgetTheme> = DEFAULT_THEME): WidgetTheme {
  return {
    headerHsl: sanitizeHsl(theme.headerHsl, DEFAULT_THEME.headerHsl),
    headerTextHsl: sanitizeHsl(theme.headerTextHsl, DEFAULT_THEME.headerTextHsl),
    headerSubtextHsl: sanitizeHsl(theme.headerSubtextHsl, DEFAULT_THEME.headerSubtextHsl),
    headerCloseButtonHsl: sanitizeHsl(theme.headerCloseButtonHsl, DEFAULT_THEME.headerCloseButtonHsl),
    headerFontFamily: cleanText(stringValue(theme.headerFontFamily, DEFAULT_THEME.headerFontFamily), 180),
    backgroundHsl: sanitizeHsl(theme.backgroundHsl, DEFAULT_THEME.backgroundHsl),
    textHsl: sanitizeHsl(theme.textHsl, DEFAULT_THEME.textHsl),
    mutedTextHsl: sanitizeHsl(theme.mutedTextHsl, DEFAULT_THEME.mutedTextHsl),
    userBubbleHsl: sanitizeHsl(theme.userBubbleHsl, DEFAULT_THEME.userBubbleHsl),
    botBubbleHsl: sanitizeHsl(theme.botBubbleHsl, DEFAULT_THEME.botBubbleHsl),
    accentHsl: sanitizeHsl(theme.accentHsl, DEFAULT_THEME.accentHsl),
    fontFamily: cleanText(stringValue(theme.fontFamily, DEFAULT_THEME.fontFamily), 180),
    inputBackgroundHsl: sanitizeHsl(theme.inputBackgroundHsl, DEFAULT_THEME.inputBackgroundHsl),
    inputTextHsl: sanitizeHsl(theme.inputTextHsl, DEFAULT_THEME.inputTextHsl),
    inputPlaceholderHsl: sanitizeHsl(theme.inputPlaceholderHsl, DEFAULT_THEME.inputPlaceholderHsl),
    inputBorderHsl: sanitizeHsl(theme.inputBorderHsl, DEFAULT_THEME.inputBorderHsl),
    inputFontFamily: cleanText(stringValue(theme.inputFontFamily, DEFAULT_THEME.inputFontFamily), 180),
  };
}

function sanitizeHsl(value: string | undefined, fallback: string) {
  return typeof value === "string" && HSL_PATTERN.test(value) ? value : fallback;
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

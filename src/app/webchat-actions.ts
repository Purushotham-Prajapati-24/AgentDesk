"use server";

import { Query, type Models } from "node-appwrite";
import { createAdminClient } from "@/lib/server/appwrite";
import { assertTenantAccess } from "@/lib/server/tenant-access";
import {
  DEFAULT_WEBCHAT_CONFIG,
  WebChatConfigSchema,
  type WebChatConfig,
} from "@/lib/webchat-config";

type BotDocument = Models.Document & {
  tenant_id?: unknown;
  name?: unknown;
  system_prompt?: unknown;
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
  custom_css?: unknown;
  environment?: unknown;
  version_tag?: unknown;
  rollout_strategy?: unknown;
  agent_id?: unknown;
  theme_id?: unknown;
  voice?: unknown;
  transcript_export?: unknown;
  file_uploads?: unknown;
  human_handoff?: unknown;
  source_citations?: unknown;
};

export type WebChatBotSummary = {
  id: string;
  name: string;
  themeConfig: string;
  config: WebChatConfig;
};

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "agentdesk";
const botsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_BOTS_COLLECTION_ID || process.env.APPWRITE_BOTS_COLLECTION_ID || "bots";
const webChatConfigsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_WEBCHAT_CONFIGS_COLLECTION_ID || process.env.APPWRITE_WEBCHAT_CONFIGS_COLLECTION_ID || "webchat_configs";

export async function listWebChatBots(tenantId: string): Promise<
  | { success: true; bots: WebChatBotSummary[] }
  | { success: false; error: string }
> {
  try {
    const { databases } = await createAdminClient();
    await assertTenantAccess(tenantId);

    const [response, configResponse] = await Promise.all([
      databases.listDocuments(databaseId, botsCollectionId, [
      Query.equal("tenant_id", tenantId),
      Query.orderDesc("$updatedAt"),
      Query.limit(100),
      ]),
      listWebChatConfigDocuments(databases, tenantId),
    ]);

    const configsByBotId = new Map(
      configResponse.map((document) => [stringValue(document.bot_id, ""), document]),
    );

    const bots = response.documents.map((document) => {
        const bot = document as BotDocument;
        const configDocument = configsByBotId.get(bot.$id);
        const summary = {
          id: bot.$id,
          name: stringValue(bot.name, "Untitled bot"),
          themeConfig: stringValue(bot.theme_config, "{}"),
        };
        return {
          ...summary,
          config: configDocument ? webChatConfigFromDocument(configDocument, summary.themeConfig) : webChatConfigFromBot(summary),
        };
      });

    return { success: true, bots };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function saveWebChatBotConfig({
  tenantId,
  botId,
  config,
}: {
  tenantId: string;
  botId: string;
  config: WebChatConfig;
}): Promise<{ success: true; config: WebChatConfig } | { success: false; error: string }> {
  try {
    const { databases } = await createAdminClient();
    await assertTenantAccess(tenantId);
    await assertBotTenant(databases, botId, tenantId);

    const parsedConfig = WebChatConfigSchema.parse({
      ...config,
      deploy: {
        ...config.deploy,
        botId,
      },
    });

    await upsertWebChatConfig(databases, tenantId, botId, parsedConfig);

    await databases.updateDocument(databaseId, botsCollectionId, botId, {
      name: parsedConfig.identity.botName.trim(),
      theme_config: JSON.stringify(webChatConfigToThemeConfig(parsedConfig)),
    });

    return { success: true, config: parsedConfig };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

function webChatConfigFromBot(bot: Omit<WebChatBotSummary, "config">): WebChatConfig {
  const themeConfig = parseThemeConfig(bot.themeConfig);
  const theme = safeRecord(themeConfig.theme);
  const baseFontFamily = stringValue(theme.fontFamily, fontStack(DEFAULT_WEBCHAT_CONFIG.appearance.fontFamily));

  return WebChatConfigSchema.parse({
    ...DEFAULT_WEBCHAT_CONFIG,
    identity: {
      ...DEFAULT_WEBCHAT_CONFIG.identity,
      botName: bot.name,
      avatarUrl: stringValue(themeConfig.logoUrl, ""),
      description: stringValue(themeConfig.greeting, DEFAULT_WEBCHAT_CONFIG.identity.description),
    },
    appearance: {
      ...DEFAULT_WEBCHAT_CONFIG.appearance,
      headerTitle: stringValue(themeConfig.headerTitle, ""),
      headerSubtitle: stringValue(themeConfig.headerSubtitle, stringValue(themeConfig.bannerText, DEFAULT_WEBCHAT_CONFIG.appearance.headerSubtitle)),
      headerColor: hslToHex(stringValue(theme.headerHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.headerColor,
      headerTextColor: hslToHex(stringValue(theme.headerTextHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.headerTextColor,
      headerSubtextColor: hslToHex(stringValue(theme.headerSubtextHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.headerSubtextColor,
      headerCloseButtonColor: hslToHex(stringValue(theme.headerCloseButtonHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.headerCloseButtonColor,
      headerFontFamily: fontChoiceFromStack(stringValue(theme.headerFontFamily, baseFontFamily)),
      backgroundColor: hslToHex(stringValue(theme.backgroundHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.backgroundColor,
      textColor: hslToHex(stringValue(theme.textHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.textColor,
      userBubbleColor: hslToHex(stringValue(theme.userBubbleHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.userBubbleColor,
      botBubbleColor: hslToHex(stringValue(theme.botBubbleHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.botBubbleColor,
      accentColor: hslToHex(stringValue(theme.accentHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.accentColor,
      fontFamily: fontChoiceFromStack(baseFontFamily),
      inputPlaceholder: stringValue(themeConfig.inputPlaceholder, DEFAULT_WEBCHAT_CONFIG.appearance.inputPlaceholder),
      inputBackgroundColor: hslToHex(stringValue(theme.inputBackgroundHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.inputBackgroundColor,
      inputTextColor: hslToHex(stringValue(theme.inputTextHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.inputTextColor,
      inputPlaceholderColor: hslToHex(stringValue(theme.inputPlaceholderHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.inputPlaceholderColor,
      inputBorderColor: hslToHex(stringValue(theme.inputBorderHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.inputBorderColor,
      inputFontFamily: fontChoiceFromStack(stringValue(theme.inputFontFamily, baseFontFamily)),
      useCustomIcon: booleanValue(themeConfig.useCustomIcon, DEFAULT_WEBCHAT_CONFIG.appearance.useCustomIcon),
      widgetIconUrl: stringValue(themeConfig.widgetIconUrl, ""),
      customCss: stringValue(themeConfig.customCss, ""),
    },
    deploy: {
      ...DEFAULT_WEBCHAT_CONFIG.deploy,
      ...safeRecord(themeConfig.webchat),
      botId: bot.id,
    },
    features: {
      ...DEFAULT_WEBCHAT_CONFIG.features,
      ...safeRecord(themeConfig.features),
    },
  });
}

function webChatConfigFromDocument(document: WebChatConfigDocument, botThemeConfig = "{}"): WebChatConfig {
  const themeConfig = parseThemeConfig(botThemeConfig);
  const theme = safeRecord(themeConfig.theme);
  const documentFontFamily = fontStack(fontChoiceFromValue(document.font_family));

  return WebChatConfigSchema.parse({
    ...DEFAULT_WEBCHAT_CONFIG,
    identity: {
      botName: stringValue(document.bot_name, DEFAULT_WEBCHAT_CONFIG.identity.botName),
      avatarUrl: stringValue(document.avatar_url, ""),
      description: stringValue(document.description, DEFAULT_WEBCHAT_CONFIG.identity.description),
    },
    appearance: {
      ...DEFAULT_WEBCHAT_CONFIG.appearance,
      headerTitle: stringValue(themeConfig.headerTitle, ""),
      headerSubtitle: stringValue(themeConfig.headerSubtitle, stringValue(themeConfig.bannerText, DEFAULT_WEBCHAT_CONFIG.appearance.headerSubtitle)),
      headerColor: stringValue(document.header_color, DEFAULT_WEBCHAT_CONFIG.appearance.headerColor),
      headerTextColor: hslToHex(stringValue(theme.headerTextHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.headerTextColor,
      headerSubtextColor: hslToHex(stringValue(theme.headerSubtextHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.headerSubtextColor,
      headerCloseButtonColor: hslToHex(stringValue(theme.headerCloseButtonHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.headerCloseButtonColor,
      headerFontFamily: fontChoiceFromStack(stringValue(theme.headerFontFamily, stringValue(theme.fontFamily, documentFontFamily))),
      backgroundColor: stringValue(document.background_color, DEFAULT_WEBCHAT_CONFIG.appearance.backgroundColor),
      textColor: stringValue(document.text_color, DEFAULT_WEBCHAT_CONFIG.appearance.textColor),
      userBubbleColor: stringValue(document.user_bubble_color, DEFAULT_WEBCHAT_CONFIG.appearance.userBubbleColor),
      botBubbleColor: stringValue(document.bot_bubble_color, DEFAULT_WEBCHAT_CONFIG.appearance.botBubbleColor),
      accentColor: stringValue(document.accent_color, DEFAULT_WEBCHAT_CONFIG.appearance.accentColor),
      fontFamily: fontChoiceFromValue(document.font_family),
      inputPlaceholder: stringValue(themeConfig.inputPlaceholder, DEFAULT_WEBCHAT_CONFIG.appearance.inputPlaceholder),
      inputBackgroundColor: hslToHex(stringValue(theme.inputBackgroundHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.inputBackgroundColor,
      inputTextColor: hslToHex(stringValue(theme.inputTextHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.inputTextColor,
      inputPlaceholderColor: hslToHex(stringValue(theme.inputPlaceholderHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.inputPlaceholderColor,
      inputBorderColor: hslToHex(stringValue(theme.inputBorderHsl, "")) ?? DEFAULT_WEBCHAT_CONFIG.appearance.inputBorderColor,
      inputFontFamily: fontChoiceFromStack(stringValue(theme.inputFontFamily, stringValue(theme.fontFamily, documentFontFamily))),
      useCustomIcon: booleanValue(themeConfig.useCustomIcon, DEFAULT_WEBCHAT_CONFIG.appearance.useCustomIcon),
      widgetIconUrl: stringValue(themeConfig.widgetIconUrl, ""),
      customCss: stringValue(document.custom_css, ""),
    },
    deploy: {
      botId: stringValue(document.bot_id, ""),
      environment: deployEnvironment(document.environment),
      versionTag: stringValue(document.version_tag, DEFAULT_WEBCHAT_CONFIG.deploy.versionTag),
      rolloutStrategy: rolloutStrategy(document.rollout_strategy),
      agentId: stringValue(document.agent_id, ""),
      themeId: stringValue(document.theme_id, ""),
    },
    features: {
      voice: booleanValue(document.voice, DEFAULT_WEBCHAT_CONFIG.features.voice),
      transcriptExport: booleanValue(document.transcript_export, DEFAULT_WEBCHAT_CONFIG.features.transcriptExport),
      fileUploads: booleanValue(document.file_uploads, DEFAULT_WEBCHAT_CONFIG.features.fileUploads),
      humanHandoff: booleanValue(document.human_handoff, DEFAULT_WEBCHAT_CONFIG.features.humanHandoff),
      sourceCitations: booleanValue(document.source_citations, DEFAULT_WEBCHAT_CONFIG.features.sourceCitations),
    },
  });
}

async function listWebChatConfigDocuments(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
) {
  try {
    const response = await databases.listDocuments(databaseId, webChatConfigsCollectionId, [
      Query.equal("tenant_id", tenantId),
      Query.limit(100),
    ]);
    return response.documents as WebChatConfigDocument[];
  } catch {
    return [];
  }
}

async function upsertWebChatConfig(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
  botId: string,
  config: WebChatConfig,
) {
  const payload = webChatConfigToDocumentPayload(tenantId, botId, config);
  const existing = await databases.listDocuments(databaseId, webChatConfigsCollectionId, [
    Query.equal("tenant_id", tenantId),
    Query.equal("bot_id", botId),
    Query.limit(1),
  ]);

  if (existing.documents[0]) {
    return databases.updateDocument(databaseId, webChatConfigsCollectionId, existing.documents[0].$id, payload);
  }

  return databases.createDocument(databaseId, webChatConfigsCollectionId, crypto.randomUUID(), {
    ...payload,
    created: new Date().toISOString(),
  });
}

function webChatConfigToDocumentPayload(tenantId: string, botId: string, config: WebChatConfig) {
  return {
    tenant_id: tenantId,
    bot_id: botId,
    bot_name: config.identity.botName,
    avatar_url: config.identity.avatarUrl,
    description: config.identity.description,
    header_color: config.appearance.headerColor,
    background_color: config.appearance.backgroundColor,
    text_color: config.appearance.textColor,
    user_bubble_color: config.appearance.userBubbleColor,
    bot_bubble_color: config.appearance.botBubbleColor,
    accent_color: config.appearance.accentColor,
    font_family: config.appearance.fontFamily,
    custom_css: config.appearance.customCss,
    environment: config.deploy.environment,
    version_tag: config.deploy.versionTag,
    rollout_strategy: config.deploy.rolloutStrategy,
    agent_id: config.deploy.agentId,
    theme_id: config.deploy.themeId,
    voice: config.features.voice,
    transcript_export: config.features.transcriptExport,
    file_uploads: config.features.fileUploads,
    human_handoff: config.features.humanHandoff,
    source_citations: config.features.sourceCitations,
    updated: new Date().toISOString(),
  };
}

function webChatConfigToThemeConfig(config: WebChatConfig) {
  return {
    greeting: config.identity.description,
    logoUrl: config.identity.avatarUrl || null,
    headerTitle: config.appearance.headerTitle,
    headerSubtitle: config.appearance.headerSubtitle,
    bannerText: config.appearance.headerSubtitle || DEFAULT_WEBCHAT_CONFIG.appearance.headerSubtitle,
    inputPlaceholder: config.appearance.inputPlaceholder,
    useCustomIcon: config.appearance.useCustomIcon,
    widgetIconUrl: config.appearance.widgetIconUrl || null,
    customCss: config.appearance.customCss,
    webchat: {
      botId: config.deploy.botId,
      environment: config.deploy.environment,
      versionTag: config.deploy.versionTag,
      rolloutStrategy: config.deploy.rolloutStrategy,
      agentId: config.deploy.agentId,
      themeId: config.deploy.themeId,
    },
    features: config.features,
    theme: {
      headerHsl: hexToHsl(config.appearance.headerColor),
      headerTextHsl: hexToHsl(config.appearance.headerTextColor),
      headerSubtextHsl: hexToHsl(config.appearance.headerSubtextColor),
      headerCloseButtonHsl: hexToHsl(config.appearance.headerCloseButtonColor),
      headerFontFamily: fontStack(config.appearance.headerFontFamily),
      backgroundHsl: hexToHsl(config.appearance.backgroundColor),
      textHsl: hexToHsl(config.appearance.textColor),
      mutedTextHsl: "215 20% 75%",
      userBubbleHsl: hexToHsl(config.appearance.userBubbleColor),
      botBubbleHsl: hexToHsl(config.appearance.botBubbleColor),
      accentHsl: hexToHsl(config.appearance.accentColor),
      fontFamily: fontStack(config.appearance.fontFamily),
      inputBackgroundHsl: hexToHsl(config.appearance.inputBackgroundColor),
      inputTextHsl: hexToHsl(config.appearance.inputTextColor),
      inputPlaceholderHsl: hexToHsl(config.appearance.inputPlaceholderColor),
      inputBorderHsl: hexToHsl(config.appearance.inputBorderColor),
      inputFontFamily: fontStack(config.appearance.inputFontFamily),
    },
  };
}

async function assertBotTenant(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  botId: string,
  tenantId: string,
) {
  if (!isSafeId(botId)) {
    throw new Error("Invalid bot ID.");
  }

  const bot = (await databases.getDocument(databaseId, botsCollectionId, botId)) as BotDocument;
  if (bot.tenant_id !== tenantId) {
    throw new Error("Bot does not belong to this tenant.");
  }
}

function parseThemeConfig(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function hexToHsl(hex: string) {
  const normalized = hex.replace("#", "");
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
  if (max === red) {
    return 60 * (((green - blue) / delta) % 6);
  }

  if (max === green) {
    return 60 * ((blue - red) / delta + 2);
  }

  return 60 * ((red - green) / delta + 4);
}

function hslToHex(value: string) {
  const match = value.match(/^(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%$/);
  if (!match) {
    return null;
  }

  const hue = Number(match[1]);
  const saturation = Number(match[2]) / 100;
  const lightness = Number(match[3]) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  const [red, green, blue] = hueToRgb(hue, chroma, x).map((channel) => Math.round((channel + m) * 255));

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function hueToRgb(hue: number, chroma: number, x: number) {
  if (hue < 60) return [chroma, x, 0];
  if (hue < 120) return [x, chroma, 0];
  if (hue < 180) return [0, chroma, x];
  if (hue < 240) return [0, x, chroma];
  if (hue < 300) return [x, 0, chroma];
  return [chroma, 0, x];
}

function toHex(value: number) {
  return value.toString(16).padStart(2, "0").toUpperCase();
}

function fontStack(font: WebChatConfig["appearance"]["fontFamily"]) {
  if (font === "Outfit") return "Outfit, system-ui, sans-serif";
  if (font === "System") return "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  if (font === "Mono") return "Fira Code, Consolas, ui-monospace, monospace";
  return "Inter, system-ui, sans-serif";
}

function fontChoiceFromStack(value: string): WebChatConfig["appearance"]["fontFamily"] {
  if (value.includes("Outfit")) return "Outfit";
  if (value.includes("Fira Code")) return "Mono";
  if (value.includes("system-ui")) return "System";
  return "Fira";
}

function fontChoiceFromValue(value: unknown): WebChatConfig["appearance"]["fontFamily"] {
  return value === "Outfit" || value === "System" || value === "Mono" || value === "Fira" ? value : "Fira";
}

function deployEnvironment(value: unknown): WebChatConfig["deploy"]["environment"] {
  return value === "development" || value === "staging" || value === "production" ? value : "production";
}

function rolloutStrategy(value: unknown): WebChatConfig["deploy"]["rolloutStrategy"] {
  return value === "manual" || value === "canary" || value === "progressive" || value === "full" ? value : "manual";
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "WebChat request failed.";
}

import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color.");
const fontChoice = z.enum(["Fira", "Outfit", "System", "Mono"]);
const optionalUrl = z.string().trim().max(500).refine((value) => {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}, "Use a valid URL.");

export const WebChatConfigSchema = z.object({
  identity: z.object({
    botName: z.string().trim().min(2).max(80),
    avatarUrl: optionalUrl,
    description: z.string().trim().min(10).max(220),
  }),
  appearance: z.object({
    headerTitle: z.string().trim().max(80).default(""),
    headerSubtitle: z.string().trim().max(100).default("Online - responds instantly"),
    headerColor: hexColor,
    headerTextColor: hexColor.default("#FFFFFF"),
    headerSubtextColor: hexColor.default("#D6D6D6"),
    headerCloseButtonColor: hexColor.default("#FFFFFF"),
    headerFontFamily: fontChoice.default("System"),
    backgroundColor: hexColor,
    textColor: hexColor,
    userBubbleColor: hexColor,
    botBubbleColor: hexColor,
    accentColor: hexColor,
    fontFamily: fontChoice,
    inputPlaceholder: z.string().trim().max(120).default("Write your message here..."),
    inputBackgroundColor: hexColor.default("#FFFFFF"),
    inputTextColor: hexColor.default("#1C1C1C"),
    inputPlaceholderColor: hexColor.default("#5F5F5D"),
    inputBorderColor: hexColor.default("#ECEAE4"),
    inputFontFamily: fontChoice.default("System"),
    useCustomIcon: z.boolean(),
    widgetIconUrl: optionalUrl,
    customCss: z.string().max(2000),
  }),
  deploy: z.object({
    botId: z.string().trim().max(120),
    environment: z.enum(["development", "staging", "production"]),
    versionTag: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9._-]+$/, "Use letters, numbers, dots, hyphens, or underscores."),
    rolloutStrategy: z.enum(["manual", "canary", "progressive", "full"]),
    agentId: z.string().trim().max(120),
    themeId: z.string().trim().max(120),
  }),
  features: z.object({
    voice: z.boolean(),
    transcriptExport: z.boolean(),
    fileUploads: z.boolean(),
    humanHandoff: z.boolean(),
    sourceCitations: z.boolean(),
    proactiveMessage: z.boolean(),
    proactiveMessageText: z.string().trim().max(300),
    proactiveMessageDelay: z.number().int().min(0).max(120),
    proactiveMessageShowOnce: z.boolean(),
    proactiveMessageSound: z.boolean(),
    proactiveMessageAutoclose: z.number().int().min(0).max(300),
  }),
});

export const WebChatConfigPatchSchema = z.object({
  identity: WebChatConfigSchema.shape.identity.partial().optional(),
  appearance: WebChatConfigSchema.shape.appearance.partial().optional(),
  deploy: WebChatConfigSchema.shape.deploy.partial().optional(),
  features: WebChatConfigSchema.shape.features.partial().optional(),
});

export type WebChatConfig = z.infer<typeof WebChatConfigSchema>;
export type WebChatConfigPatch = z.infer<typeof WebChatConfigPatchSchema>;
export type WebChatSection = keyof WebChatConfig;

export const WEBCHAT_CONFIG_STORAGE_KEY = "webchatConfig";

export const DEFAULT_WEBCHAT_CONFIG: WebChatConfig = {
  identity: {
    botName: "AgentDesk Support",
    avatarUrl: "",
    description: "Answers customer questions with grounded support context and clear human handoff controls.",
  },
  appearance: {
    headerTitle: "",
    headerSubtitle: "Online - responds instantly",
    headerColor: "#1C1C1C",
    headerTextColor: "#FFFFFF",
    headerSubtextColor: "#D6D6D6",
    headerCloseButtonColor: "#FFFFFF",
    headerFontFamily: "System",
    backgroundColor: "#F7F4ED",
    textColor: "#1C1C1C",
    userBubbleColor: "#1456F0",
    botBubbleColor: "#FCFBF8",
    accentColor: "#0099FF",
    fontFamily: "System",
    inputPlaceholder: "Write your message here...",
    inputBackgroundColor: "#FFFFFF",
    inputTextColor: "#1C1C1C",
    inputPlaceholderColor: "#5F5F5D",
    inputBorderColor: "#ECEAE4",
    inputFontFamily: "System",
    useCustomIcon: false,
    widgetIconUrl: "",
    customCss: "",
  },
  deploy: {
    botId: "",
    environment: "production",
    versionTag: "webchat-v1",
    rolloutStrategy: "manual",
    agentId: "",
    themeId: "",
  },
  features: {
    voice: false,
    transcriptExport: true,
    fileUploads: false,
    humanHandoff: true,
    sourceCitations: true,
    proactiveMessage: false,
    proactiveMessageText: "Hi! 👋 Need help?",
    proactiveMessageDelay: 5,
    proactiveMessageShowOnce: true,
    proactiveMessageSound: false,
    proactiveMessageAutoclose: 0,
  },
};

export function parseWebChatConfig(value: unknown) {
  const parsed = WebChatConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_WEBCHAT_CONFIG;
}

export function mergeWebChatConfig(config: WebChatConfig, patch: WebChatConfigPatch): WebChatConfig {
  return WebChatConfigSchema.parse({
    identity: { ...config.identity, ...patch.identity },
    appearance: { ...config.appearance, ...patch.appearance },
    deploy: { ...config.deploy, ...patch.deploy },
    features: { ...config.features, ...patch.features },
  });
}

export function parseWebChatConfigJson(json: string | undefined) {
  if (!json) {
    return DEFAULT_WEBCHAT_CONFIG;
  }

  try {
    return parseWebChatConfig(JSON.parse(json));
  } catch {
    return DEFAULT_WEBCHAT_CONFIG;
  }
}

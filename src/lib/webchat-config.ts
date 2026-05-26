import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color.");
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
    headerColor: hexColor,
    backgroundColor: hexColor,
    textColor: hexColor,
    userBubbleColor: hexColor,
    botBubbleColor: hexColor,
    accentColor: hexColor,
    fontFamily: z.enum(["Fira", "Outfit", "System", "Mono"]),
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
    headerColor: "#050607",
    backgroundColor: "#0D1013",
    textColor: "#F5F1E8",
    userBubbleColor: "#CCFF00",
    botBubbleColor: "#14191E",
    accentColor: "#CCFF00",
    fontFamily: "Fira",
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

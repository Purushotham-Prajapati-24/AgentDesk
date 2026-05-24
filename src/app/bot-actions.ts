"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { ID, Query, type Models } from "node-appwrite";

type BotDocument = Models.Document & {
  tenant_id?: unknown;
  name?: unknown;
  system_prompt?: unknown;
  fallback_message?: unknown;
  theme_config?: unknown;
};

type BotInput = {
  name: string;
  system_prompt: string;
  fallback_message: string;
  tenant_id: string;
};

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "agentdesk";
const collectionId = process.env.NEXT_PUBLIC_APPWRITE_BOTS_COLLECTION_ID || process.env.APPWRITE_BOTS_COLLECTION_ID || "bots";
const MAX_NAME_LENGTH = 80;
const MAX_PROMPT_LENGTH = 4000;
const MAX_FALLBACK_LENGTH = 500;

export async function listBots(tenantId: string) {
  try {
    const { databases, account } = await createSessionClient();
    await assertTenantAccess(account, tenantId);

    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("tenant_id", tenantId),
      Query.orderDesc("$updatedAt"),
      Query.limit(100),
    ]);

    return { success: true as const, bots: response.documents.map(mapBotDocument) };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

export async function createBot(data: BotInput) {
  try {
    const { databases, account } = await createSessionClient();
    await assertTenantAccess(account, data.tenant_id);
    const payload = sanitizeBotInput(data);

    const bot = await databases.createDocument(databaseId, collectionId, ID.unique(), {
      ...payload,
      theme_config: JSON.stringify(defaultThemeConfig()),
    });

    return { success: true as const, bot: mapBotDocument(bot as BotDocument) };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

export async function updateBot(botId: string, tenantId: string, data: Partial<BotInput>) {
  try {
    const { databases, account } = await createSessionClient();
    await assertTenantAccess(account, tenantId);
    await assertBotTenant(databases, botId, tenantId);

    const bot = await databases.updateDocument(databaseId, collectionId, botId, sanitizeBotPatch(data));

    return { success: true as const, bot: mapBotDocument(bot as BotDocument) };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

export async function deleteBot(botId: string, tenantId: string) {
  try {
    const { databases, account } = await createSessionClient();
    await assertTenantAccess(account, tenantId);
    await assertBotTenant(databases, botId, tenantId);
    await databases.deleteDocument(databaseId, collectionId, botId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

async function assertTenantAccess(account: Awaited<ReturnType<typeof createSessionClient>>["account"], tenantId: string) {
  if (!isSafeId(tenantId)) {
    throw new Error("Invalid tenant scope.");
  }

  const user = await account.get();
  const prefs = user.prefs as { tenant_id?: string };
  if (prefs.tenant_id !== tenantId) {
    throw new Error("You do not have access to this tenant.");
  }
}

async function assertBotTenant(
  databases: Awaited<ReturnType<typeof createSessionClient>>["databases"],
  botId: string,
  tenantId: string,
) {
  if (!isSafeId(botId)) {
    throw new Error("Invalid bot ID.");
  }

  const bot = (await databases.getDocument(databaseId, collectionId, botId)) as BotDocument;
  if (bot.tenant_id !== tenantId) {
    throw new Error("Bot does not belong to this tenant.");
  }
}

function sanitizeBotInput(data: BotInput) {
  return {
    tenant_id: data.tenant_id,
    name: cleanText(data.name, MAX_NAME_LENGTH),
    system_prompt: cleanText(data.system_prompt, MAX_PROMPT_LENGTH),
    fallback_message: cleanText(data.fallback_message, MAX_FALLBACK_LENGTH),
  };
}

function sanitizeBotPatch(data: Partial<BotInput>) {
  const patch: Partial<BotInput> = {};

  if (typeof data.name === "string") {
    patch.name = cleanText(data.name, MAX_NAME_LENGTH);
  }
  if (typeof data.system_prompt === "string") {
    patch.system_prompt = cleanText(data.system_prompt, MAX_PROMPT_LENGTH);
  }
  if (typeof data.fallback_message === "string") {
    patch.fallback_message = cleanText(data.fallback_message, MAX_FALLBACK_LENGTH);
  }

  return patch;
}

function mapBotDocument(document: BotDocument) {
  return {
    $id: document.$id,
    tenant_id: stringValue(document.tenant_id, ""),
    name: stringValue(document.name, "Untitled bot"),
    system_prompt: stringValue(document.system_prompt, ""),
    fallback_message: stringValue(document.fallback_message, ""),
    theme_config: stringValue(document.theme_config, "{}"),
  };
}

function defaultThemeConfig() {
  return {
    theme: {
      headerHsl: "224 20% 18%",
      backgroundHsl: "224 25% 12%",
      textHsl: "210 40% 98%",
      userBubbleHsl: "250 85% 60%",
      botBubbleHsl: "224 20% 18%",
      accentHsl: "250 85% 60%",
    },
  };
}

function cleanText(value: string, maxLength: number) {
  const text = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!text) {
    throw new Error("Required bot fields cannot be empty.");
  }
  return text.slice(0, maxLength);
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Bot request failed.";
}

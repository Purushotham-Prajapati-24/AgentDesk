"use server";

import { createAdminClient, createSessionClient } from "@/lib/server/appwrite";
import { getAuthorizedTenantDocument } from "@/lib/server/tenant-access";
import { deleteKnowledgePointsForBot } from "@/lib/server/qdrant";
import { recordDocumentStorageRemoved } from "@/lib/server/monitor-rollups";
import { ID, Query, type Models } from "node-appwrite";

type BotDocument = Models.Document & {
  tenant_id?: unknown;
  name?: unknown;
  system_prompt?: unknown;
  fallback_message?: unknown;
  theme_config?: unknown;
};

type StoredDocument = Models.Document & {
  tenant_id?: unknown;
  storage_path?: unknown;
  file_size?: unknown;
};

type BotInput = {
  name: string;
  system_prompt: string;
  fallback_message: string;
  tenant_id: string;
};

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "agentdesk";
const collectionId = process.env.NEXT_PUBLIC_APPWRITE_BOTS_COLLECTION_ID || process.env.APPWRITE_BOTS_COLLECTION_ID || "bots";
const webChatConfigsCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_WEBCHAT_CONFIGS_COLLECTION_ID ||
  process.env.APPWRITE_WEBCHAT_CONFIGS_COLLECTION_ID ||
  "webchat_configs";
const documentsCollectionId = process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID ?? "document_files";
const documentsBucketId = process.env.APPWRITE_DOCUMENTS_BUCKET_ID ?? process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID ?? "documents";
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
    const { account } = await createSessionClient();
    const { databases, storage } = await createAdminClient();
    await assertTenantAccess(account, tenantId);
    await assertBotTenant(databases, botId, tenantId);
    await deleteKnowledgePointsForBot(tenantId, botId);
    await deleteBotDocuments(databases, storage, tenantId, botId);
    await deleteWebChatConfigs(databases, tenantId, botId);
    await databases.deleteDocument(databaseId, collectionId, botId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

async function deleteWebChatConfigs(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  tenantId: string,
  botId: string,
) {
  try {
    const response = await listScopedDocuments(databases, webChatConfigsCollectionId, tenantId, botId);
    await Promise.all(
      response.map((document) =>
        databases.deleteDocument(databaseId, webChatConfigsCollectionId, document.$id),
      ),
    );
  } catch (error: unknown) {
    if (!isMissingResourceError(error)) {
      throw error;
    }
  }
}

async function deleteBotDocuments(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  storage: Awaited<ReturnType<typeof createAdminClient>>["storage"],
  tenantId: string,
  botId: string,
) {
  try {
    const documents = (await listScopedDocuments(databases, documentsCollectionId, tenantId, botId)) as StoredDocument[];

    for (const document of documents) {
      const storagePath = typeof document.storage_path === "string" ? document.storage_path : "";
      if (storagePath) {
        try {
          await storage.deleteFile(documentsBucketId, storagePath);
        } catch (error: unknown) {
          if (!isMissingResourceError(error)) {
            throw error;
          }
        }
      }

      await databases.deleteDocument(databaseId, documentsCollectionId, document.$id);
      await recordBestEffort("document storage rollup", () =>
        recordDocumentStorageRemoved(databases, stringValue(document.tenant_id, tenantId), numberValue(document.file_size, 0)),
      );
    }
  } catch (error: unknown) {
    if (!isMissingResourceError(error)) {
      throw error;
    }
  }
}

async function listScopedDocuments(
  databases: Awaited<ReturnType<typeof createAdminClient>>["databases"],
  targetCollectionId: string,
  tenantId: string,
  botId: string,
) {
  const documents: Models.Document[] = [];
  let cursor: string | null = null;

  do {
    const queries: string[] = [
      Query.equal("tenant_id", tenantId),
      Query.equal("bot_id", botId),
      Query.limit(100),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ];
    const response = await databases.listDocuments(databaseId, targetCollectionId, queries);
    documents.push(...response.documents);
    cursor = response.documents.length === 100 ? response.documents[response.documents.length - 1].$id : null;
  } while (cursor);

  return documents;
}

async function assertTenantAccess(account: Awaited<ReturnType<typeof createSessionClient>>["account"], tenantId: string) {
  if (!isSafeId(tenantId)) {
    throw new Error("Invalid tenant scope.");
  }

  const user = await account.get();
  await getAuthorizedTenantDocument(user.$id, tenantId);
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
      headerHsl: "0 0% 11%",
      backgroundHsl: "43 38% 95%",
      textHsl: "0 0% 11%",
      userBubbleHsl: "224 88% 51%",
      botBubbleHsl: "40 50% 98%",
      accentHsl: "204 100% 50%",
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

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

function isMissingResourceError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown; type?: unknown };
  return candidate.code === 404 || candidate.type === "document_not_found" || candidate.type === "collection_not_found";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Bot request failed.";
}

async function recordBestEffort(label: string, callback: () => Promise<unknown>) {
  try {
    await callback();
  } catch (error) {
    console.warn(`[bot-actions] ${label} update failed`, error);
  }
}

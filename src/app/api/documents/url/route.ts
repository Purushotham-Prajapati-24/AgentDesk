import { ID, type Users } from "node-appwrite";
import { createAdminClient } from "@/lib/server/appwrite";

type UrlIngestRequest = {
  tenant_id: string;
  bot_id: string;
  user_id?: string;
  url: string;
};

const MAX_FETCH_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  let body: Partial<UrlIngestRequest>;

  try {
    body = (await request.json()) as Partial<UrlIngestRequest>;
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", 422);
  }

  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id.trim() : "";
  const botId = typeof body.bot_id === "string" ? body.bot_id.trim() : "";
  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const url = normalizeHttpUrl(body.url);

  if (!isSafeId(tenantId) || !isSafeId(botId) || !userId) {
    return jsonError("INVALID_SCOPE", "tenant_id, bot_id, and user_id are required.", 422);
  }

  if (!url) {
    return jsonError("INVALID_URL", "A valid http or https URL is required.", 422);
  }

  try {
    const { users, databases } = await createAdminClient();
    await assertTenantAccess(users, userId, tenantId);

    const parsedText = await fetchUrlAsMarkdown(url);
    if (!parsedText.trim()) {
      return jsonError("EMPTY_URL", "No readable text could be extracted from this URL.", 422);
    }

    const document = await databases.createDocument(databaseId(), documentsCollectionId(), ID.unique(), {
      tenant_id: tenantId,
      bot_id: botId,
      file_name: getUrlFileName(url),
      file_type: "url",
      storage_path: url,
      file_size: parsedText.length,
      status: "processing",
      parsed_text: parsedText.slice(0, 500000),
      created: new Date().toISOString(),
    });

    return Response.json({ success: true, data: { document_id: document.$id, url } }, { status: 201 });
  } catch (error: unknown) {
    return jsonError("URL_INGEST_FAILED", error instanceof Error ? error.message : "URL ingestion failed.", 500);
  }
}

async function fetchUrlAsMarkdown(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,text/plain,application/xhtml+xml",
      "User-Agent": "AgentDeskBot/1.0",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error("URL could not be fetched.");
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_FETCH_BYTES) {
    throw new Error("URL content is too large to ingest.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = (await response.text()).slice(0, MAX_FETCH_BYTES);
  return contentType.includes("html") ? htmlToMarkdownishText(text) : normalizeText(text);
}

function htmlToMarkdownishText(html: string) {
  return normalizeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<\/(h[1-6]|p|li|tr|section|article|div)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'"),
  );
}

async function assertTenantAccess(users: Users, userId: string, tenantId: string) {
  const user = await users.get(userId);
  const prefs = user.prefs as { tenant_id?: string };
  if (prefs.tenant_id !== tenantId) {
    throw new Error("You do not have access to this tenant.");
  }
}

function normalizeHttpUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function getUrlFileName(url: string) {
  const parsed = new URL(url);
  return `${parsed.hostname}${parsed.pathname}`.replace(/[^\w.\- ]+/g, "-").slice(0, 180) || parsed.hostname;
}

function normalizeText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function documentsCollectionId() {
  return process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID ?? "document_files";
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

function jsonError(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

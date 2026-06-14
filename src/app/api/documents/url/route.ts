import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/server/appwrite";
import { discoverSitemapUrls, looksLikeSitemapUrl, normalizeHttpUrl } from "@/lib/server/crawler";
import { requireAuthenticatedTenant } from "@/lib/server/route-auth";

type UrlIngestRequest = {
  tenant_id: string;
  bot_id: string;
  url: string;
};

const SITEMAP_PAGE_LIMIT = 30;

export async function POST(request: Request) {
  let body: Partial<UrlIngestRequest>;

  try {
    body = (await request.json()) as Partial<UrlIngestRequest>;
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", 422);
  }

  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id.trim() : "";
  const botId = typeof body.bot_id === "string" ? body.bot_id.trim() : "";
  const url = normalizeHttpUrl(body.url);

  if (!isSafeId(tenantId) || !isSafeId(botId)) {
    return jsonError("INVALID_SCOPE", "tenant_id and bot_id are required.", 422);
  }

  if (!url) {
    return jsonError("INVALID_URL", "A valid http or https URL is required.", 422);
  }

  try {
    await requireAuthenticatedTenant(tenantId);
    const { databases } = await createAdminClient();

    if (looksLikeSitemapUrl(url)) {
      const pageUrls = await discoverSitemapUrls(url, SITEMAP_PAGE_LIMIT);
      if (pageUrls.length === 0) {
        return jsonError("EMPTY_SITEMAP", "No valid page URLs were found in this sitemap.", 422);
      }

      const createdDocuments = [];
      for (const pageUrl of pageUrls) {
        const document = await databases.createDocument(databaseId(), documentsCollectionId(), ID.unique(), {
          tenant_id: tenantId,
          bot_id: botId,
          file_name: getUrlFileName(pageUrl),
          file_type: "url",
          storage_path: pageUrl,
          file_size: 0,
          status: "queued",
          created: new Date().toISOString(),
        });
        createdDocuments.push({ document_id: document.$id, url: pageUrl });
      }

      return Response.json(
        { success: true, data: { sitemap: true, queued: createdDocuments, count: createdDocuments.length } },
        { status: 201 },
      );
    }

    const document = await databases.createDocument(databaseId(), documentsCollectionId(), ID.unique(), {
      tenant_id: tenantId,
      bot_id: botId,
      file_name: getUrlFileName(url),
      file_type: "url",
      storage_path: url,
      file_size: 0,
      status: "queued",
      created: new Date().toISOString(),
    });

    return Response.json({ success: true, data: { document_id: document.$id, url, status: "queued" } }, { status: 201 });
  } catch (error: unknown) {
    return jsonError("URL_INGEST_FAILED", error instanceof Error ? error.message : "URL ingestion failed.", 500);
  }
}

function getUrlFileName(url: string) {
  const parsed = new URL(url);
  return `${parsed.hostname}${parsed.pathname}`.replace(/[^\w.\- ]+/g, "-").slice(0, 180) || parsed.hostname;
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

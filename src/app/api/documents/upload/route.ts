import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "@/lib/server/appwrite";
import { recordBestEffort } from "@/lib/server/best-effort";
import { getDocumentType, parseDocument, SUPPORTED_DOCUMENT_TYPES, type SupportedDocumentType } from "@/lib/server/document-parser";
import { recordDocumentStorageAdded } from "@/lib/server/monitor-rollups";
import { requireAuthenticatedTenant } from "@/lib/server/route-auth";

type UploadMetadata = {
  tenant_id: string;
  bot_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  file_size: number;
  status: "processing";
  parsed_text: string;
  created: string;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const tenantId = stringField(formData, "tenant_id");
    const botId = stringField(formData, "bot_id");
    const file = formData.get("file");

    if (!isSafeId(tenantId) || !isSafeId(botId)) {
      return jsonError("INVALID_SCOPE", "tenant_id and bot_id are required.", 422);
    }

    if (!(file instanceof File)) {
      return jsonError("MISSING_FILE", "A supported document file is required.", 422);
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return jsonError("INVALID_FILE_SIZE", "File must be between 1 byte and 25MB.", 422);
    }

    const fileType = getFileType(file.name);
    if (!fileType || !SUPPORTED_DOCUMENT_TYPES.has(fileType)) {
      return jsonError("UNSUPPORTED_FILE", "Supported file types are PDF, DOC, DOCX, CSV, TXT, and MD.", 422);
    }

    try {
      await requireAuthenticatedTenant(tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to authorize tenant access.";
      return jsonError("UNAUTHORIZED", message, 401);
    }

    const { databases, storage } = await createAdminClient();

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsedText = await parseDocument(buffer, fileType);
    if (!parsedText.trim()) {
      return jsonError("EMPTY_DOCUMENT", "No readable text could be extracted from this file.", 422);
    }

    const storedFile = await storage.createFile(storageBucketId(), ID.unique(), InputFile.fromBuffer(buffer, file.name));
    const metadata: UploadMetadata = {
      tenant_id: tenantId,
      bot_id: botId,
      file_name: sanitizeFileName(file.name),
      file_type: fileType,
      storage_path: storedFile.$id,
      file_size: file.size,
      status: "processing",
      parsed_text: parsedText.slice(0, 500000),
      created: new Date().toISOString(),
    };

    const document = await databases.createDocument(databaseId(), documentsCollectionId(), ID.unique(), metadata);
    await recordBestEffort("document storage rollup", "upload", () => recordDocumentStorageAdded(databases, tenantId, file.size));
    return Response.json({ success: true, data: { document_id: document.$id, ...metadata } }, { status: 201 });
  } catch (error: unknown) {
    return jsonError("UPLOAD_FAILED", getErrorMessage(error), 500);
  }
}

function stringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFileType(fileName: string): SupportedDocumentType | "" {
  return getDocumentType(fileName);
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\- ]+/g, "").trim().slice(0, 180) || "document";
}

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function documentsCollectionId() {
  return process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID ?? "document_files";
}

function storageBucketId() {
  return process.env.APPWRITE_DOCUMENTS_BUCKET_ID ?? process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID ?? "documents";
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

function jsonError(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.startsWith("PARSER_FAILED:")) {
    return "Document parser failed for this file.";
  }

  return error instanceof Error ? error.message : "Document upload failed.";
}


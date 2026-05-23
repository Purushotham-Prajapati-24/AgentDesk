import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { createSessionClient } from "@/lib/server/appwrite";

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

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(["pdf", "docx", "csv", "txt", "md"]);

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
      return jsonError("INVALID_FILE_SIZE", "File must be between 1 byte and 10MB.", 422);
    }

    const fileType = getFileType(file.name);
    if (!SUPPORTED_TYPES.has(fileType)) {
      return jsonError("UNSUPPORTED_FILE", "Supported file types are PDF, DOCX, CSV, TXT, and MD.", 422);
    }

    const { account, databases, storage } = await createSessionClient();
    await assertTenantAccess(account, tenantId);

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
    return Response.json({ success: true, data: { document_id: document.$id, ...metadata } }, { status: 201 });
  } catch (error: unknown) {
    return jsonError("UPLOAD_FAILED", getErrorMessage(error), 500);
  }
}

async function parseDocument(buffer: Buffer, fileType: string) {
  if (fileType === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return normalizeText(result.text);
    } finally {
      await parser.destroy();
    }
  }

  if (fileType === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeText(result.value);
  }

  return normalizeText(buffer.toString("utf8"));
}

async function assertTenantAccess(account: Awaited<ReturnType<typeof createSessionClient>>["account"], tenantId: string) {
  const user = await account.get();
  const prefs = user.prefs as { tenant_id?: string };
  if (prefs.tenant_id !== tenantId) {
    throw new Error("You do not have access to this tenant.");
  }
}

function stringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFileType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension === "markdown" ? "md" : extension;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\- ]+/g, "").trim().slice(0, 180) || "document";
}

function normalizeText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
}

function databaseId() {
  return process.env.APPWRITE_DATABASE_ID ?? process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "agentdesk";
}

function documentsCollectionId() {
  return process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID ?? "document_files";
}

function storageBucketId() {
  return process.env.APPWRITE_DOCUMENTS_BUCKET_ID ?? "documents";
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}

function jsonError(code: string, message: string, status: number) {
  return Response.json({ success: false, error: { code, message, requestId: crypto.randomUUID() } }, { status });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Document upload failed.";
}

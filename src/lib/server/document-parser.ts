import mammoth from "mammoth";
import { extractText } from "unpdf";

export type SupportedDocumentType = "pdf" | "docx" | "doc" | "csv" | "txt" | "md";

export const SUPPORTED_DOCUMENT_TYPES = new Set<SupportedDocumentType>(["pdf", "docx", "doc", "csv", "txt", "md"]);

type WordExtractorModule = new () => {
  extract: (input: Buffer) => Promise<{
    getBody: () => string;
    getFootnotes?: () => string;
    getEndnotes?: () => string;
    getHeaders?: () => string;
  }>;
};

export function getDocumentType(fileName: string): SupportedDocumentType | "" {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const normalized = extension === "markdown" ? "md" : extension;
  return SUPPORTED_DOCUMENT_TYPES.has(normalized as SupportedDocumentType) ? (normalized as SupportedDocumentType) : "";
}

export async function parseDocument(buffer: Buffer, fileType: SupportedDocumentType) {
  try {
    if (fileType === "pdf") {
      return await parsePdf(buffer);
    }

    if (fileType === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      return normalizeText(result.value);
    }

    if (fileType === "doc") {
      return await parseLegacyDoc(buffer);
    }

    return normalizeText(buffer.toString("utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document parsing failed.";
    throw new Error(`PARSER_FAILED: ${message}`);
  }
}

export function normalizeText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

async function parsePdf(buffer: Buffer) {
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  return normalizeText(text);
}

async function parseLegacyDoc(buffer: Buffer) {
  const wordExtractorModule = (await import("word-extractor")) as { default?: WordExtractorModule } & WordExtractorModule;
  const WordExtractor = wordExtractorModule.default ?? wordExtractorModule;
  const extractor = new WordExtractor();
  const document = await extractor.extract(buffer);
  return normalizeText(
    [document.getHeaders?.(), document.getBody(), document.getFootnotes?.(), document.getEndnotes?.()]
      .filter(Boolean)
      .join("\n\n"),
  );
}

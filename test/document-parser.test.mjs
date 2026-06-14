import assert from "node:assert/strict";
import { test } from "node:test";

const parser = await import("../src/lib/server/document-parser.ts");

test("spreadsheet formats are not registered while the xlsx parser dependency is disabled", () => {
  assert.ok(!parser.SUPPORTED_DOCUMENT_TYPES.has("xlsx"));
  assert.ok(!parser.SUPPORTED_DOCUMENT_TYPES.has("xls"));
});

test("getDocumentType resolves supported text and document extensions", () => {
  assert.equal(parser.getDocumentType("guide.pdf"), "pdf");
  assert.equal(parser.getDocumentType("faq.docx"), "docx");
  assert.equal(parser.getDocumentType("legacy.doc"), "doc");
  assert.equal(parser.getDocumentType("notes.md"), "md");
  assert.equal(parser.getDocumentType("data.csv"), "csv");
});

test("getDocumentType rejects xlsx and xls extensions", () => {
  assert.equal(parser.getDocumentType("report.xlsx"), "");
  assert.equal(parser.getDocumentType("data.xls"), "");
});

test("parseDocument handles plain text-like content", async () => {
  const result = await parser.parseDocument(Buffer.from("Hello\r\n\r\n\r\nworld"), "txt");
  assert.equal(result, "Hello\n\nworld");
});

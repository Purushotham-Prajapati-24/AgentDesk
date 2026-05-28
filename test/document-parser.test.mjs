import assert from "node:assert/strict";
import { test } from "node:test";
import * as XLSX from "xlsx";

const parser = await import("../src/lib/server/document-parser.ts");

// ── Type Registration ────────────────────────────────────────────────

test("xlsx and xls are registered in SUPPORTED_DOCUMENT_TYPES", () => {
  assert.ok(parser.SUPPORTED_DOCUMENT_TYPES.has("xlsx"));
  assert.ok(parser.SUPPORTED_DOCUMENT_TYPES.has("xls"));
});

test("getDocumentType resolves .xlsx and .xls extensions", () => {
  assert.equal(parser.getDocumentType("report.xlsx"), "xlsx");
  assert.equal(parser.getDocumentType("data.xls"), "xls");
  assert.equal(parser.getDocumentType("BUDGET.XLSX"), "xlsx");
  assert.equal(parser.getDocumentType("archive.XLS"), "xls");
});

// ── Header-Aware Serialization ───────────────────────────────────────

test("parseExcel produces header-aware row serialization", () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Plan", "Price", "Users"],
    ["Basic", "$9/mo", "1"],
    ["Pro", "$29/mo", "10"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Pricing");
  const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

  const result = parser.parseExcel(buffer);

  assert.ok(result.includes('## Sheet: "Pricing"'), "should have sheet header");
  assert.ok(result.includes("Plan: Basic | Price: $9/mo | Users: 1"), "should have first data row");
  assert.ok(result.includes("Plan: Pro | Price: $29/mo | Users: 10"), "should have second data row");
  assert.ok(!result.includes("Plan: Plan"), "header row should not appear as data");
});

// ── Multi-Sheet Handling ─────────────────────────────────────────────

test("parseExcel handles multiple sheets", () => {
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.aoa_to_sheet([
    ["Name", "Role"],
    ["Alice", "Engineer"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, "Team");

  const ws2 = XLSX.utils.aoa_to_sheet([
    ["Question", "Answer"],
    ["Refund?", "30 days"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws2, "FAQ");

  const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  const result = parser.parseExcel(buffer);

  assert.ok(result.includes('## Sheet: "Team"'), "should have Team sheet header");
  assert.ok(result.includes('## Sheet: "FAQ"'), "should have FAQ sheet header");
  assert.ok(result.includes("Name: Alice | Role: Engineer"));
  assert.ok(result.includes("Question: Refund? | Answer: 30 days"));
});

// ── Empty Row / Cell Handling ────────────────────────────────────────

test("parseExcel skips empty rows and omits empty cells", () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Col A", "Col B", "Col C"],
    ["val1", "", "val3"],
    ["", "", ""],
    ["val4", "val5", "val6"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Sparse");
  const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

  const result = parser.parseExcel(buffer);

  assert.ok(result.includes("Col A: val1 | Col C: val3"), "should skip empty Col B");
  assert.ok(!result.includes("Col A:  |"), "should not have empty value pairs");
  assert.ok(result.includes("Col A: val4 | Col B: val5 | Col C: val6"), "should have full row");

  const lines = result.split("\n").filter((l) => l.startsWith("Col"));
  assert.equal(lines.length, 2, "empty row should be skipped entirely");
});

// ── Empty Workbook ───────────────────────────────────────────────────

test("parseExcel returns empty string for workbook with no data", () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.book_append_sheet(wb, ws, "Empty");
  const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

  const result = parser.parseExcel(buffer);
  assert.equal(result, "");
});

// ── XLS Format ───────────────────────────────────────────────────────

test("parseExcel handles XLS (BIFF) format", () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Product", "SKU"],
    ["Widget", "W-001"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Catalog");
  const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xls" }));

  const result = parser.parseExcel(buffer);
  assert.ok(result.includes("Product: Widget | SKU: W-001"));
});

// ── Integration: parseDocument routes xlsx correctly ──────────────────

test("parseDocument routes xlsx file type to parseExcel", async () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Key", "Value"],
    ["timeout", "30s"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Config");
  const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

  const result = await parser.parseDocument(buffer, "xlsx");
  assert.ok(result.includes("Key: timeout | Value: 30s"));
});

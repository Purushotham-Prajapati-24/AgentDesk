import assert from "node:assert/strict";
import { test } from "node:test";

import { parseMarkdownBlocks, parseMarkdownInline } from "../src/lib/markdown.ts";

test("parseMarkdownBlocks groups paragraphs, headings, and lists", () => {
  const blocks = parseMarkdownBlocks("# Summary\n\nIntro line\nwrapped line\n\n- First item\ncontinuation\n- Second item\n\n1. Step one\n2. Step two");

  assert.deepEqual(blocks, [
    { kind: "heading", level: 1, text: "Summary" },
    { kind: "paragraph", text: "Intro line wrapped line" },
    { kind: "list", ordered: false, items: ["First item continuation", "Second item"] },
    { kind: "list", ordered: true, items: ["Step one", "Step two"] },
  ]);
});

test("parseMarkdownInline formats emphasis, code, markdown links, and raw urls", () => {
  const tokens = parseMarkdownInline("Read **docs** and *notes* with `code` at [Help](https://example.com/help) or https://example.com/path.");

  assert.deepEqual(tokens, [
    { kind: "text", text: "Read " },
    { kind: "strong", text: "docs" },
    { kind: "text", text: " and " },
    { kind: "emphasis", text: "notes" },
    { kind: "text", text: " with " },
    { kind: "code", text: "code" },
    { kind: "text", text: " at " },
    { kind: "link", text: "Help", href: "https://example.com/help" },
    { kind: "text", text: " or " },
    { kind: "link", text: "https://example.com/path", href: "https://example.com/path" },
    { kind: "text", text: "." },
  ]);
});

test("parseMarkdownInline leaves unsafe markdown links as text", () => {
  const tokens = parseMarkdownInline("Do not link [bad](javascript:alert(1)).");

  assert.deepEqual(tokens, [{ kind: "text", text: "Do not link [bad](javascript:alert(1))." }]);
});

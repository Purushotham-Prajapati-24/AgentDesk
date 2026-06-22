import assert from "node:assert/strict";
import { test } from "node:test";
import { recordBestEffort } from "../src/lib/server/best-effort.ts";

test("recordBestEffort returns when callback succeeds", async () => {
  let called = false;
  await recordBestEffort("test label", "test-tag", async () => {
    called = true;
    return 42;
  });
  assert.equal(called, true);
});

test("recordBestEffort swallows errors without throwing", async () => {
  const error = new Error("boom");
  // Should NOT throw
  await recordBestEffort("failing op", "test-tag", async () => {
    throw error;
  });
});

test("recordBestEffort logs label and tag on failure", async () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));

  try {
    await recordBestEffort("ledger rollup", "credits", async () => {
      throw new Error("network failure");
    });

    assert.ok(warnings.length >= 1, "should have logged a warning");
    const logged = warnings.find((w) => w.includes("ledger rollup") && w.includes("credits"));
    assert.ok(logged, "warning should contain label and tag");
  } finally {
    console.warn = originalWarn;
  }
});

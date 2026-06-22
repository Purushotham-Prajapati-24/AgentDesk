/**
 * Pure billing-domain helpers shared between the runtime billing path
 * (credits.ts) and operator scripts (backfill-billing-rollups.mjs).
 *
 * IMPORTANT: This file MUST NOT have a "use server" directive.  It exports
 * synchronous functions, which Next.js / Turbopack forbids in server-action
 * modules ("Server Actions must be async functions").  Importing a sync helper
 * into a "use server" file is fine; exporting one from such a file is not.
 *
 * The backfill script keeps its own copy of this logic because plain .mjs
 * files cannot resolve the @/ path alias.  See the canonical-source comment in
 * backfill-billing-rollups.mjs.
 */

import type { Models } from "node-appwrite";

export type FileDocument = Models.Document & {
  file_size?: unknown;
  file_type?: unknown;
  parsed_text?: unknown;
};

/**
 * Computes the storage byte contribution of a single document.
 *
 * URL-type documents that have been ingested store their text in `parsed_text`;
 * their storage cost is the byte length of that text.  All other document types
 * use the `file_size` attribute from Appwrite storage metadata.
 *
 * Both the runtime billing path and the backfill script use this function so
 * the rollup value matches what the fallback would compute.
 */
export function documentStorageBytes(document: FileDocument): number {
  if (
    document.file_type === "url" &&
    typeof document.parsed_text === "string" &&
    document.parsed_text.trim() !== ""
  ) {
    return Buffer.byteLength(document.parsed_text, "utf8");
  }
  return numberValue(document.file_size);
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

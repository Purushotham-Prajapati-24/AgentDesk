import {
  mergeWebChatConfig,
  parseWebChatConfigJson,
  parseWebChatConfig,
  type WebChatConfig,
  type WebChatConfigPatch,
} from "@/lib/webchat-config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Per-tenant in-process fallback when the filesystem is unavailable.
const runtimeConfigByTenant = new Map<string, WebChatConfig>();

// The legacy global config (read from WEBCHAT_CONFIG_JSON env or defaults).
// Used as the base when a tenant has no stored config yet.
const baseConfig: WebChatConfig = parseWebChatConfigJson(process.env.WEBCHAT_CONFIG_JSON);

function tenantConfigPath(tenantId: string) {
  // Sanitize tenantId to a safe filename segment (callers must pass a validated id).
  const safe = tenantId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(process.cwd(), ".next", `webchat-config-${safe}.json`);
}

/**
 * Returns the WebChat config for the given tenant.
 * Falls back to the base (global) config when no tenant-specific config exists.
 * Pass `tenantId` to get or set a per-tenant config; omit for the legacy global read.
 */
export async function getWebChatConfig(tenantId?: string): Promise<WebChatConfig> {
  if (!tenantId) {
    // Legacy global read (GET /api/webchat/config, no tenant scope).
    return baseConfig;
  }

  try {
    const file = await readFile(tenantConfigPath(tenantId), "utf8");
    const parsed = parseWebChatConfig(JSON.parse(file));
    runtimeConfigByTenant.set(tenantId, parsed);
    return parsed;
  } catch {
    // Fall back to in-process cache, then to the base config.
  }

  return runtimeConfigByTenant.get(tenantId) ?? baseConfig;
}

/**
 * Merges `patch` into the tenant's current config and persists it.
 * Each tenant's config is stored in a separate file, preventing cross-tenant mutation.
 */
export async function updateWebChatConfig(tenantId: string, patch: WebChatConfigPatch): Promise<WebChatConfig> {
  const current = await getWebChatConfig(tenantId);
  const next = mergeWebChatConfig(current, patch);
  runtimeConfigByTenant.set(tenantId, next);

  try {
    const filePath = tenantConfigPath(tenantId);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // In serverless/read-only environments the in-process cache still serves the request.
    // Production should replace this with durable per-tenant storage.
  }

  return next;
}

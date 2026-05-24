import {
  mergeWebChatConfig,
  parseWebChatConfigJson,
  parseWebChatConfig,
  type WebChatConfig,
  type WebChatConfigPatch,
} from "@/lib/webchat-config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

let runtimeConfig: WebChatConfig = parseWebChatConfigJson(process.env.WEBCHAT_CONFIG_JSON);

const runtimeConfigPath = path.join(process.cwd(), ".next", "webchat-config.json");

export async function getWebChatConfig() {
  try {
    const file = await readFile(runtimeConfigPath, "utf8");
    runtimeConfig = parseWebChatConfig(JSON.parse(file));
  } catch {
    // Fall back to the process-local config when the runtime file does not exist
    // or the host does not allow filesystem writes.
  }

  return runtimeConfig;
}

export async function updateWebChatConfig(patch: WebChatConfigPatch) {
  runtimeConfig = mergeWebChatConfig(runtimeConfig, patch);
  try {
    await mkdir(path.dirname(runtimeConfigPath), { recursive: true });
    await writeFile(runtimeConfigPath, JSON.stringify(runtimeConfig, null, 2), "utf8");
  } catch {
    // In serverless/read-only environments, the in-process fallback still allows
    // the request to succeed. Production should replace this with durable storage.
  }

  return runtimeConfig;
}

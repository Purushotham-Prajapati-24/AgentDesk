"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_WEBCHAT_CONFIG,
  WEBCHAT_CONFIG_STORAGE_KEY,
  WebChatConfigPatchSchema,
  WebChatConfigSchema,
  mergeWebChatConfig,
  type WebChatConfig,
  type WebChatConfigPatch,
  type WebChatSection,
} from "@/lib/webchat-config";

type SaveState = "idle" | "saving" | "saved" | "error";

type WebChatConfigContextValue = {
  config: WebChatConfig;
  saveState: SaveState;
  error: string;
  updateSection: <Section extends WebChatSection>(section: Section, patch: Partial<WebChatConfig[Section]>) => void;
  replaceConfig: (nextConfig: WebChatConfig) => void;
  resetConfig: () => void;
  saveConfig: () => Promise<boolean>;
};

const WebChatConfigContext = createContext<WebChatConfigContextValue | undefined>(undefined);

export const ConfigSchema = WebChatConfigSchema;

export function WebChatConfigProvider({ children }: { children: React.ReactNode }) {
  const didLoadStorageRef = useRef(false);
  const [config, setConfig] = useState<WebChatConfig>(DEFAULT_WEBCHAT_CONFIG);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const storedConfig = window.localStorage.getItem(WEBCHAT_CONFIG_STORAGE_KEY);
    const parsedConfig = storedConfig ? parseStoredConfig(storedConfig) : DEFAULT_WEBCHAT_CONFIG;

    window.setTimeout(() => {
      setConfig(parsedConfig);
      didLoadStorageRef.current = true;
    }, 0);
  }, []);

  useEffect(() => {
    if (!didLoadStorageRef.current) {
      return;
    }

    window.localStorage.setItem(WEBCHAT_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateSection = useCallback(
    <Section extends WebChatSection>(section: Section, patch: Partial<WebChatConfig[Section]>) => {
      setConfig((current) => {
        const nextConfig = {
          ...current,
          [section]: {
            ...current[section],
            ...patch,
          },
        } as WebChatConfig;

        setSaveState("idle");
        setError("");
        return nextConfig;
      });
    },
    [],
  );

  const replaceConfig = useCallback((nextConfig: WebChatConfig) => {
    const parsed = WebChatConfigSchema.safeParse(nextConfig);
    if (!parsed.success) {
      setSaveState("error");
      setError(parsed.error.issues[0]?.message ?? "Invalid WebChat configuration.");
      return;
    }

    setConfig(parsed.data);
    setSaveState("idle");
    setError("");
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_WEBCHAT_CONFIG);
    setSaveState("idle");
    setError("");
  }, []);

  const saveConfig = useCallback(async () => {
    setSaveState("saving");
    setError("");

    const parsedPayload = WebChatConfigPatchSchema.safeParse(config satisfies WebChatConfigPatch);
    if (!parsedPayload.success) {
      setSaveState("error");
      setError(parsedPayload.error.issues[0]?.message ?? "Invalid WebChat configuration.");
      return false;
    }

    try {
      const response = await fetch("/api/webchat/config/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedPayload.data),
      });
      const body = (await response.json()) as
        | { success: true; data: { config: WebChatConfig } }
        | { success: false; error: { message: string } };

      if (!response.ok || !body.success) {
        setSaveState("error");
        setError(body.success ? "Unable to save WebChat configuration." : body.error.message);
        return false;
      }

      setConfig(mergeWebChatConfig(DEFAULT_WEBCHAT_CONFIG, body.data.config));
      setSaveState("saved");
      return true;
    } catch (saveError: unknown) {
      setSaveState("error");
      setError(saveError instanceof Error ? saveError.message : "Unable to save WebChat configuration.");
      return false;
    }
  }, [config]);

  const value = useMemo(
    () => ({
      config,
      saveState,
      error,
      updateSection,
      replaceConfig,
      resetConfig,
      saveConfig,
    }),
    [config, error, replaceConfig, resetConfig, saveConfig, saveState, updateSection],
  );

  return <WebChatConfigContext.Provider value={value}>{children}</WebChatConfigContext.Provider>;
}

export function useWebChatConfig() {
  const context = useContext(WebChatConfigContext);
  if (!context) {
    throw new Error("useWebChatConfig must be used within a WebChatConfigProvider.");
  }

  return context;
}

function parseStoredConfig(value: string) {
  try {
    return WebChatConfigSchema.parse(JSON.parse(value));
  } catch {
    return DEFAULT_WEBCHAT_CONFIG;
  }
}

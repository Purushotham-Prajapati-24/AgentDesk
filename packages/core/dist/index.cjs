"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DEFAULT_SAAS_ORIGIN: () => DEFAULT_SAAS_ORIGIN,
  WIDGET_ELEMENT_NAME: () => WIDGET_ELEMENT_NAME,
  acquireInstance: () => acquireInstance,
  getActiveBotIds: () => getActiveBotIds,
  getEntry: () => getEntry,
  postSetMode: () => postSetMode,
  releaseInstance: () => releaseInstance
});
module.exports = __toCommonJS(index_exports);
var WIDGET_ELEMENT_NAME = "agentdesk-widget";
var DEFAULT_SAAS_ORIGIN = "https://agentdeskbot.vercel.app";
function getWindow() {
  if (typeof window === "undefined") return null;
  return window;
}
function getRegistry(windowRef) {
  let registry = windowRef.__agentdeskWidgetInstances;
  if (!registry) {
    registry = /* @__PURE__ */ new Map();
    windowRef.__agentdeskWidgetInstances = registry;
  }
  return registry;
}
function acquireInstance(botId, mode) {
  const windowRef = getWindow();
  if (!windowRef) {
    return {
      isFirstForBot: true,
      mustInstallListener: true,
      modeChanged: false,
      entry: { count: 1, mode }
    };
  }
  const registry = getRegistry(windowRef);
  const existing = registry.get(botId);
  const isFirstForBot = !existing;
  const modeChanged = Boolean(existing) && existing.mode !== mode;
  const entry = existing ?? { count: 0, mode };
  entry.count += 1;
  if (modeChanged) {
    entry.mode = mode;
  }
  registry.set(botId, entry);
  const previousListenerCount = windowRef.__agentdeskGlobalListenerCount ?? 0;
  const nextListenerCount = previousListenerCount + 1;
  windowRef.__agentdeskGlobalListenerCount = nextListenerCount;
  const mustInstallListener = previousListenerCount === 0;
  return {
    isFirstForBot,
    mustInstallListener,
    modeChanged,
    entry
  };
}
function releaseInstance(botId) {
  const windowRef = getWindow();
  if (!windowRef) {
    return { isLastForBot: true, mustRemoveListener: true };
  }
  const registry = getRegistry(windowRef);
  const entry = registry.get(botId);
  if (!entry) {
    return { isLastForBot: true, mustRemoveListener: false };
  }
  entry.count = Math.max(0, entry.count - 1);
  let isLastForBot = false;
  if (entry.count === 0) {
    registry.delete(botId);
    isLastForBot = true;
  }
  const previousListenerCount = windowRef.__agentdeskGlobalListenerCount ?? 0;
  const nextListenerCount = Math.max(0, previousListenerCount - 1);
  windowRef.__agentdeskGlobalListenerCount = nextListenerCount;
  const mustRemoveListener = nextListenerCount === 0 && previousListenerCount > 0;
  return { isLastForBot, mustRemoveListener };
}
function getEntry(botId) {
  const windowRef = getWindow();
  if (!windowRef) return void 0;
  const registry = getRegistry(windowRef);
  return registry.get(botId);
}
function getActiveBotIds() {
  const windowRef = getWindow();
  if (!windowRef) return [];
  const registry = getRegistry(windowRef);
  return Array.from(registry.keys());
}
function postSetMode(botId, mode) {
  const windowRef = getWindow();
  if (!windowRef) return;
  const payload = { type: "agentdesk-set-mode", botId, mode };
  try {
    windowRef.postMessage(payload, windowRef.location.origin);
  } catch {
  }
  try {
    if (windowRef.parent && windowRef.parent !== windowRef) {
      let parentOrigin = "*";
      if (typeof document !== "undefined" && document.referrer) {
        try {
          const refUrl = new URL(document.referrer);
          if (refUrl.protocol === "http:" || refUrl.protocol === "https:") {
            parentOrigin = refUrl.origin;
          }
        } catch {
        }
      }
      windowRef.parent.postMessage(payload, parentOrigin);
    }
  } catch {
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_SAAS_ORIGIN,
  WIDGET_ELEMENT_NAME,
  acquireInstance,
  getActiveBotIds,
  getEntry,
  postSetMode,
  releaseInstance
});
//# sourceMappingURL=index.cjs.map
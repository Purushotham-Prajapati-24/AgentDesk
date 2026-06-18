'use client';
"use strict";
"use client";
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

// src/index.tsx
var src_exports = {};
__export(src_exports, {
  AgentDeskWidget: () => AgentDeskWidget
});
module.exports = __toCommonJS(src_exports);
var import_react = require("react");
var import_core = require("@agentdeskbot/core");
var listenerBuckets = /* @__PURE__ */ new Map();
var globalListenerInstalled = false;
var globalListenerRef = null;
function installGlobalListener() {
  if (globalListenerInstalled) return;
  globalListenerInstalled = true;
  globalListenerRef = (event) => {
    var _a, _b, _c, _d, _e, _f;
    if (!event.data || typeof event.data !== "object") return;
    const data = event.data;
    if (typeof data.botId !== "string") return;
    const bucket = listenerBuckets.get(data.botId);
    if (!bucket) return;
    let originAllowed = false;
    for (const entry of bucket) {
      const allowedOrigins = /* @__PURE__ */ new Set([window.location.origin]);
      if (entry.apiOrigin) {
        try {
          allowedOrigins.add(new URL(entry.apiOrigin).origin);
        } catch {
        }
      }
      if (entry.scriptSrc) {
        try {
          allowedOrigins.add(new URL(entry.scriptSrc, window.location.origin).origin);
        } catch {
        }
      }
      if (allowedOrigins.has(event.origin)) {
        originAllowed = true;
        break;
      }
    }
    if (!originAllowed) return;
    for (const entry of bucket) {
      switch (data.type) {
        case "agentdesk-widget-open":
          (_a = entry.onOpen) == null ? void 0 : _a.call(entry);
          break;
        case "agentdesk-widget-close":
          (_b = entry.onClose) == null ? void 0 : _b.call(entry);
          break;
        case "agentdesk-widget-ready":
          (_c = entry.onReady) == null ? void 0 : _c.call(entry);
          break;
        case "agentdesk-widget-error":
          (_d = entry.onError) == null ? void 0 : _d.call(entry, { message: data.message || "Unknown error" });
          break;
        case "agentdesk-widget-message-sent":
          (_e = entry.onMessageSent) == null ? void 0 : _e.call(entry, { text: data.text || "" });
          break;
        case "agentdesk-widget-injected":
          (_f = entry.onWidgetInjected) == null ? void 0 : _f.call(entry);
          break;
      }
    }
  };
  window.addEventListener("message", globalListenerRef);
}
function uninstallGlobalListener() {
  if (!globalListenerInstalled) return;
  globalListenerInstalled = false;
  if (globalListenerRef) {
    window.removeEventListener("message", globalListenerRef);
    globalListenerRef = null;
  }
}
var SCRIPT_TAG = "data-agentdesk";
function findExistingScript(botId) {
  var _a;
  return (_a = Array.from(
    document.querySelectorAll(`script[${SCRIPT_TAG}]`)
  ).find((candidate) => candidate.dataset.botId === botId)) != null ? _a : null;
}
function injectScript(options) {
  const script = document.createElement("script");
  script.src = options.scriptSrc;
  script.async = true;
  script.setAttribute(SCRIPT_TAG, "");
  script.dataset.botId = options.botId;
  script.dataset.mode = options.mode;
  if (options.configUrl) script.dataset.configUrl = options.configUrl;
  if (options.apiOrigin) script.dataset.apiOrigin = options.apiOrigin;
  if (options.theme) script.dataset.theme = options.theme;
  if (options.cspNonce) {
    script.dataset.cspNonce = options.cspNonce;
    script.setAttribute("nonce", options.cspNonce);
  }
  if (options.position) script.dataset.position = options.position;
  if (options.className) script.dataset.className = options.className;
  document.body.append(script);
}
function removeScriptAndWidget(botId) {
  var _a;
  (_a = findExistingScript(botId)) == null ? void 0 : _a.remove();
  document.querySelectorAll(`${import_core.WIDGET_ELEMENT_NAME}[data-bot-id="${botId}"]`).forEach((el) => el.remove());
}
function AgentDeskWidget({
  botId,
  configUrl,
  mode = "launcher",
  scriptSrc = "/widget.js",
  apiOrigin,
  theme,
  cspNonce,
  position,
  className,
  onOpen,
  onClose,
  onReady,
  onError,
  onMessageSent,
  onWidgetInjected
}) {
  const modeRef = (0, import_react.useRef)(mode);
  (0, import_react.useEffect)(() => {
    modeRef.current = mode;
  });
  const entryRef = (0, import_react.useRef)({
    apiOrigin,
    scriptSrc
  });
  (0, import_react.useEffect)(() => {
    entryRef.current.apiOrigin = apiOrigin;
    entryRef.current.scriptSrc = scriptSrc;
    entryRef.current.onOpen = onOpen;
    entryRef.current.onClose = onClose;
    entryRef.current.onReady = onReady;
    entryRef.current.onError = onError;
    entryRef.current.onMessageSent = onMessageSent;
    entryRef.current.onWidgetInjected = onWidgetInjected;
  });
  const [prevBotId, setPrevBotId] = (0, import_react.useState)(null);
  const [initialProps, setInitialProps] = (0, import_react.useState)({ theme, cspNonce, position, className, mode });
  if (prevBotId !== botId) {
    setPrevBotId(botId);
    setInitialProps({ theme, cspNonce, position, className, mode });
  }
  (0, import_react.useEffect)(() => {
    if (typeof window === "undefined") return;
    if (!botId) return;
    const acquire = (0, import_core.acquireInstance)(botId, initialProps.mode);
    if (acquire.mustInstallListener) {
      installGlobalListener();
    }
    if (acquire.isFirstForBot) {
      if (!findExistingScript(botId)) {
        injectScript({
          botId,
          mode: initialProps.mode,
          scriptSrc,
          configUrl,
          apiOrigin,
          theme: initialProps.theme,
          cspNonce: initialProps.cspNonce,
          position: initialProps.position,
          className: initialProps.className
        });
      }
    } else if (acquire.modeChanged) {
      (0, import_core.postSetMode)(botId, modeRef.current);
    }
    if (!listenerBuckets.has(botId)) {
      listenerBuckets.set(botId, /* @__PURE__ */ new Set());
    }
    const currentEntry = entryRef.current;
    listenerBuckets.get(botId).add(currentEntry);
    if (typeof customElements !== "undefined") {
      void customElements.whenDefined(import_core.WIDGET_ELEMENT_NAME).catch(() => {
      });
    }
    return () => {
      const release = (0, import_core.releaseInstance)(botId);
      const bucket = listenerBuckets.get(botId);
      if (bucket) {
        bucket.delete(currentEntry);
        if (bucket.size === 0) {
          listenerBuckets.delete(botId);
        }
      }
      if (release.isLastForBot) {
        removeScriptAndWidget(botId);
      }
      if (release.mustRemoveListener) {
        uninstallGlobalListener();
      }
    };
  }, [botId, scriptSrc, configUrl, apiOrigin, initialProps]);
  const isFirstModeRender = (0, import_react.useRef)(true);
  (0, import_react.useEffect)(() => {
    if (typeof window === "undefined") return;
    if (isFirstModeRender.current) {
      isFirstModeRender.current = false;
      return;
    }
    if (!botId) return;
    (0, import_core.postSetMode)(botId, mode);
  }, [mode, botId]);
  (0, import_react.useEffect)(() => {
    if (typeof window === "undefined") return;
    if (!botId) return;
    const script = findExistingScript(botId);
    if (script) {
      if (position) script.dataset.position = position;
      else delete script.dataset.position;
      if (className) script.dataset.className = className;
      else delete script.dataset.className;
    }
    const widgetEl = document.querySelector(`${import_core.WIDGET_ELEMENT_NAME}[data-bot-id="${botId}"]`);
    if (widgetEl) {
      if (className) {
        widgetEl.className = className;
      } else {
        widgetEl.removeAttribute("class");
      }
      if (position) {
        widgetEl.setAttribute("data-agentdesk-position", position);
      } else {
        widgetEl.removeAttribute("data-agentdesk-position");
      }
    }
  }, [botId, position, className]);
  if (typeof window === "undefined") {
    console.warn(
      "[AgentDesk] AgentDeskWidget was rendered on the server. If you are using Next.js App Router, please import from '@agentdeskbot/react/nextjs' instead to ensure proper SSR/App Router integration."
    );
    return null;
  }
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AgentDeskWidget
});
//# sourceMappingURL=index.cjs.map
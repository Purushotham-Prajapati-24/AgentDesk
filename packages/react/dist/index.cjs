'use client';
'use strict';

var react = require('react');
var core = require('@agentdeskbot/core');

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
    const allowedOrigins = /* @__PURE__ */ new Set([window.location.origin]);
    let originAllowed = allowedOrigins.has(event.origin);
    for (const entry of bucket) {
      if (!originAllowed) {
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
        }
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
  document.querySelectorAll(`${core.WIDGET_ELEMENT_NAME}[data-bot-id="${botId}"]`).forEach((el) => el.remove());
}
var defaultSaaSOriginWarned = false;
function AgentDeskWidget({
  botId,
  configUrl,
  mode = "launcher",
  scriptSrc = `${core.DEFAULT_SAAS_ORIGIN}/widget.js`,
  apiOrigin = core.DEFAULT_SAAS_ORIGIN,
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
  const modeRef = react.useRef(mode);
  react.useEffect(() => {
    modeRef.current = mode;
  });
  const entryRef = react.useRef({
    apiOrigin,
    scriptSrc,
    onOpen,
    onClose,
    onReady,
    onError,
    onMessageSent,
    onWidgetInjected
  });
  react.useEffect(() => {
    entryRef.current.apiOrigin = apiOrigin;
    entryRef.current.scriptSrc = scriptSrc;
    entryRef.current.onOpen = onOpen;
    entryRef.current.onClose = onClose;
    entryRef.current.onReady = onReady;
    entryRef.current.onError = onError;
    entryRef.current.onMessageSent = onMessageSent;
    entryRef.current.onWidgetInjected = onWidgetInjected;
  }, [
    apiOrigin,
    scriptSrc,
    onOpen,
    onClose,
    onReady,
    onError,
    onMessageSent,
    onWidgetInjected
  ]);
  const initialProps = react.useMemo(
    () => ({ theme, cspNonce, position, className, mode }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [botId]
  );
  react.useEffect(() => {
    if (!botId) return;
    if (!defaultSaaSOriginWarned && (apiOrigin === core.DEFAULT_SAAS_ORIGIN || scriptSrc === `${core.DEFAULT_SAAS_ORIGIN}/widget.js`)) {
      defaultSaaSOriginWarned = true;
      console.warn(
        `[AgentDesk] Using default hosted endpoints (${core.DEFAULT_SAAS_ORIGIN}). For custom backend configurations, please specify the apiOrigin and scriptSrc props explicitly.`
      );
    }
    const acquire = core.acquireInstance(botId, initialProps.mode);
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
      core.postSetMode(botId, modeRef.current);
    }
    if (!listenerBuckets.has(botId)) {
      listenerBuckets.set(botId, /* @__PURE__ */ new Set());
    }
    const currentEntry = entryRef.current;
    listenerBuckets.get(botId).add(currentEntry);
    if (typeof customElements !== "undefined") {
      void customElements.whenDefined(core.WIDGET_ELEMENT_NAME).catch(() => {
      });
    }
    return () => {
      const release = core.releaseInstance(botId);
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
  }, [botId, scriptSrc, configUrl, apiOrigin]);
  const isFirstModeRender = react.useRef(true);
  react.useEffect(() => {
    if (typeof window === "undefined") return;
    if (isFirstModeRender.current) {
      isFirstModeRender.current = false;
      return;
    }
    if (!botId) return;
    core.postSetMode(botId, mode);
  }, [mode, botId]);
  react.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!botId) return;
    const script = findExistingScript(botId);
    if (script) {
      if (position) script.dataset.position = position;
      else delete script.dataset.position;
      if (className) script.dataset.className = className;
      else delete script.dataset.className;
    }
    const widgetEl = document.querySelector(`${core.WIDGET_ELEMENT_NAME}[data-bot-id="${botId}"]`);
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
    return null;
  }
  return null;
}

exports.AgentDeskWidget = AgentDeskWidget;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map
'use client';
import { useRef, useEffect } from 'react';
import { acquireInstance, postSetMode, WIDGET_ELEMENT_NAME, releaseInstance } from '@agentdeskbot/core';

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
    if (bucket.apiOrigin) {
      try {
        allowedOrigins.add(new URL(bucket.apiOrigin).origin);
      } catch {
      }
    }
    if (bucket.scriptSrc) {
      try {
        allowedOrigins.add(new URL(bucket.scriptSrc, window.location.origin).origin);
      } catch {
      }
    }
    if (!allowedOrigins.has(event.origin)) return;
    switch (data.type) {
      case "agentdesk-widget-open":
        (_a = bucket.onOpen) == null ? void 0 : _a.call(bucket);
        break;
      case "agentdesk-widget-close":
        (_b = bucket.onClose) == null ? void 0 : _b.call(bucket);
        break;
      case "agentdesk-widget-ready":
        (_c = bucket.onReady) == null ? void 0 : _c.call(bucket);
        break;
      case "agentdesk-widget-error":
        (_d = bucket.onError) == null ? void 0 : _d.call(bucket, { message: data.message || "Unknown error" });
        break;
      case "agentdesk-widget-message-sent":
        (_e = bucket.onMessageSent) == null ? void 0 : _e.call(bucket, { text: data.text || "" });
        break;
      case "agentdesk-widget-injected":
        (_f = bucket.onWidgetInjected) == null ? void 0 : _f.call(bucket);
        break;
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
  document.querySelectorAll(`${WIDGET_ELEMENT_NAME}[data-bot-id="${botId}"]`).forEach((el) => el.remove());
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
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onMessageSentRef = useRef(onMessageSent);
  const onWidgetInjectedRef = useRef(onWidgetInjected);
  const modeRef = useRef(mode);
  const initialPropsRef = useRef({ theme, cspNonce, position, className, mode });
  useEffect(() => {
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
    onMessageSentRef.current = onMessageSent;
    onWidgetInjectedRef.current = onWidgetInjected;
    modeRef.current = mode;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!botId) return;
    const acquire = acquireInstance(botId, initialPropsRef.current.mode);
    if (acquire.mustInstallListener) {
      installGlobalListener();
    }
    if (acquire.isFirstForBot) {
      if (!findExistingScript(botId)) {
        injectScript({
          botId,
          mode: initialPropsRef.current.mode,
          scriptSrc,
          configUrl,
          apiOrigin,
          theme: initialPropsRef.current.theme,
          cspNonce: initialPropsRef.current.cspNonce,
          position: initialPropsRef.current.position,
          className: initialPropsRef.current.className
        });
      }
    } else if (acquire.modeChanged) {
      postSetMode(botId, modeRef.current);
    }
    const bucket = {
      apiOrigin,
      scriptSrc,
      onOpen: onOpenRef.current,
      onClose: onCloseRef.current,
      onReady: onReadyRef.current,
      onError: onErrorRef.current,
      onMessageSent: onMessageSentRef.current,
      onWidgetInjected: onWidgetInjectedRef.current
    };
    listenerBuckets.set(botId, bucket);
    if (typeof customElements !== "undefined") {
      void customElements.whenDefined(WIDGET_ELEMENT_NAME).catch(() => {
      });
    }
    return () => {
      const release = releaseInstance(botId);
      if (release.isLastForBot) {
        listenerBuckets.delete(botId);
        removeScriptAndWidget(botId);
      }
      if (release.mustRemoveListener) {
        uninstallGlobalListener();
      }
    };
  }, [botId, scriptSrc, configUrl, apiOrigin]);
  const isFirstModeRender = useRef(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isFirstModeRender.current) {
      isFirstModeRender.current = false;
      return;
    }
    if (!botId) return;
    postSetMode(botId, mode);
  }, [mode, botId]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!botId) return;
    const script = findExistingScript(botId);
    if (script) {
      if (theme) script.dataset.theme = theme;
      else delete script.dataset.theme;
      if (position) script.dataset.position = position;
      else delete script.dataset.position;
      if (className) script.dataset.className = className;
      else delete script.dataset.className;
      if (cspNonce) {
        script.dataset.cspNonce = cspNonce;
        script.setAttribute("nonce", cspNonce);
      } else {
        delete script.dataset.cspNonce;
        script.removeAttribute("nonce");
      }
    }
    const widgetEl = document.querySelector(`${WIDGET_ELEMENT_NAME}[data-bot-id="${botId}"]`);
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
  }, [botId, theme, position, className, cspNonce]);
  if (typeof window === "undefined") {
    console.warn(
      "[AgentDesk] AgentDeskWidget was rendered on the server. If you are using Next.js App Router, please import from '@agentdeskbot/react/nextjs' instead to ensure proper SSR/App Router integration."
    );
    return null;
  }
  return null;
}

export { AgentDeskWidget };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
'use client';
import { useRef, useEffect } from 'react';
import { acquireInstance, postSetMode, WIDGET_ELEMENT_NAME, releaseInstance } from '@agentdeskbot/core';

var listenerBuckets = /* @__PURE__ */ new Map();
function dispatchOpen(botId) {
  var _a, _b;
  (_b = (_a = listenerBuckets.get(botId)) == null ? void 0 : _a.onOpen) == null ? void 0 : _b.call(_a);
}
function dispatchClose(botId) {
  var _a, _b;
  (_b = (_a = listenerBuckets.get(botId)) == null ? void 0 : _a.onClose) == null ? void 0 : _b.call(_a);
}
var globalListenerInstalled = false;
var globalListenerRef = null;
function installGlobalListener() {
  if (globalListenerInstalled) return;
  globalListenerInstalled = true;
  globalListenerRef = (event) => {
    if (!event.data || typeof event.data !== "object") return;
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (data.type !== "agentdesk-widget-open" && data.type !== "agentdesk-widget-close") return;
    if (typeof data.botId !== "string") return;
    if (data.type === "agentdesk-widget-open") dispatchOpen(data.botId);
    else dispatchClose(data.botId);
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
  onOpen,
  onClose
}) {
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    if (!botId) return;
    const acquire = acquireInstance(botId, mode);
    if (acquire.mustInstallListener) {
      installGlobalListener();
    }
    if (acquire.isFirstForBot) {
      if (!findExistingScript(botId)) {
        injectScript({ botId, mode, scriptSrc, configUrl, apiOrigin });
      }
    } else if (acquire.modeChanged) {
      postSetMode(botId, mode);
    }
    const bucket = { onOpen: onOpenRef.current, onClose: onCloseRef.current };
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
  }, [botId, mode, scriptSrc, configUrl, apiOrigin]);
  const isFirstModeRender = useRef(true);
  useEffect(() => {
    if (isFirstModeRender.current) {
      isFirstModeRender.current = false;
      return;
    }
    if (!botId) return;
    postSetMode(botId, mode);
  }, [mode, botId]);
  return null;
}

export { AgentDeskWidget };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
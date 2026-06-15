'use strict';

var react = require('react');

function AgentDeskWidget({
  botId,
  configUrl,
  mode = "launcher",
  scriptSrc = "/widget.js",
  apiOrigin,
  onOpen,
  onClose
}) {
  const onOpenRef = react.useRef(onOpen);
  const onCloseRef = react.useRef(onClose);
  react.useEffect(() => {
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  }, [onOpen, onClose]);
  react.useEffect(() => {
    if (!botId) return;
    const SCRIPT_TAG = "data-agentdesk-react";
    const existingScript = Array.from(
      document.querySelectorAll(`script[${SCRIPT_TAG}]`)
    ).find((candidate) => candidate.dataset.botId === botId);
    if (existingScript) return;
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.setAttribute(SCRIPT_TAG, "");
    script.dataset.botId = botId;
    script.dataset.mode = mode;
    if (configUrl) script.dataset.configUrl = configUrl;
    if (apiOrigin) script.dataset.apiOrigin = apiOrigin;
    let widgetEl = null;
    script.addEventListener("load", () => {
      window.setTimeout(() => {
        widgetEl = document.querySelector("agentdesk-widget");
      }, 20);
    });
    document.body.append(script);
    const handleMessage = (event) => {
      var _a, _b;
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== "object") return;
      const data = event.data;
      if (data.botId !== botId) return;
      if (data.type === "agentdesk-widget-open") (_a = onOpenRef.current) == null ? void 0 : _a.call(onOpenRef);
      if (data.type === "agentdesk-widget-close") (_b = onCloseRef.current) == null ? void 0 : _b.call(onCloseRef);
    };
    window.addEventListener("message", handleMessage);
    return () => {
      script.remove();
      if (widgetEl && widgetEl.isConnected) widgetEl.remove();
      window.removeEventListener("message", handleMessage);
    };
  }, [botId, configUrl, mode, scriptSrc, apiOrigin]);
  return null;
}

exports.AgentDeskWidget = AgentDeskWidget;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map
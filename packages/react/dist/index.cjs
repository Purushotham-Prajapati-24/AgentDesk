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
    const SCRIPT_TAG = "data-agentdesk";
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
    const loadTimeoutRef = { current: null };
    let widgetEl = null;
    script.addEventListener("load", () => {
      loadTimeoutRef.current = window.setTimeout(() => {
        widgetEl = document.querySelector("agentdesk-widget");
        loadTimeoutRef.current = null;
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
      if (loadTimeoutRef.current !== null) {
        window.clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
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
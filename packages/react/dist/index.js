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
    const dedupeAttr = `data-agentdesk-react-${CSS.escape(botId)}`;
    if (document.querySelector(`script[${dedupeAttr}]`)) return;
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.setAttribute(dedupeAttr, "");
    script.dataset.botId = botId;
    script.dataset.mode = mode;
    if (configUrl) script.dataset.configUrl = configUrl;
    if (apiOrigin) script.dataset.apiOrigin = apiOrigin;
    document.body.append(script);
    const handleMessage = (event) => {
      var _a, _b;
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.botId !== botId) return;
      if (event.data.type === "agentdesk-widget-open") (_a = onOpenRef.current) == null ? void 0 : _a.call(onOpenRef);
      if (event.data.type === "agentdesk-widget-close") (_b = onCloseRef.current) == null ? void 0 : _b.call(onCloseRef);
    };
    window.addEventListener("message", handleMessage);
    return () => {
      script.remove();
      document.querySelectorAll("agentdesk-widget").forEach((el) => el.remove());
      window.removeEventListener("message", handleMessage);
    };
  }, [botId, configUrl, mode, scriptSrc, apiOrigin]);
  return null;
}

exports.AgentDeskWidget = AgentDeskWidget;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
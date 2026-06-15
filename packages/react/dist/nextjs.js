'use strict';

var react = require('react');
var jsxRuntime = require('react/jsx-runtime');

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/index.tsx
var src_exports = {};
__export(src_exports, {
  AgentDeskWidget: () => AgentDeskWidget
});
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
var init_src = __esm({
  "src/index.tsx"() {
    "use client";
  }
});
var LazyWidget = react.lazy(
  () => Promise.resolve().then(() => (init_src(), src_exports)).then((mod) => ({ default: mod.AgentDeskWidget }))
);
function AgentDeskWidget2(props) {
  return /* @__PURE__ */ jsxRuntime.jsx(react.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntime.jsx(LazyWidget, { ...props }) });
}

exports.AgentDeskWidget = AgentDeskWidget2;
//# sourceMappingURL=nextjs.js.map
//# sourceMappingURL=nextjs.js.map
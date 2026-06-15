'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var react = require('react');
var dynamic = require('next/dynamic');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var dynamic__default = /*#__PURE__*/_interopDefault(dynamic);

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
var init_src = __esm({
  "src/index.tsx"() {
    "use client";
  }
});
var AgentDeskWidget2 = dynamic__default.default(
  () => Promise.resolve().then(() => (init_src(), src_exports)).then((mod) => ({ default: mod.AgentDeskWidget })),
  { ssr: false }
);
var nextjs_default = AgentDeskWidget2;

exports.AgentDeskWidget = AgentDeskWidget2;
exports.default = nextjs_default;
//# sourceMappingURL=nextjs.cjs.map
//# sourceMappingURL=nextjs.cjs.map
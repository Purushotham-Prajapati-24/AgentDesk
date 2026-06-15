'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

// src/index.ts
var AgentDeskWidget = vue.defineComponent({
  name: "AgentDeskWidget",
  props: {
    botId: {
      type: String,
      required: true
    },
    configUrl: {
      type: String,
      default: ""
    },
    mode: {
      type: String,
      default: "launcher"
    },
    scriptSrc: {
      type: String,
      default: "/widget.js"
    },
    apiOrigin: {
      type: String,
      default: ""
    }
  },
  emits: ["open", "close"],
  setup(props, { emit }) {
    const scriptRef = vue.ref(null);
    vue.onMounted(() => {
      var _a, _b;
      if (!props.botId) return;
      const dedupeAttr = `data-agentdesk-vue-${CSS.escape(props.botId)}`;
      if (document.querySelector(`script[${dedupeAttr}]`)) return;
      const script = document.createElement("script");
      script.src = (_a = props.scriptSrc) != null ? _a : "/widget.js";
      script.async = true;
      script.setAttribute(dedupeAttr, "");
      script.dataset.botId = props.botId;
      script.dataset.mode = (_b = props.mode) != null ? _b : "launcher";
      if (props.configUrl) script.dataset.configUrl = props.configUrl;
      if (props.apiOrigin) script.dataset.apiOrigin = props.apiOrigin;
      document.body.append(script);
      scriptRef.value = script;
      const handleMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        if (!event.data || event.data.botId !== props.botId) return;
        if (event.data.type === "agentdesk-widget-open") emit("open");
        if (event.data.type === "agentdesk-widget-close") emit("close");
      };
      window.addEventListener("message", handleMessage);
      script._adCleanup = () => {
        window.removeEventListener("message", handleMessage);
      };
    });
    vue.onBeforeUnmount(() => {
      var _a;
      const script = scriptRef.value;
      (_a = script == null ? void 0 : script._adCleanup) == null ? void 0 : _a.call(script);
      script == null ? void 0 : script.remove();
      document.querySelectorAll("agentdesk-widget").forEach((el) => el.remove());
    });
    return () => vue.h("span", {
      "data-agentdesk-vue-host": props.botId,
      style: "display:none",
      "aria-hidden": "true"
    });
  }
});
var AgentDeskPlugin = {
  install(app, options = {}) {
    if (options.globalComponent !== false) {
      app.component("AgentDeskWidget", AgentDeskWidget);
    }
  }
};
var src_default = AgentDeskPlugin;

exports.AgentDeskPlugin = AgentDeskPlugin;
exports.AgentDeskWidget = AgentDeskWidget;
exports.default = src_default;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map
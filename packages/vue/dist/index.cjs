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
    const widgetRef = vue.ref(null);
    let cleanup = null;
    vue.onMounted(() => {
      var _a, _b;
      if (!props.botId) return;
      const SCRIPT_TAG = "data-agentdesk-vue";
      const existingScript = Array.from(
        document.querySelectorAll(`script[${SCRIPT_TAG}]`)
      ).find((candidate) => candidate.dataset.botId === props.botId);
      if (existingScript) return;
      const script = document.createElement("script");
      script.src = (_a = props.scriptSrc) != null ? _a : "/widget.js";
      script.async = true;
      script.setAttribute(SCRIPT_TAG, "");
      script.dataset.botId = props.botId;
      script.dataset.mode = (_b = props.mode) != null ? _b : "launcher";
      if (props.configUrl) script.dataset.configUrl = props.configUrl;
      if (props.apiOrigin) script.dataset.apiOrigin = props.apiOrigin;
      script.addEventListener("load", () => {
        window.setTimeout(() => {
          widgetRef.value = document.querySelector("agentdesk-widget");
        }, 20);
      });
      document.body.append(script);
      scriptRef.value = script;
      const handleMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        if (!event.data || typeof event.data !== "object") return;
        const data = event.data;
        if (data.botId !== props.botId) return;
        if (data.type === "agentdesk-widget-open") emit("open");
        if (data.type === "agentdesk-widget-close") emit("close");
      };
      window.addEventListener("message", handleMessage);
      cleanup = () => {
        window.removeEventListener("message", handleMessage);
      };
    });
    vue.onBeforeUnmount(() => {
      var _a;
      cleanup == null ? void 0 : cleanup();
      cleanup = null;
      (_a = scriptRef.value) == null ? void 0 : _a.remove();
      scriptRef.value = null;
      if (widgetRef.value && widgetRef.value.isConnected) {
        widgetRef.value.remove();
      }
      widgetRef.value = null;
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
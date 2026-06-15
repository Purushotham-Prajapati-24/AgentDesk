import { defineComponent, ref, onMounted, onBeforeUnmount, h } from 'vue';

// src/index.ts
var AgentDeskWidget = defineComponent({
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
      default: "launcher",
      validator: (v) => ["launcher", "inline"].includes(v)
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
    const scriptRef = ref(null);
    const widgetRef = ref(null);
    const loadTimeoutRef = ref(null);
    let cleanup = null;
    onMounted(() => {
      var _a, _b;
      if (!props.botId) return;
      const SCRIPT_TAG = "data-agentdesk";
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
        loadTimeoutRef.value = window.setTimeout(() => {
          widgetRef.value = document.querySelector("agentdesk-widget");
          loadTimeoutRef.value = null;
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
    onBeforeUnmount(() => {
      var _a;
      cleanup == null ? void 0 : cleanup();
      cleanup = null;
      if (loadTimeoutRef.value !== null) {
        window.clearTimeout(loadTimeoutRef.value);
        loadTimeoutRef.value = null;
      }
      (_a = scriptRef.value) == null ? void 0 : _a.remove();
      scriptRef.value = null;
      if (widgetRef.value && widgetRef.value.isConnected) {
        widgetRef.value.remove();
      }
      widgetRef.value = null;
    });
    return () => h("span", {
      "data-agentdesk-vue-host": props.botId,
      style: "display:none",
      "aria-hidden": "true"
    });
  }
});
var AgentDeskPlugin = {
  install(app, options = { globalComponent: true }) {
    if (options.globalComponent !== false) {
      app.component("AgentDeskWidget", AgentDeskWidget);
    }
  }
};
var src_default = AgentDeskPlugin;

export { AgentDeskPlugin, AgentDeskWidget, src_default as default };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
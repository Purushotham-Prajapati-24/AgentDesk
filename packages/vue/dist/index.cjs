'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@agentdesk/core');

// src/index.ts
var listenerBuckets = /* @__PURE__ */ new Map();
function dispatchOpen(botId) {
  var _a;
  (_a = listenerBuckets.get(botId)) == null ? void 0 : _a.forEach((emit) => emit("open"));
}
function dispatchClose(botId) {
  var _a;
  (_a = listenerBuckets.get(botId)) == null ? void 0 : _a.forEach((emit) => emit("close"));
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
  document.querySelectorAll(`${core.WIDGET_ELEMENT_NAME}[data-bot-id="${botId}"]`).forEach((el) => el.remove());
}
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
    let hasSlot = false;
    let cachedEmit = null;
    const install = () => {
      var _a, _b, _c;
      if (!props.botId) return;
      const acquire = core.acquireInstance(props.botId, (_a = props.mode) != null ? _a : "launcher");
      if (acquire.mustInstallListener) {
        installGlobalListener();
      }
      if (acquire.isFirstForBot) {
        if (!findExistingScript(props.botId)) {
          injectScript({
            botId: props.botId,
            mode: (_b = props.mode) != null ? _b : "launcher",
            scriptSrc: props.scriptSrc || "/widget.js",
            configUrl: props.configUrl || void 0,
            apiOrigin: props.apiOrigin || void 0
          });
        }
      } else if (acquire.modeChanged) {
        core.postSetMode(props.botId, (_c = props.mode) != null ? _c : "launcher");
      }
      hasSlot = true;
      cachedEmit = (type) => emit(type);
      if (!listenerBuckets.has(props.botId)) {
        listenerBuckets.set(props.botId, /* @__PURE__ */ new Set());
      }
      listenerBuckets.get(props.botId).add(cachedEmit);
      if (typeof customElements !== "undefined") {
        void customElements.whenDefined(core.WIDGET_ELEMENT_NAME).catch(() => {
        });
      }
    };
    const release = () => {
      if (!hasSlot || !props.botId) return;
      const bucket = listenerBuckets.get(props.botId);
      if (cachedEmit) bucket == null ? void 0 : bucket.delete(cachedEmit);
      if (bucket && bucket.size === 0) {
        listenerBuckets.delete(props.botId);
      }
      cachedEmit = null;
      const result = core.releaseInstance(props.botId);
      hasSlot = false;
      if (result.isLastForBot) {
        removeScriptAndWidget(props.botId);
      }
      if (result.mustRemoveListener) {
        uninstallGlobalListener();
      }
    };
    vue.onMounted(() => {
      install();
    });
    vue.onBeforeUnmount(() => {
      release();
    });
    vue.onDeactivated(() => {
      release();
    });
    vue.onActivated(() => {
      install();
    });
    vue.watch(
      () => props.mode,
      (next, prev) => {
        if (next === prev) return;
        if (!hasSlot) return;
        if (!props.botId) return;
        core.postSetMode(props.botId, next != null ? next : "launcher");
      }
    );
    return () => vue.h("span", {
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

exports.AgentDeskPlugin = AgentDeskPlugin;
exports.AgentDeskWidget = AgentDeskWidget;
exports.default = src_default;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map
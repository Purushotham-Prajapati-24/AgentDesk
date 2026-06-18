'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@agentdeskbot/core');

// src/index.ts
var listenerBuckets = /* @__PURE__ */ new Map();
function dispatchEvent(botId, eventName, payload) {
  var _a;
  (_a = listenerBuckets.get(botId)) == null ? void 0 : _a.forEach((entry) => entry.emit(eventName, payload));
}
var globalListenerInstalled = false;
var globalListenerRef = null;
function installGlobalListener() {
  if (globalListenerInstalled) return;
  globalListenerInstalled = true;
  globalListenerRef = (event) => {
    if (!event.data || typeof event.data !== "object") return;
    const data = event.data;
    if (typeof data.botId !== "string") return;
    const bucket = listenerBuckets.get(data.botId);
    if (!bucket) return;
    let originAllowed = false;
    for (const entry of bucket) {
      const allowedOrigins = /* @__PURE__ */ new Set([window.location.origin]);
      if (entry.apiOrigin) {
        try {
          allowedOrigins.add(new URL(entry.apiOrigin).origin);
        } catch {
        }
      }
      if (entry.scriptSrc) {
        try {
          allowedOrigins.add(new URL(entry.scriptSrc, window.location.origin).origin);
        } catch {
        }
      }
      if (allowedOrigins.has(event.origin)) {
        originAllowed = true;
        break;
      }
    }
    if (!originAllowed) return;
    switch (data.type) {
      case "agentdesk-widget-open":
        dispatchEvent(data.botId, "open");
        break;
      case "agentdesk-widget-close":
        dispatchEvent(data.botId, "close");
        break;
      case "agentdesk-widget-ready":
        dispatchEvent(data.botId, "ready");
        break;
      case "agentdesk-widget-error":
        dispatchEvent(data.botId, "error", { message: data.message || "Unknown error" });
        break;
      case "agentdesk-widget-message-sent":
        dispatchEvent(data.botId, "message-sent", { text: data.text || "" });
        break;
      case "agentdesk-widget-injected":
        dispatchEvent(data.botId, "injected");
        break;
    }
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
  if (options.theme) script.dataset.theme = options.theme;
  if (options.cspNonce) {
    script.dataset.cspNonce = options.cspNonce;
    script.setAttribute("nonce", options.cspNonce);
  }
  if (options.position) script.dataset.position = options.position;
  if (options.className) script.dataset.className = options.className;
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
      default: "https://agentdeskbot.vercel.app/widget.js"
    },
    apiOrigin: {
      type: String,
      default: "https://agentdeskbot.vercel.app"
    },
    theme: {
      type: String,
      default: ""
    },
    cspNonce: {
      type: String,
      default: ""
    },
    position: {
      type: String,
      default: "bottom-right",
      validator: (v) => ["bottom-right", "bottom-left", "top-right", "top-left"].includes(v)
    },
    className: {
      type: String,
      default: ""
    }
  },
  emits: ["open", "close", "ready", "error", "message-sent", "injected"],
  setup(props, { emit }) {
    if (typeof window === "undefined") {
      console.warn(
        "[AgentDesk] AgentDeskWidget was initialized in a non-browser environment. Ensure it is only rendered on the client side."
      );
      return () => null;
    }
    let hasSlot = false;
    let entry = null;
    const install = () => {
      var _a, _b, _c;
      if (!props.botId) return;
      if (hasSlot) {
        release();
      }
      const acquire = core.acquireInstance(props.botId, (_a = props.mode) != null ? _a : "launcher");
      if (acquire.mustInstallListener) {
        installGlobalListener();
      }
      if (acquire.isFirstForBot) {
        if (!findExistingScript(props.botId)) {
          injectScript({
            botId: props.botId,
            mode: (_b = props.mode) != null ? _b : "launcher",
            scriptSrc: props.scriptSrc,
            configUrl: props.configUrl || void 0,
            apiOrigin: props.apiOrigin || void 0,
            theme: props.theme || void 0,
            cspNonce: props.cspNonce || void 0,
            position: props.position || void 0,
            className: props.className || void 0
          });
        }
      } else if (acquire.modeChanged) {
        core.postSetMode(props.botId, (_c = props.mode) != null ? _c : "launcher");
      }
      hasSlot = true;
      entry = {
        apiOrigin: props.apiOrigin || void 0,
        scriptSrc: props.scriptSrc || void 0,
        emit: (type, payload) => {
          if (payload !== void 0) {
            emit(type, payload);
          } else {
            emit(type);
          }
        }
      };
      if (!listenerBuckets.has(props.botId)) {
        listenerBuckets.set(props.botId, /* @__PURE__ */ new Set());
      }
      listenerBuckets.get(props.botId).add(entry);
      if (typeof customElements !== "undefined") {
        void customElements.whenDefined(core.WIDGET_ELEMENT_NAME).catch(() => {
        });
      }
    };
    const release = (targetBotId = props.botId) => {
      if (!hasSlot || !targetBotId) return;
      const bucket = listenerBuckets.get(targetBotId);
      if (entry) bucket == null ? void 0 : bucket.delete(entry);
      if (bucket && bucket.size === 0) {
        listenerBuckets.delete(targetBotId);
      }
      entry = null;
      const result = core.releaseInstance(targetBotId);
      hasSlot = false;
      if (result.isLastForBot) {
        removeScriptAndWidget(targetBotId);
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
    vue.watch(
      () => props.botId,
      (next, prev) => {
        if (next === prev) return;
        release(prev);
        install();
      }
    );
    vue.watch(
      [() => props.apiOrigin, () => props.scriptSrc],
      ([apiOrigin, scriptSrc]) => {
        if (entry) {
          entry.apiOrigin = apiOrigin || void 0;
          entry.scriptSrc = scriptSrc || void 0;
        }
      }
    );
    vue.watch(
      [
        () => props.position,
        () => props.className
      ],
      ([position, className]) => {
        if (!hasSlot || !props.botId) return;
        const script = findExistingScript(props.botId);
        if (script) {
          if (position) script.dataset.position = position;
          else delete script.dataset.position;
          if (className) script.dataset.className = className;
          else delete script.dataset.className;
        }
        const widgetEl = document.querySelector(`${core.WIDGET_ELEMENT_NAME}[data-bot-id="${props.botId}"]`);
        if (widgetEl) {
          if (className) {
            widgetEl.className = className;
          } else {
            widgetEl.removeAttribute("class");
          }
          if (position) {
            widgetEl.setAttribute("data-agentdesk-position", position);
          } else {
            widgetEl.removeAttribute("data-agentdesk-position");
          }
        }
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
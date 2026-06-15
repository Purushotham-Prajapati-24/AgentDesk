import {
  defineComponent,
  h,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  watch,
  type App,
  type PropType,
} from 'vue';

import {
  WIDGET_ELEMENT_NAME,
  acquireInstance,
  releaseInstance,
  postSetMode,
  type WidgetMode,
  type WidgetMessageEventData,
} from '@agentdesk/core';

// ─── Public types ─────────────────────────────────────────────────────────────

export type { WidgetMode } from '@agentdesk/core';

export interface AgentDeskWidgetProps {
  /** The Bot ID from your AgentDesk dashboard. Required. */
  botId: string;
  /** Override the config fetch URL. */
  configUrl?: string;
  /** 'launcher' = floating bubble (default). 'inline' = fills container.
   *  **Dynamic updates are supported** — the SDK posts an
   *  `agentdesk-set-mode` message when this prop changes. */
  mode?: WidgetMode;
  /** URL to widget.js. Defaults to '/widget.js'. */
  scriptSrc?: string;
  /** Base URL of your AgentDesk backend (for cross-origin embeds). */
  apiOrigin?: string;
}

// ─── Shared global message listener ──────────────────────────────────────────
//
// See packages/react/src/index.tsx for the full design notes. We keep a
// single `window.message` listener for the lifetime of the page that
// dispatches `agentdesk-widget-open` / `agentdesk-widget-close` events to
// the matching component's emit. The listener is installed on the first
// SDK mount (any botId) and uninstalled on the last SDK unmount (any
// botId) — both gated by ref counts in `@agentdesk/core`.

type ListenerBucket = {
  emit: ((type: 'open' | 'close') => void) | null;
};

const listenerBuckets = new Map<string, ListenerBucket>();

function dispatchOpen(botId: string) {
  listenerBuckets.get(botId)?.emit?.('open');
}

function dispatchClose(botId: string) {
  listenerBuckets.get(botId)?.emit?.('close');
}

let globalListenerInstalled = false;
let globalListenerRef: ((event: MessageEvent) => void) | null = null;

function installGlobalListener() {
  if (globalListenerInstalled) return;
  globalListenerInstalled = true;
  globalListenerRef = (event: MessageEvent) => {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.origin !== window.location.origin) return;
    const data = event.data as Partial<WidgetMessageEventData>;
    if (data.type !== 'agentdesk-widget-open' && data.type !== 'agentdesk-widget-close') return;
    if (typeof data.botId !== 'string') return;
    if (data.type === 'agentdesk-widget-open') dispatchOpen(data.botId);
    else dispatchClose(data.botId);
  };
  window.addEventListener('message', globalListenerRef);
}

function uninstallGlobalListener() {
  if (!globalListenerInstalled) return;
  globalListenerInstalled = false;
  if (globalListenerRef) {
    window.removeEventListener('message', globalListenerRef);
    globalListenerRef = null;
  }
}

// ─── Script injection helpers ────────────────────────────────────────────────

const SCRIPT_TAG = 'data-agentdesk';

function findExistingScript(botId: string): HTMLScriptElement | null {
  return (
    Array.from(
      document.querySelectorAll<HTMLScriptElement>(`script[${SCRIPT_TAG}]`),
    ).find((candidate) => candidate.dataset.botId === botId) ?? null
  );
}

function injectScript(options: {
  botId: string;
  mode: WidgetMode;
  scriptSrc: string;
  configUrl?: string;
  apiOrigin?: string;
}): void {
  const script = document.createElement('script');
  script.src = options.scriptSrc;
  script.async = true;
  script.setAttribute(SCRIPT_TAG, '');
  script.dataset.botId = options.botId;
  script.dataset.mode = options.mode;
  if (options.configUrl) script.dataset.configUrl = options.configUrl;
  if (options.apiOrigin) script.dataset.apiOrigin = options.apiOrigin;
  document.body.append(script);
}

function removeScriptAndWidget(botId: string): void {
  findExistingScript(botId)?.remove();
  document
    .querySelectorAll<HTMLElement>(WIDGET_ELEMENT_NAME)
    .forEach((el) => el.remove());
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * AgentDeskWidget — Vue 3 component that embeds the AgentDesk AI chat widget.
 *
 * @example
 * ```vue
 * <script setup>
 * import { AgentDeskWidget } from '@agentdesk/vue';
 * </script>
 *
 * <template>
 *   <AgentDeskWidget bot-id="your-bot-id" />
 * </template>
 * ```
 */
export const AgentDeskWidget = defineComponent({
  name: 'AgentDeskWidget',

  props: {
    botId: {
      type: String as PropType<string>,
      required: true,
    },
    configUrl: {
      type: String as PropType<string>,
      default: '',
    },
    mode: {
      type: String as PropType<WidgetMode>,
      default: 'launcher' as WidgetMode,
      validator: (v: string) => ['launcher', 'inline'].includes(v),
    },
    scriptSrc: {
      type: String as PropType<string>,
      default: '/widget.js',
    },
    apiOrigin: {
      type: String as PropType<string>,
      default: '',
    },
  },

  emits: ['open', 'close'],

  setup(props, { emit }) {
    // Tracks whether this instance is currently holding a slot in the
    // global registry. We toggle this in onMounted / onBeforeUnmount and
    // also clear it in onDeactivated (for `<keep-alive>`) so the slot is
    // released while the cached component is hidden, then re-acquired
    // when the cached component is re-activated.
    let hasSlot = false;
    let cachedEmit: ((type: 'open' | 'close') => void) | null = null;

    const install = () => {
      if (!props.botId) return;
      const acquire = acquireInstance(props.botId, props.mode ?? 'launcher');
      if (acquire.mustInstallListener) {
        installGlobalListener();
      }
      if (acquire.isFirstForBot) {
        if (!findExistingScript(props.botId)) {
          injectScript({
            botId: props.botId,
            mode: props.mode ?? 'launcher',
            scriptSrc: props.scriptSrc || '/widget.js',
            configUrl: props.configUrl || undefined,
            apiOrigin: props.apiOrigin || undefined,
          });
        }
      } else if (acquire.modeChanged) {
        postSetMode(props.botId, props.mode ?? 'launcher');
      }
      hasSlot = true;

      // Register the emit bridge so the shared listener can forward
      // events to *this* component instance. We use a closure on `emit`
      // because the emit function is not stable across re-renders.
      cachedEmit = (type: 'open' | 'close') => emit(type);
      listenerBuckets.set(props.botId, { emit: cachedEmit });

      // Resolve the custom element so callers can immediately query
      // `document.querySelector('agentdesk-widget')` and get a real
      // (upgraded) element. We do not poll with setTimeout.
      if (typeof customElements !== 'undefined') {
        void customElements.whenDefined(WIDGET_ELEMENT_NAME).catch(() => {
          // ignore — the element may never be defined if the script fails
        });
      }
    };

    const release = () => {
      if (!hasSlot || !props.botId) return;
      listenerBuckets.delete(props.botId);
      cachedEmit = null;
      const result = releaseInstance(props.botId);
      hasSlot = false;
      if (result.isLastForBot) {
        removeScriptAndWidget(props.botId);
      }
      if (result.mustRemoveListener) {
        uninstallGlobalListener();
      }
    };

    onMounted(() => {
      install();
    });

    onBeforeUnmount(() => {
      release();
    });

    // ─── <keep-alive> support ────────────────────────────────────────────
    //
    // Vue's `<keep-alive>` caches a component when it is hidden and
    // re-activates it later. While cached, the original DOM (and our
    // injected <script>) is still alive, so we don't *need* to release
    // and re-acquire the registry slot. However, a cached component is
    // not visible to the user, and downstream listeners (e.g. an
    // analytics tracker wired to onOpen/onClose) will still receive
    // events as long as our shared listener is installed. To avoid
    // ghost events, we:
    //   • on `onDeactivated` — release the registry slot (and the script
    //     if this was the last instance for the botId) and detach the
    //     per-bot listener bucket.
    //   • on `onActivated`   — re-acquire the slot and re-attach the
    //     listener bucket. We also re-inject the script if it was torn
    //     down during the deactivation phase.

    onDeactivated(() => {
      release();
    });

    onActivated(() => {
      install();
    });

    // ─── Dynamic mode propagation ───────────────────────────────────────
    //
    // Vue's `watch` defaults to `{ deep: false, immediate: false }` which
    // is what we want — we only fire when `mode` actually changes after
    // the first render. We guard against firing before mount by checking
    // `hasSlot` (the first render is handled by the mount lifecycle).
    watch(
      () => props.mode,
      (next, prev) => {
        if (next === prev) return;
        if (!hasSlot) return;
        if (!props.botId) return;
        postSetMode(props.botId, next ?? 'launcher');
      },
    );

    // Render a hidden host element so Vue can track the component in the tree
    return () =>
      h('span', {
        'data-agentdesk-vue-host': props.botId,
        style: 'display:none',
        'aria-hidden': 'true',
      });
  },
});

// ─── Vue Plugin ───────────────────────────────────────────────────────────────

export interface AgentDeskPluginOptions {
  /**
   * When true (default), registers `<AgentDeskWidget>` globally on the app.
   * Set to false if you prefer to import it manually in each component.
   */
  globalComponent?: boolean;
}

/**
 * AgentDeskPlugin — install the widget as a global Vue component.
 *
 * @example
 * ```ts
 * // main.ts
 * import { createApp } from 'vue';
 * import { AgentDeskPlugin } from '@agentdesk/vue';
 * import App from './App.vue';
 *
 * createApp(App)
 *   .use(AgentDeskPlugin)
 *   .mount('#app');
 * ```
 *
 * After installing, you can use `<AgentDeskWidget>` anywhere without importing:
 * ```vue
 * <template>
 *   <AgentDeskWidget bot-id="your-bot-id" />
 * </template>
 * ```
 */
export const AgentDeskPlugin = {
  install(app: App, options: AgentDeskPluginOptions = { globalComponent: true }) {
    // Truthiness check is intentionally explicit: we want to register
    // the global component whenever the caller has NOT explicitly opted
    // out with `{ globalComponent: false }`. We do NOT treat `undefined`
    // (option omitted) as `false` — that would silently regress the
    // documented default of `true`. A literal `false` is the only way to
    // skip global registration.
    if (options.globalComponent !== false) {
      app.component('AgentDeskWidget', AgentDeskWidget);
    }
  },
};

export default AgentDeskPlugin;

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
} from '@agentdeskbot/core';

// ─── Public types ─────────────────────────────────────────────────────────────

export type { WidgetMode } from '@agentdeskbot/core';

export interface AgentDeskWidgetProps {
  /** The Bot ID from your AgentDesk dashboard. Required. */
  botId: string;
  /** Override the config fetch URL. */
  configUrl?: string;
  /** 'launcher' = floating bubble (default). 'inline' = fills container.
   *  **Dynamic updates are supported** — the SDK posts an
   *  `agentdesk-set-mode` message when this prop changes. */
  mode?: WidgetMode;
  /** URL to widget.js. Defaults to 'https://agentdeskbot.vercel.app/widget.js'. */
  scriptSrc?: string;
  /** Base URL of your AgentDesk backend (for cross-origin embeds). */
  apiOrigin?: string;
  /** Optional theme name for the widget (e.g. 'webchat-v1'). */
  theme?: string;
  /** Optional Content Security Policy (CSP) nonce to apply to the injected script and dynamically created styles. */
  cspNonce?: string;
  /** Optional fixed positioning override. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Optional custom HTML class name to apply to the host container. */
  className?: string;
}

// ─── Shared global message listener ──────────────────────────────────────────

type ListenerBucket = Set<(type: string, payload?: unknown) => void>;

const listenerBuckets = new Map<string, ListenerBucket>();

function dispatchEvent(botId: string, eventName: string, payload?: unknown) {
  listenerBuckets.get(botId)?.forEach((emit) => emit(eventName, payload));
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
    if (typeof data.botId !== 'string') return;

    switch (data.type) {
      case 'agentdesk-widget-open':
        dispatchEvent(data.botId, 'open');
        break;
      case 'agentdesk-widget-close':
        dispatchEvent(data.botId, 'close');
        break;
      case 'agentdesk-widget-ready':
        dispatchEvent(data.botId, 'ready');
        break;
      case 'agentdesk-widget-error':
        dispatchEvent(data.botId, 'error', { message: (data as { message?: string }).message || 'Unknown error' });
        break;
      case 'agentdesk-widget-message-sent':
        dispatchEvent(data.botId, 'message-sent', { text: (data as { text?: string }).text || '' });
        break;
      case 'agentdesk-widget-injected':
        dispatchEvent(data.botId, 'injected');
        break;
    }
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
  theme?: string;
  cspNonce?: string;
  position?: string;
  className?: string;
}): void {
  const script = document.createElement('script');
  script.src = options.scriptSrc;
  script.async = true;
  script.setAttribute(SCRIPT_TAG, '');
  script.dataset.botId = options.botId;
  script.dataset.mode = options.mode;
  if (options.configUrl) script.dataset.configUrl = options.configUrl;
  if (options.apiOrigin) script.dataset.apiOrigin = options.apiOrigin;
  if (options.theme) script.dataset.theme = options.theme;
  if (options.cspNonce) {
    script.dataset.cspNonce = options.cspNonce;
    script.setAttribute('nonce', options.cspNonce);
  }
  if (options.position) script.dataset.position = options.position;
  if (options.className) script.dataset.className = options.className;
  document.body.append(script);
}

function removeScriptAndWidget(botId: string): void {
  findExistingScript(botId)?.remove();
  document
    .querySelectorAll<HTMLElement>(`${WIDGET_ELEMENT_NAME}[data-bot-id="${botId}"]`)
    .forEach((el) => el.remove());
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * AgentDeskWidget — Vue 3 component that embeds the AgentDesk AI chat widget.
 *
 * @example
 * ```vue
 * <script setup>
 * import { AgentDeskWidget } from '@agentdeskbot/vue';
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
      default: 'https://agentdeskbot.vercel.app/widget.js',
    },
    apiOrigin: {
      type: String as PropType<string>,
      default: 'https://agentdeskbot.vercel.app',
    },
    theme: {
      type: String as PropType<string>,
      default: '',
    },
    cspNonce: {
      type: String as PropType<string>,
      default: '',
    },
    position: {
      type: String as PropType<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>,
      default: 'bottom-right',
      validator: (v: string) => ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(v),
    },
    className: {
      type: String as PropType<string>,
      default: '',
    },
  },

  emits: ['open', 'close', 'ready', 'error', 'message-sent', 'injected'],

  setup(props, { emit }) {
    if (typeof window === 'undefined') {
      console.warn(
        "[AgentDesk] AgentDeskWidget was initialized in a non-browser environment. " +
        "Ensure it is only rendered on the client side."
      );
      return () => null;
    }

    let hasSlot = false;
    let cachedEmit: ((type: string, payload?: unknown) => void) | null = null;

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
            scriptSrc: props.scriptSrc || 'https://agentdeskbot.vercel.app/widget.js',
            configUrl: props.configUrl || undefined,
            apiOrigin: props.apiOrigin || undefined,
            theme: props.theme || undefined,
            cspNonce: props.cspNonce || undefined,
            position: props.position || undefined,
            className: props.className || undefined,
          });
        }
      } else if (acquire.modeChanged) {
        postSetMode(props.botId, props.mode ?? 'launcher');
      }
      hasSlot = true;

      cachedEmit = (type: string, payload?: unknown) => {
        const emitType = type as 'open' | 'close' | 'ready' | 'error' | 'message-sent' | 'injected';
        if (payload !== undefined) {
          emit(emitType, payload);
        } else {
          emit(emitType);
        }
      };
      if (!listenerBuckets.has(props.botId)) {
        listenerBuckets.set(props.botId, new Set());
      }
      listenerBuckets.get(props.botId)!.add(cachedEmit);

      if (typeof customElements !== 'undefined') {
        void customElements.whenDefined(WIDGET_ELEMENT_NAME).catch(() => {
          // ignore
        });
      }
    };

    const release = () => {
      if (!hasSlot || !props.botId) return;
      const bucket = listenerBuckets.get(props.botId);
      if (cachedEmit) bucket?.delete(cachedEmit);
      if (bucket && bucket.size === 0) {
        listenerBuckets.delete(props.botId);
      }
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

    onDeactivated(() => {
      release();
    });

    onActivated(() => {
      install();
    });

    watch(
      () => props.mode,
      (next, prev) => {
        if (next === prev) return;
        if (!hasSlot) return;
        if (!props.botId) return;
        postSetMode(props.botId, next ?? 'launcher');
      },
    );

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

export const AgentDeskPlugin = {
  install(app: App, options: AgentDeskPluginOptions = { globalComponent: true }) {
    if (options.globalComponent !== false) {
      app.component('AgentDeskWidget', AgentDeskWidget);
    }
  },
};

export default AgentDeskPlugin;

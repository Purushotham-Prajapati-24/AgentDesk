import {
  defineComponent,
  h,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  watch,
  type App,
  type Plugin,
  type PropType,
} from 'vue';

import {
  WIDGET_ELEMENT_NAME,
  acquireInstance,
  releaseInstance,
  postSetMode,
  DEFAULT_SAAS_ORIGIN,
  type WidgetMode,
  type WidgetMessageEventData,
} from '@agentdeskbot/core';

// === Public types ===

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
  /** Base URL of your AgentDesk backend. Defaults to 'https://agentdeskbot.vercel.app'. */
  apiOrigin?: string;
  /** Optional theme name for the widget (e.g. 'webchat-v1'). Note: This prop only takes effect on initial mount. */
  theme?: string;
  /** Optional Content Security Policy (CSP) nonce to apply to the injected script and dynamically created styles. Note: This prop only takes effect on initial mount. */
  cspNonce?: string;
  /** Optional fixed positioning override. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Optional custom HTML class name to apply to the host container. */
  className?: string;
}

// === Shared global message listener ===

type EmitName = 'open' | 'close' | 'ready' | 'error' | 'message-sent' | 'injected';

interface ListenerEntry {
  apiOrigin?: string;
  scriptSrc?: string;
  emit: (type: EmitName, payload?: unknown) => void;
}

type ListenerBucket = Set<ListenerEntry>;

const listenerBuckets = new Map<string, ListenerBucket>();

function dispatchEvent(botId: string, eventName: EmitName, payload?: unknown) {
  listenerBuckets.get(botId)?.forEach((entry) => entry.emit(eventName, payload));
}

let globalListenerInstalled = false;
let globalListenerRef: ((event: MessageEvent) => void) | null = null;

function installGlobalListener() {
  if (globalListenerInstalled) return;
  globalListenerInstalled = true;
  globalListenerRef = (event: MessageEvent) => {
    if (!event.data || typeof event.data !== 'object') return;
    const data = event.data as Partial<WidgetMessageEventData>;
    if (typeof data.botId !== 'string') return;
    const bucket = listenerBuckets.get(data.botId);
    if (!bucket) return;

    const allowedOrigins = new Set([window.location.origin]);
    let originAllowed = allowedOrigins.has(event.origin);
    for (const entry of bucket) {
      if (!originAllowed) {
        if (entry.apiOrigin) {
          try {
            allowedOrigins.add(new URL(entry.apiOrigin).origin);
          } catch {
            // ignore
          }
        }
        if (entry.scriptSrc) {
          try {
            allowedOrigins.add(new URL(entry.scriptSrc, window.location.origin).origin);
          } catch {
            // ignore
          }
        }
        if (allowedOrigins.has(event.origin)) {
          originAllowed = true;
        }
      }
    }
    if (!originAllowed) return;

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

// === Script injection helpers ===

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

// === Component ===

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
let defaultSaaSOriginWarned = false;

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
      default: `${DEFAULT_SAAS_ORIGIN}/widget.js`,
    },
    apiOrigin: {
      type: String as PropType<string>,
      default: DEFAULT_SAAS_ORIGIN,
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
      return () => null;
    }

    let hasSlot = false;
    let entry: ListenerEntry | null = null;
    let activeBotId: string | null = null;

    const install = () => {
      if (!props.botId) return;

      if (!defaultSaaSOriginWarned && (props.apiOrigin === DEFAULT_SAAS_ORIGIN || props.scriptSrc === `${DEFAULT_SAAS_ORIGIN}/widget.js`)) {
        defaultSaaSOriginWarned = true;
        console.warn(
          `[AgentDesk] Using default hosted endpoints (${DEFAULT_SAAS_ORIGIN}). ` +
          "For custom backend configurations, please specify the apiOrigin and scriptSrc props explicitly."
        );
      }

      const acquire = acquireInstance(props.botId, props.mode ?? 'launcher');
      if (acquire.mustInstallListener) {
        installGlobalListener();
      }
      if (acquire.isFirstForBot) {
        if (!findExistingScript(props.botId)) {
          injectScript({
            botId: props.botId,
            mode: props.mode ?? 'launcher',
            scriptSrc: props.scriptSrc,
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
      activeBotId = props.botId;

      entry = {
        apiOrigin: props.apiOrigin || undefined,
        scriptSrc: props.scriptSrc || undefined,
        emit: (type: EmitName, payload?: unknown) => {
          if (payload !== undefined) {
            emit(type as Parameters<typeof emit>[0], payload);
          } else {
            emit(type as Parameters<typeof emit>[0]);
          }
        },
      };
      if (!listenerBuckets.has(props.botId)) {
        listenerBuckets.set(props.botId, new Set());
      }
      listenerBuckets.get(props.botId)!.add(entry);

      if (typeof customElements !== 'undefined') {
        void customElements.whenDefined(WIDGET_ELEMENT_NAME).catch(() => {
          // ignore
        });
      }
    };

    const release = (targetBotId = activeBotId || props.botId) => {
      if (!hasSlot || !targetBotId) return;
      const bucket = listenerBuckets.get(targetBotId);
      if (entry) bucket?.delete(entry);
      if (bucket && bucket.size === 0) {
        listenerBuckets.delete(targetBotId);
      }
      entry = null;
      const result = releaseInstance(targetBotId);
      hasSlot = false;
      activeBotId = null;
      if (result.isLastForBot) {
        removeScriptAndWidget(targetBotId);
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
      (next) => {
        if (!hasSlot) return;
        if (!props.botId) return;
        postSetMode(props.botId, next ?? 'launcher');
      },
    );

    watch(
      [() => props.botId, () => props.apiOrigin, () => props.scriptSrc, () => props.configUrl],
      ([botId, apiOrigin, scriptSrc, configUrl], [prevBotId, prevApiOrigin, prevScriptSrc, prevConfigUrl]) => {
        if (!hasSlot && !(botId && !prevBotId)) return;
        if (botId === prevBotId && apiOrigin === prevApiOrigin && scriptSrc === prevScriptSrc && configUrl === prevConfigUrl) return;
        release(prevBotId);
        install();
      },
    );

    watch(
      [
        () => props.position,
        () => props.className,
      ],
      ([position, className]) => {
        if (!hasSlot || !props.botId) return;

        // Sync script dataset
        const script = findExistingScript(props.botId);
        if (script) {
          if (position) script.dataset.position = position;
          else delete script.dataset.position;

          if (className) script.dataset.className = className;
          else delete script.dataset.className;
        }

        // Sync custom element attributes
        const widgetEl = document.querySelector<HTMLElement>(`${WIDGET_ELEMENT_NAME}[data-bot-id="${props.botId}"]`);
        if (widgetEl) {
          if (className) {
            widgetEl.className = className;
          } else {
            widgetEl.removeAttribute('class');
          }

          if (position) {
            widgetEl.setAttribute('data-agentdesk-position', position);
          } else {
            widgetEl.removeAttribute('data-agentdesk-position');
          }
        }
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

// === Vue Plugin ===

export interface AgentDeskPluginOptions {
  /**
   * When true (default), registers `<AgentDeskWidget>` globally on the app.
   * Set to false if you prefer to import it manually in each component.
   */
  globalComponent?: boolean;
}

export const AgentDeskPlugin: Plugin = {
  install(app: App, options: AgentDeskPluginOptions = { globalComponent: true }) {
    if (options.globalComponent !== false) {
      app.component('AgentDeskWidget', AgentDeskWidget);
    }
  },
};

export default AgentDeskPlugin;

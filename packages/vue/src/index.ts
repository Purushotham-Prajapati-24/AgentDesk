import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  type App,
  type PropType,
} from 'vue';

// ─── Public types ─────────────────────────────────────────────────────────────

export type WidgetMode = 'launcher' | 'inline';

export interface AgentDeskWidgetProps {
  /** The Bot ID from your AgentDesk dashboard. Required. */
  botId: string;
  /** Override the config fetch URL. */
  configUrl?: string;
  /** 'launcher' = floating bubble (default). 'inline' = fills container. */
  mode?: WidgetMode;
  /** URL to widget.js. Defaults to '/widget.js'. */
  scriptSrc?: string;
  /** Base URL of your AgentDesk backend (for cross-origin embeds). */
  apiOrigin?: string;
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
    const scriptRef = ref<HTMLScriptElement | null>(null);
    const widgetRef = ref<Element | null>(null);

    // Cleanup is owned by the `setup()` closure rather than attached to
    // a DOM node. Attaching arbitrary fields to script elements forces an
    // escape via `(script as any)` and makes the lifetime of the cleanup
    // function unclear (the script element can be removed before we want
    // to tear down the listener). A closure-scoped reference is type-safe
    // and lets `onBeforeUnmount` run as soon as Vue disposes the instance.
    let cleanup: (() => void) | null = null;

    onMounted(() => {
      if (!props.botId) return;

      // Deduplication guard — prevents double-injecting on re-mount.
      // We iterate over our own tagged scripts (using a fixed selector)
      // and compare `dataset.botId` directly. Attribute-value selectors
      // with dynamic, bot-controlled values (and `CSS.escape`) are fragile
      // and can be spoofed by a malicious `botId`.
      const SCRIPT_TAG = 'data-agentdesk-vue';
      const existingScript = Array.from(
        document.querySelectorAll<HTMLScriptElement>(`script[${SCRIPT_TAG}]`),
      ).find((candidate) => candidate.dataset.botId === props.botId);
      if (existingScript) return;

      const script = document.createElement('script');
      script.src = props.scriptSrc ?? '/widget.js';
      script.async = true;
      script.setAttribute(SCRIPT_TAG, '');
      script.dataset.botId = props.botId;
      script.dataset.mode = props.mode ?? 'launcher';
      if (props.configUrl) script.dataset.configUrl = props.configUrl;
      if (props.apiOrigin) script.dataset.apiOrigin = props.apiOrigin;

      script.addEventListener('load', () => {
        window.setTimeout(() => {
          widgetRef.value = document.querySelector('agentdesk-widget');
        }, 20);
      });

      document.body.append(script);
      scriptRef.value = script;

      // Listen for postMessage events from the widget IIFE. The widget
      // posts to `window` (not `window.parent`) with a specific
      // targetOrigin, so we validate both `event.origin` and the payload
      // before forwarding to the consumer.
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (!event.data || typeof event.data !== 'object') return;
        const data = event.data as { type?: unknown; botId?: unknown };
        if (data.botId !== props.botId) return;
        if (data.type === 'agentdesk-widget-open') emit('open');
        if (data.type === 'agentdesk-widget-close') emit('close');
      };
      window.addEventListener('message', handleMessage);

      cleanup = () => {
        window.removeEventListener('message', handleMessage);
      };
    });

    onBeforeUnmount(() => {
      cleanup?.();
      cleanup = null;
      scriptRef.value?.remove();
      scriptRef.value = null;
      if (widgetRef.value && widgetRef.value.isConnected) {
        widgetRef.value.remove();
      }
      widgetRef.value = null;
    });

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
  install(app: App, options: AgentDeskPluginOptions = {}) {
    if (options.globalComponent !== false) {
      app.component('AgentDeskWidget', AgentDeskWidget);
    }
  },
};

export default AgentDeskPlugin;


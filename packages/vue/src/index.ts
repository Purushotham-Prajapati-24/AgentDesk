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

    onMounted(() => {
      if (!props.botId) return;

      // Deduplication guard — prevents double-injecting on re-mount
      const dedupeAttr = `data-agentdesk-vue-${CSS.escape(props.botId)}`;
      if (document.querySelector(`script[${dedupeAttr}]`)) return;

      const script = document.createElement('script');
      script.src = props.scriptSrc ?? '/widget.js';
      script.async = true;
      script.setAttribute(dedupeAttr, '');
      script.dataset.botId = props.botId;
      script.dataset.mode = props.mode ?? 'launcher';
      if (props.configUrl) script.dataset.configUrl = props.configUrl;
      if (props.apiOrigin) script.dataset.apiOrigin = props.apiOrigin;

      document.body.append(script);
      scriptRef.value = script;

      // Listen for postMessage events from the widget IIFE
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (!event.data || event.data.botId !== props.botId) return;
        if (event.data.type === 'agentdesk-widget-open') emit('open');
        if (event.data.type === 'agentdesk-widget-close') emit('close');
      };
      window.addEventListener('message', handleMessage);

      // Store cleanup reference on the script element
      (script as HTMLScriptElement & { _adCleanup?: () => void })._adCleanup = () => {
        window.removeEventListener('message', handleMessage);
      };
    });

    onBeforeUnmount(() => {
      const script = scriptRef.value as HTMLScriptElement & { _adCleanup?: () => void } | null;
      script?._adCleanup?.();
      script?.remove();
      document.querySelectorAll('agentdesk-widget').forEach((el) => el.remove());
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

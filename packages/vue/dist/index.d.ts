import * as vue from 'vue';
import { App, PropType } from 'vue';

type WidgetMode = 'launcher' | 'inline';
interface AgentDeskWidgetProps {
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
declare const AgentDeskWidget: vue.DefineComponent<vue.ExtractPropTypes<{
    botId: {
        type: PropType<string>;
        required: true;
    };
    configUrl: {
        type: PropType<string>;
        default: string;
    };
    mode: {
        type: PropType<WidgetMode>;
        default: WidgetMode;
    };
    scriptSrc: {
        type: PropType<string>;
        default: string;
    };
    apiOrigin: {
        type: PropType<string>;
        default: string;
    };
}>, () => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, ("open" | "close")[], "open" | "close", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
    botId: {
        type: PropType<string>;
        required: true;
    };
    configUrl: {
        type: PropType<string>;
        default: string;
    };
    mode: {
        type: PropType<WidgetMode>;
        default: WidgetMode;
    };
    scriptSrc: {
        type: PropType<string>;
        default: string;
    };
    apiOrigin: {
        type: PropType<string>;
        default: string;
    };
}>> & Readonly<{
    onOpen?: ((...args: any[]) => any) | undefined;
    onClose?: ((...args: any[]) => any) | undefined;
}>, {
    configUrl: string;
    mode: WidgetMode;
    scriptSrc: string;
    apiOrigin: string;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;
interface AgentDeskPluginOptions {
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
declare const AgentDeskPlugin: {
    install(app: App, options?: AgentDeskPluginOptions): void;
};

export { AgentDeskPlugin, type AgentDeskPluginOptions, AgentDeskWidget, type AgentDeskWidgetProps, type WidgetMode, AgentDeskPlugin as default };

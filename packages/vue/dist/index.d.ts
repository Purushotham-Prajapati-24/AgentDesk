import * as vue from 'vue';
import { Plugin, PropType } from 'vue';
import { WidgetMode } from '@agentdeskbot/core';
export { WidgetMode } from '@agentdeskbot/core';

interface AgentDeskWidgetProps {
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
        validator: (v: string) => boolean;
    };
    scriptSrc: {
        type: PropType<string>;
        default: string;
    };
    apiOrigin: {
        type: PropType<string>;
        default: string;
    };
    theme: {
        type: PropType<string>;
        default: string;
    };
    cspNonce: {
        type: PropType<string>;
        default: string;
    };
    position: {
        type: PropType<"bottom-right" | "bottom-left" | "top-right" | "top-left">;
        default: string;
        validator: (v: string) => boolean;
    };
    className: {
        type: PropType<string>;
        default: string;
    };
}>, (() => null) | (() => vue.VNode<vue.RendererNode, vue.RendererElement, {
    [key: string]: any;
}>), {}, {}, {}, vue.ComponentOptionsMixin, vue.ComponentOptionsMixin, ("open" | "close" | "ready" | "error" | "message-sent" | "injected")[], "open" | "close" | "ready" | "error" | "message-sent" | "injected", vue.PublicProps, Readonly<vue.ExtractPropTypes<{
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
        validator: (v: string) => boolean;
    };
    scriptSrc: {
        type: PropType<string>;
        default: string;
    };
    apiOrigin: {
        type: PropType<string>;
        default: string;
    };
    theme: {
        type: PropType<string>;
        default: string;
    };
    cspNonce: {
        type: PropType<string>;
        default: string;
    };
    position: {
        type: PropType<"bottom-right" | "bottom-left" | "top-right" | "top-left">;
        default: string;
        validator: (v: string) => boolean;
    };
    className: {
        type: PropType<string>;
        default: string;
    };
}>> & Readonly<{
    onOpen?: ((...args: any[]) => any) | undefined;
    onClose?: ((...args: any[]) => any) | undefined;
    onReady?: ((...args: any[]) => any) | undefined;
    onError?: ((...args: any[]) => any) | undefined;
    "onMessage-sent"?: ((...args: any[]) => any) | undefined;
    onInjected?: ((...args: any[]) => any) | undefined;
}>, {
    mode: WidgetMode;
    configUrl: string;
    apiOrigin: string;
    theme: string;
    cspNonce: string;
    position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
    className: string;
    scriptSrc: string;
}, {}, {}, {}, string, vue.ComponentProvideOptions, true, {}, any>;
interface AgentDeskPluginOptions {
    /**
     * When true (default), registers `<AgentDeskWidget>` globally on the app.
     * Set to false if you prefer to import it manually in each component.
     */
    globalComponent?: boolean;
}
declare const AgentDeskPlugin: Plugin;

export { AgentDeskPlugin, type AgentDeskPluginOptions, AgentDeskWidget, type AgentDeskWidgetProps, AgentDeskPlugin as default };

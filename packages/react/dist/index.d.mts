import { WidgetMode } from '@agentdeskbot/core';
export { WidgetMode } from '@agentdeskbot/core';

interface AgentDeskWidgetProps {
    /**
     * The Bot ID from your AgentDesk dashboard.
     * @required
     */
    botId: string;
    /**
     * Override the URL used to fetch widget configuration.
     * Defaults to `{apiOrigin}/api/widget/config/{botId}`.
     */
    configUrl?: string;
    /**
     * Display mode for the widget.
     * - `'launcher'` — floating bubble in the bottom-right corner (default).
     * - `'inline'`   — fills the nearest positioned ancestor.
     *
     * **Dynamic updates are supported.** When this prop changes, the SDK
     * posts a `agentdesk-set-mode` message to the running widget so the
     * layout updates without a full script re-injection.
     */
    mode?: WidgetMode;
    /**
     * URL to the `widget.js` script.
     * Defaults to `'/widget.js'`.
     * For cross-site embeds, point this to your CDN or AgentDesk deployment.
     * @example 'https://cdn.agentdesk.ai/widget.js'
     */
    scriptSrc?: string;
    /**
     * Base URL of your AgentDesk backend deployment.
     * Required when the widget is embedded on a domain different from the backend.
     * Defaults to `undefined` (same-origin).
     * @example 'https://support.yourapp.com'
     */
    apiOrigin?: string;
    /**
     * Optional theme name for the widget (e.g. 'webchat-v1').
     * Note: This prop only takes effect on initial mount.
     */
    theme?: string;
    /**
     * Optional Content Security Policy (CSP) nonce to apply to the injected script and dynamically created styles.
     * Note: This prop only takes effect on initial mount.
     */
    cspNonce?: string;
    /**
     * Optional fixed positioning for the launcher button and pane.
     * Supported values: `'bottom-right'`, `'bottom-left'`, `'top-right'`, `'top-left'`.
     * Defaults to `'bottom-right'`.
     */
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    /**
     * Optional custom HTML class name to apply to the host custom element container.
     */
    className?: string;
    /**
     * Called when the user opens the chat widget.
     */
    onOpen?: () => void;
    /**
     * Called when the user closes the chat widget.
     */
    onClose?: () => void;
    /**
     * Called when the widget configuration has successfully loaded and the widget is ready.
     */
    onReady?: () => void;
    /**
     * Called when the widget fails to load configuration or establish a socket connection.
     */
    onError?: (error: {
        message: string;
    }) => void;
    /**
     * Called when the customer/user sends a message.
     */
    onMessageSent?: (message: {
        text: string;
    }) => void;
    /**
     * Called when the custom element is injected into the DOM.
     */
    onWidgetInjected?: () => void;
}
/**
 * AgentDeskWidget — embeds the AgentDesk AI chat widget into any React app.
 *
 * @example
 * ```tsx
 * import { AgentDeskWidget } from '@agentdeskbot/react';
 *
 * export default function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <AgentDeskWidget botId="your-bot-id" />
 *     </>
 *   );
 * }
 * ```
 */
declare function AgentDeskWidget({ botId, configUrl, mode, scriptSrc, apiOrigin, theme, cspNonce, position, className, onOpen, onClose, onReady, onError, onMessageSent, onWidgetInjected, }: AgentDeskWidgetProps): null;

export { AgentDeskWidget, type AgentDeskWidgetProps };

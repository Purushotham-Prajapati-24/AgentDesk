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
     * Defaults to `'/widget.js'` (same-origin).
     * For cross-site embeds, point this to your CDN or AgentDesk deployment.
     * @example 'https://cdn.agentdesk.ai/widget.js'
     */
    scriptSrc?: string;
    /**
     * Base URL of your AgentDesk backend deployment.
     * Required when the widget is embedded on a domain different from the backend.
     * @example 'https://support.yourapp.com'
     */
    apiOrigin?: string;
    /**
     * Called when the user opens the chat widget.
     */
    onOpen?: () => void;
    /**
     * Called when the user closes the chat widget.
     */
    onClose?: () => void;
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
declare function AgentDeskWidget({ botId, configUrl, mode, scriptSrc, apiOrigin, onOpen, onClose, }: AgentDeskWidgetProps): null;

export { AgentDeskWidget, type AgentDeskWidgetProps };

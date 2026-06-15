'use client';

import { useEffect, useRef } from 'react';

// ─── Public types ─────────────────────────────────────────────────────────────

export type WidgetMode = 'launcher' | 'inline';

export interface AgentDeskWidgetProps {
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

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * AgentDeskWidget — embeds the AgentDesk AI chat widget into any React app.
 *
 * @example
 * ```tsx
 * import { AgentDeskWidget } from '@agentdesk/react';
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
export function AgentDeskWidget({
  botId,
  configUrl,
  mode = 'launcher',
  scriptSrc = '/widget.js',
  apiOrigin,
  onOpen,
  onClose,
}: AgentDeskWidgetProps): null {
  // Keep callbacks in refs so the effect closure never goes stale
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  }, [onOpen, onClose]);

  useEffect(() => {
    if (!botId) return;

    // Deduplication: skip if a script for this botId is already injected
    const dedupeAttr = `data-agentdesk-react-${CSS.escape(botId)}`;
    if (document.querySelector(`script[${dedupeAttr}]`)) return;

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.setAttribute(dedupeAttr, '');
    script.dataset.botId = botId;
    script.dataset.mode = mode;
    if (configUrl) script.dataset.configUrl = configUrl;
    if (apiOrigin) script.dataset.apiOrigin = apiOrigin;

    document.body.append(script);

    // Listen for open/close events emitted via postMessage by the IIFE
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.botId !== botId) return;
      if (event.data.type === 'agentdesk-widget-open') onOpenRef.current?.();
      if (event.data.type === 'agentdesk-widget-close') onCloseRef.current?.();
    };
    window.addEventListener('message', handleMessage);

    return () => {
      script.remove();
      document.querySelectorAll('agentdesk-widget').forEach((el) => el.remove());
      window.removeEventListener('message', handleMessage);
    };
  }, [botId, configUrl, mode, scriptSrc, apiOrigin]);

  return null;
}

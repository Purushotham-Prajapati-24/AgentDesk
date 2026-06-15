'use client';

// NOTE: The `'use client'` directive is required for Next.js App Router
// consumers to import this component from a Server Component without
// triggering a "useState/useEffect not allowed in Server Components"
// error. The directive is a no-op for other React bundlers (CRA, Vite,
// Remix, etc.) — Next.js is the only consumer that interprets it.
//
// If you are NOT using Next.js, you can safely ignore this directive; it
// will be stripped by your bundler. If you ARE using Next.js with the
// Pages Router or want full SSR safety, import from
// `@agentdesk/react/nextjs` instead — that subpath uses `next/dynamic`
// with `ssr: false`.

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
  const onOpenRef = useRef<(() => void) | undefined>(onOpen);
  const onCloseRef = useRef<(() => void) | undefined>(onClose);

  useEffect(() => {
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  }, [onOpen, onClose]);

  useEffect(() => {
    if (!botId) return;

    // Deduplication: skip if a script for this botId is already injected.
    // We iterate over our own tagged scripts (using a fixed selector) and
    // compare `dataset.botId` directly — attribute-value selectors with
    // dynamic, bot-controlled values (and `CSS.escape`) are fragile and
    // can be spoofed by a malicious `botId`.
    const SCRIPT_TAG = 'data-agentdesk-react';
    const existingScript = Array.from(
      document.querySelectorAll<HTMLScriptElement>(`script[${SCRIPT_TAG}]`),
    ).find((candidate) => candidate.dataset.botId === botId);
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.setAttribute(SCRIPT_TAG, '');
    script.dataset.botId = botId;
    script.dataset.mode = mode;
    if (configUrl) script.dataset.configUrl = configUrl;
    if (apiOrigin) script.dataset.apiOrigin = apiOrigin;

    let widgetEl: Element | null = null;
    script.addEventListener('load', () => {
      window.setTimeout(() => {
        widgetEl = document.querySelector('agentdesk-widget');
      }, 20);
    });

    document.body.append(script);

    // Listen for open/close events emitted via postMessage by the IIFE.
    // The widget posts to `window` (not `window.parent`) with a specific
    // targetOrigin, so we validate both `event.origin` and the payload
    // before invoking consumer callbacks.
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== 'object') return;
      const data = event.data as { type?: unknown; botId?: unknown };
      if (data.botId !== botId) return;
      if (data.type === 'agentdesk-widget-open') onOpenRef.current?.();
      if (data.type === 'agentdesk-widget-close') onCloseRef.current?.();
    };
    window.addEventListener('message', handleMessage);

    return () => {
      script.remove();
      if (widgetEl && widgetEl.isConnected) widgetEl.remove();
      window.removeEventListener('message', handleMessage);
    };
  }, [botId, configUrl, mode, scriptSrc, apiOrigin]);

  return null;
}


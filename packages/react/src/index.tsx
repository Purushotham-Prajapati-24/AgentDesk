'use client';

// NOTE: The `'use client'` directive is required for Next.js App Router
// consumers to import this component from a Server Component without
// triggering a "useState/useEffect not allowed in Server Components"
// error. The directive is a no-op for other React bundlers (CRA, Vite,
// Remix, etc.) — Next.js is the only consumer that interprets it.
// (The directive is also re-injected via tsup's `banner` option as a
// belt-and-braces measure, because esbuild strips bare-string directives
// in some configurations.)
//
// If you are NOT using Next.js, you can safely ignore this directive; it
// will be stripped by your bundler. If you ARE using Next.js with the
// Pages Router or want full SSR safety, import from
// `@agentdeskbot/react/nextjs` instead — that subpath uses `next/dynamic`
// with `ssr: false`.

import { useEffect, useRef } from 'react';
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
   */
  theme?: string;

  /**
   * Optional Content Security Policy (CSP) nonce to apply to the injected script and dynamically created styles.
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
  onError?: (error: { message: string }) => void;

  /**
   * Called when the customer/user sends a message.
   */
  onMessageSent?: (message: { text: string }) => void;

  /**
   * Called when the custom element is injected into the DOM.
   */
  onWidgetInjected?: () => void;
}

// ─── Shared global message listener ──────────────────────────────────────────
//
// We register a single `window.message` listener for the lifetime of the
// page (across all botIds) instead of one-per-component. The listener
// iterates over the live registry and forwards `agentdesk-widget-open` /
// `agentdesk-widget-close` events to the `onOpen` / `onClose` callbacks
// of the component instance that owns the matching botId.
//
// The listener is installed on the *first* SDK mount (any botId) and
// torn down on the *last* SDK unmount (any botId). Reference counting
// lives in `@agentdeskbot/core` (`acquireInstance` / `releaseInstance`).
//
// We do not pass a real `WeakMap<botId, callback>` because consumers may
// change callback identities on every render — using refs inside each
// component (see `useAgentDeskListeners` below) keeps the dispatch logic
// side-effect free.

type ListenerBucket = {
  apiOrigin?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onReady?: () => void;
  onError?: (error: { message: string }) => void;
  onMessageSent?: (message: { text: string }) => void;
  onWidgetInjected?: () => void;
};

const listenerBuckets = new Map<string, ListenerBucket>();

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
    if (bucket.apiOrigin) {
      try {
        allowedOrigins.add(new URL(bucket.apiOrigin).origin);
      } catch {
        // ignore
      }
    }
    if (!allowedOrigins.has(event.origin)) return;

    switch (data.type) {
      case 'agentdesk-widget-open':
        bucket.onOpen?.();
        break;
      case 'agentdesk-widget-close':
        bucket.onClose?.();
        break;
      case 'agentdesk-widget-ready':
        bucket.onReady?.();
        break;
      case 'agentdesk-widget-error':
        bucket.onError?.({ message: (data as { message?: string }).message || 'Unknown error' });
        break;
      case 'agentdesk-widget-message-sent':
        bucket.onMessageSent?.({ text: (data as { text?: string }).text || '' });
        break;
      case 'agentdesk-widget-injected':
        bucket.onWidgetInjected?.();
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
export function AgentDeskWidget({
  botId,
  configUrl,
  mode = 'launcher',
  scriptSrc = '/widget.js',
  apiOrigin,
  theme,
  cspNonce,
  position,
  className,
  onOpen,
  onClose,
  onReady,
  onError,
  onMessageSent,
  onWidgetInjected,
}: AgentDeskWidgetProps): null {
  // Keep callbacks in refs so the effect closure never goes stale across
  // re-renders. The shared dispatch function reads the latest refs.
  const onOpenRef = useRef<(() => void) | undefined>(onOpen);
  const onCloseRef = useRef<(() => void) | undefined>(onClose);
  const onReadyRef = useRef<(() => void) | undefined>(onReady);
  const onErrorRef = useRef<((error: { message: string }) => void) | undefined>(onError);
  const onMessageSentRef = useRef<((message: { text: string }) => void) | undefined>(onMessageSent);
  const onWidgetInjectedRef = useRef<(() => void) | undefined>(onWidgetInjected);

  // Sync refs to the latest callback identity after every render so the
  // shared message listener always dispatches to the most recent functions.
  useEffect(() => {
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
    onMessageSentRef.current = onMessageSent;
    onWidgetInjectedRef.current = onWidgetInjected;
  });

  // Mount/unmount lifecycle: ref-count the widget so multiple components
  // pointing at the same botId share a single script injection.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!botId) return;

    // Acquire registry slot. Note that we pass the initial mode here,
    // but any subsequent mode changes are handled dynamically by the mode effect.
    const acquire = acquireInstance(botId, mode);
    if (acquire.mustInstallListener) {
      installGlobalListener();
    }
    if (acquire.isFirstForBot) {
      if (!findExistingScript(botId)) {
        injectScript({
          botId,
          mode,
          scriptSrc,
          configUrl,
          apiOrigin,
          theme,
          cspNonce,
          position,
          className,
        });
      }
    }

    // Register this component's callbacks in the shared dispatch table.
    const bucket: ListenerBucket = {
      apiOrigin,
      onOpen: onOpenRef.current,
      onClose: onCloseRef.current,
      onReady: onReadyRef.current,
      onError: onErrorRef.current,
      onMessageSent: onMessageSentRef.current,
      onWidgetInjected: onWidgetInjectedRef.current,
    };
    listenerBuckets.set(botId, bucket);

    if (typeof customElements !== 'undefined') {
      void customElements.whenDefined(WIDGET_ELEMENT_NAME).catch(() => {
        // ignore
      });
    }

    return () => {
      const release = releaseInstance(botId);
      if (release.isLastForBot) {
        listenerBuckets.delete(botId);
        removeScriptAndWidget(botId);
      }
      if (release.mustRemoveListener) {
        uninstallGlobalListener();
      }
    };
  }, [botId, scriptSrc, configUrl, apiOrigin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Separate effect: dynamic mode propagation.
  const isFirstModeRender = useRef(true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isFirstModeRender.current) {
      isFirstModeRender.current = false;
      return;
    }
    if (!botId) return;
    postSetMode(botId, mode);
  }, [mode, botId]);

  // Separate effect: dynamic styling propagation (theme, position, className, cspNonce).
  // This updates the script dataset and custom element attributes directly, avoiding
  // disruptive unmount/re-mount cycles.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!botId) return;

    const script = findExistingScript(botId);
    if (script) {
      if (theme) script.dataset.theme = theme;
      else delete script.dataset.theme;

      if (position) script.dataset.position = position;
      else delete script.dataset.position;

      if (className) script.dataset.className = className;
      else delete script.dataset.className;

      if (cspNonce) {
        script.dataset.cspNonce = cspNonce;
        script.setAttribute('nonce', cspNonce);
      } else {
        delete script.dataset.cspNonce;
        script.removeAttribute('nonce');
      }
    }

    const widgetEl = document.querySelector<HTMLElement>(`${WIDGET_ELEMENT_NAME}[data-bot-id="${botId}"]`);
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
  }, [botId, theme, position, className, cspNonce]);

  if (typeof window === 'undefined') {
    console.warn(
      "[AgentDesk] AgentDeskWidget was rendered on the server. " +
      "If you are using Next.js App Router, please import from '@agentdeskbot/react/nextjs' instead to ensure proper SSR/App Router integration."
    );
    return null;
  }

  return null;
}

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
// `@agentdesk/react/nextjs` instead — that subpath uses `next/dynamic`
// with `ssr: false`.

import { useEffect, useRef } from 'react';
import {
  WIDGET_ELEMENT_NAME,
  acquireInstance,
  releaseInstance,
  postSetMode,
  type WidgetMode,
  type WidgetMessageEventData,
} from '@agentdesk/core';

// ─── Public types ─────────────────────────────────────────────────────────────

export type { WidgetMode } from '@agentdesk/core';

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
// lives in `@agentdesk/core` (`acquireInstance` / `releaseInstance`).
//
// We do not pass a real `WeakMap<botId, callback>` because consumers may
// change callback identities on every render — using refs inside each
// component (see `useAgentDeskListeners` below) keeps the dispatch logic
// side-effect free.

type ListenerBucket = {
  onOpen?: () => void;
  onClose?: () => void;
};

const listenerBuckets = new Map<string, ListenerBucket>();

function dispatchOpen(botId: string) {
  listenerBuckets.get(botId)?.onOpen?.();
}

function dispatchClose(botId: string) {
  listenerBuckets.get(botId)?.onClose?.();
}

let globalListenerInstalled = false;
let globalListenerRef: ((event: MessageEvent) => void) | null = null;

function installGlobalListener() {
  if (globalListenerInstalled) return;
  globalListenerInstalled = true;
  globalListenerRef = (event: MessageEvent) => {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.origin !== window.location.origin) return;
    const data = event.data as Partial<WidgetMessageEventData>;
    if (data.type !== 'agentdesk-widget-open' && data.type !== 'agentdesk-widget-close') return;
    if (typeof data.botId !== 'string') return;
    if (data.type === 'agentdesk-widget-open') dispatchOpen(data.botId);
    else dispatchClose(data.botId);
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
}): void {
  const script = document.createElement('script');
  script.src = options.scriptSrc;
  script.async = true;
  script.setAttribute(SCRIPT_TAG, '');
  script.dataset.botId = options.botId;
  script.dataset.mode = options.mode;
  if (options.configUrl) script.dataset.configUrl = options.configUrl;
  if (options.apiOrigin) script.dataset.apiOrigin = options.apiOrigin;
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
  // Keep callbacks in refs so the effect closure never goes stale across
  // re-renders. The shared dispatch function reads the latest refs.
  const onOpenRef = useRef<(() => void) | undefined>(onOpen);
  const onCloseRef = useRef<(() => void) | undefined>(onClose);

  // Sync refs to the latest callback identity after every render so the
  // shared message listener always dispatches to the most recent functions.
  // A `useEffect` without deps runs after every committed render, which is
  // the correct timing for ref syncing (React 19's `react-hooks/refs` rule
  // forbids assigning `.current` in the render body).
  useEffect(() => {
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
  });

  // Mount/unmount lifecycle: ref-count the widget so multiple components
  // pointing at the same botId (StrictMode double-invoke, HMR, two
  // <AgentDeskWidget> trees) share a single script injection. The
  // script is only removed when the *last* instance for the botId unmounts.
  useEffect(() => {
    if (!botId) return;

    const acquire = acquireInstance(botId, mode);
    if (acquire.mustInstallListener) {
      installGlobalListener();
    }
    if (acquire.isFirstForBot) {
      if (!findExistingScript(botId)) {
        injectScript({ botId, mode, scriptSrc, configUrl, apiOrigin });
      }
    } else if (acquire.modeChanged) {
      // Another instance for this botId is already alive with a
      // different mode — forward the update so the widget can re-render
      // without re-injection.
      postSetMode(botId, mode);
    }

    // Register this component's callbacks in the shared dispatch table.
    const bucket: ListenerBucket = { onOpen: onOpenRef.current, onClose: onCloseRef.current };
    listenerBuckets.set(botId, bucket);

    // Wait for the custom element to be defined so callers can
    // immediately read `document.querySelector('agentdesk-widget')` and
    // get a real (upgraded) element. We don't poll with setTimeout.
    if (typeof customElements !== 'undefined') {
      void customElements.whenDefined(WIDGET_ELEMENT_NAME).catch(() => {
        // ignore — the element may never be defined if the script fails
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
  }, [botId, mode, scriptSrc, configUrl, apiOrigin]);

  // Separate effect: dynamic mode propagation. When `mode` changes for a
  // botId that already has the script injected, we forward the update
  // via postMessage so the widget re-renders in place. We only do this
  // when the entry exists in the registry (i.e. the previous effect
  // already ran) so the first render is handled by the mount effect.
  const isFirstModeRender = useRef(true);
  useEffect(() => {
    if (isFirstModeRender.current) {
      isFirstModeRender.current = false;
      return;
    }
    if (!botId) return;
    postSetMode(botId, mode);
  }, [mode, botId]);

  return null;
}

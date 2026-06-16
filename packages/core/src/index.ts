export type WidgetMode = 'launcher' | 'inline';

export const WIDGET_ELEMENT_NAME = 'agentdesk-widget';

export type WidgetLifecycleEventType =
  | 'agentdesk-widget-open'
  | 'agentdesk-widget-close'
  | 'agentdesk-widget-ready'
  | 'agentdesk-widget-error'
  | 'agentdesk-widget-message-sent'
  | 'agentdesk-widget-injected';

export type WidgetControlEventType = 'agentdesk-set-mode';

export type WidgetAckEventType = 'agentdesk-set-mode-ack';

export type WidgetEventType =
  | WidgetLifecycleEventType
  | WidgetControlEventType
  | WidgetAckEventType;

export type WidgetMessageEventData =
  | { type: 'agentdesk-widget-open' | 'agentdesk-widget-close' | 'agentdesk-widget-ready' | 'agentdesk-widget-injected'; botId: string }
  | { type: 'agentdesk-widget-error'; botId: string; message: string }
  | { type: 'agentdesk-widget-message-sent'; botId: string; text: string }
  | { type: WidgetControlEventType; botId: string; mode: WidgetMode }
  | { type: WidgetAckEventType; botId: string };

export interface AgentDeskWidgetRegistryEntry {
  count: number;
  mode: WidgetMode;
}

export interface AgentDeskWidgetGlobals {
  __agentdeskWidgetInstances?: Map<string, AgentDeskWidgetRegistryEntry>;
  __agentdeskGlobalListenerCount?: number;
}

function getWindow(): (Window & AgentDeskWidgetGlobals) | null {
  if (typeof window === 'undefined') return null;
  return window as unknown as Window & AgentDeskWidgetGlobals;
}

function getRegistry(windowRef: Window & AgentDeskWidgetGlobals): Map<string, AgentDeskWidgetRegistryEntry> {
  let registry = windowRef.__agentdeskWidgetInstances;
  if (!registry) {
    registry = new Map<string, AgentDeskWidgetRegistryEntry>();
    windowRef.__agentdeskWidgetInstances = registry;
  }
  return registry;
}

export interface AcquireResult {
  /** True if this is the first instance for this botId. Caller should inject the script. */
  isFirstForBot: boolean;
  /** True if the global message listener must be (re-)installed. */
  mustInstallListener: boolean;
  /** True if the existing entry's mode differs from the requested mode. */
  modeChanged: boolean;
  /** The entry as stored after acquisition. */
  entry: AgentDeskWidgetRegistryEntry;
}

export interface ReleaseResult {
  /** True if this was the last instance for this botId. Caller should remove the script + widget element. */
  isLastForBot: boolean;
  /** True if the global message listener must be removed. */
  mustRemoveListener: boolean;
}

export function acquireInstance(botId: string, mode: WidgetMode): AcquireResult {
  const windowRef = getWindow();
  if (!windowRef) {
    return {
      isFirstForBot: true,
      mustInstallListener: true,
      modeChanged: false,
      entry: { count: 1, mode },
    };
  }

  const registry = getRegistry(windowRef);
  const existing = registry.get(botId);
  const isFirstForBot = !existing;
  const modeChanged = Boolean(existing) && existing!.mode !== mode;

  const entry: AgentDeskWidgetRegistryEntry = existing ?? { count: 0, mode };
  entry.count += 1;
  if (modeChanged) {
    entry.mode = mode;
  }
  registry.set(botId, entry);

  const previousListenerCount = windowRef.__agentdeskGlobalListenerCount ?? 0;
  const nextListenerCount = previousListenerCount + 1;
  windowRef.__agentdeskGlobalListenerCount = nextListenerCount;
  const mustInstallListener = previousListenerCount === 0;

  return {
    isFirstForBot,
    mustInstallListener,
    modeChanged,
    entry,
  };
}

export function releaseInstance(botId: string): ReleaseResult {
  const windowRef = getWindow();
  if (!windowRef) {
    return { isLastForBot: true, mustRemoveListener: true };
  }

  const registry = getRegistry(windowRef);
  const entry = registry.get(botId);
  if (!entry) {
    return { isLastForBot: true, mustRemoveListener: false };
  }

  entry.count = Math.max(0, entry.count - 1);
  let isLastForBot = false;
  if (entry.count === 0) {
    registry.delete(botId);
    isLastForBot = true;
  }

  const previousListenerCount = windowRef.__agentdeskGlobalListenerCount ?? 0;
  const nextListenerCount = Math.max(0, previousListenerCount - 1);
  windowRef.__agentdeskGlobalListenerCount = nextListenerCount;
  const mustRemoveListener = nextListenerCount === 0 && previousListenerCount > 0;

  return { isLastForBot, mustRemoveListener };
}

export function getEntry(botId: string): AgentDeskWidgetRegistryEntry | undefined {
  const windowRef = getWindow();
  if (!windowRef) return undefined;
  const registry = getRegistry(windowRef);
  return registry.get(botId);
}

export function getActiveBotIds(): string[] {
  const windowRef = getWindow();
  if (!windowRef) return [];
  const registry = getRegistry(windowRef);
  return Array.from(registry.keys());
}

export function postSetMode(botId: string, mode: WidgetMode): void {
  const windowRef = getWindow();
  if (!windowRef) return;

  // The widget can be embedded in two ways:
  //  1. Direct script: the widget IIFE is in the same window, so we use
  //     `window.location.origin` as the target origin.
  //  2. Iframe embed: the widget runs in an iframe, and the only way to
  //     reach it is through `window.parent` with a wildcard origin (we
  //     can't read the iframe's origin from the host page).
  // We always send to both `window` and `window.parent` (when they differ)
  // because the postMessage event the widget IIFE listens to is bound at
  // the time the IIFE executes, and we can't tell from the SDK side
  // whether the widget is running in an iframe or not.
  const payload = { type: 'agentdesk-set-mode' as const, botId, mode };

  try {
    windowRef.postMessage(payload, windowRef.location.origin);
  } catch {
    // ignore
  }

  try {
    if (windowRef.parent && windowRef.parent !== windowRef) {
      windowRef.parent.postMessage(payload, '*');
    }
  } catch {
    // cross-origin parent — accept that we can't reach it
  }
}

type WidgetMode = 'launcher' | 'inline';
declare const WIDGET_ELEMENT_NAME = "agentdesk-widget";
type WidgetLifecycleEventType = 'agentdesk-widget-open' | 'agentdesk-widget-close' | 'agentdesk-widget-ready' | 'agentdesk-widget-error' | 'agentdesk-widget-message-sent' | 'agentdesk-widget-injected';
type WidgetControlEventType = 'agentdesk-set-mode';
type WidgetAckEventType = 'agentdesk-set-mode-ack';
type WidgetEventType = WidgetLifecycleEventType | WidgetControlEventType | WidgetAckEventType;
type WidgetMessageEventData = {
    type: 'agentdesk-widget-open' | 'agentdesk-widget-close' | 'agentdesk-widget-ready' | 'agentdesk-widget-injected';
    botId: string;
} | {
    type: 'agentdesk-widget-error';
    botId: string;
    message: string;
} | {
    type: 'agentdesk-widget-message-sent';
    botId: string;
    text: string;
} | {
    type: WidgetControlEventType;
    botId: string;
    mode: WidgetMode;
} | {
    type: WidgetAckEventType;
    botId: string;
};
interface AgentDeskWidgetRegistryEntry {
    count: number;
    mode: WidgetMode;
}
interface AgentDeskWidgetGlobals {
    __agentdeskWidgetInstances?: Map<string, AgentDeskWidgetRegistryEntry>;
    __agentdeskGlobalListenerCount?: number;
}
interface AcquireResult {
    /** True if this is the first instance for this botId. Caller should inject the script. */
    isFirstForBot: boolean;
    /** True if the global message listener must be (re-)installed. */
    mustInstallListener: boolean;
    /** True if the existing entry's mode differs from the requested mode. */
    modeChanged: boolean;
    /** The entry as stored after acquisition. */
    entry: AgentDeskWidgetRegistryEntry;
}
interface ReleaseResult {
    /** True if this was the last instance for this botId. Caller should remove the script + widget element. */
    isLastForBot: boolean;
    /** True if the global message listener must be removed. */
    mustRemoveListener: boolean;
}
declare function acquireInstance(botId: string, mode: WidgetMode): AcquireResult;
declare function releaseInstance(botId: string): ReleaseResult;
declare function getEntry(botId: string): AgentDeskWidgetRegistryEntry | undefined;
declare function getActiveBotIds(): string[];
declare function postSetMode(botId: string, mode: WidgetMode): void;

export { type AcquireResult, type AgentDeskWidgetGlobals, type AgentDeskWidgetRegistryEntry, type ReleaseResult, WIDGET_ELEMENT_NAME, type WidgetAckEventType, type WidgetControlEventType, type WidgetEventType, type WidgetLifecycleEventType, type WidgetMessageEventData, type WidgetMode, acquireInstance, getActiveBotIds, getEntry, postSetMode, releaseInstance };

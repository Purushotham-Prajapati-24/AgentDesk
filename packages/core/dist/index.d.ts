type WidgetMode = 'launcher' | 'inline';
interface WidgetMessageEventData {
    type: 'agentdesk-widget-open' | 'agentdesk-widget-close';
    botId: string;
}

export type { WidgetMessageEventData, WidgetMode };

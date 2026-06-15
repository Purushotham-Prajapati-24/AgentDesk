export type WidgetMode = 'launcher' | 'inline';

export interface WidgetMessageEventData {
  type: 'agentdesk-widget-open' | 'agentdesk-widget-close';
  botId: string;
}

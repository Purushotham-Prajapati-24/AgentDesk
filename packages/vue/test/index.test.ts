import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { AgentDeskWidget } from '../src/index';

describe('AgentDeskWidget (Vue)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllTimers();
  });

  it('injects script with dedup tag', () => {
    mount(AgentDeskWidget, { props: { botId: 'test-bot' } });
    const scripts = document.querySelectorAll('script[data-agentdesk]');
    expect(scripts.length).toBe(1);
    expect((scripts[0] as HTMLScriptElement).dataset.botId).toBe('test-bot');
  });

  it('cleans up on unmount', () => {
    const wrapper = mount(AgentDeskWidget, { props: { botId: 'test-bot' } });
    wrapper.unmount();
    const scripts = document.querySelectorAll('script[data-agentdesk]');
    expect(scripts.length).toBe(0);
  });
});

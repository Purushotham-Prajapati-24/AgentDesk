import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { AgentDeskWidget } from '../src/index';

describe('AgentDeskWidget (React)', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.clearAllTimers();
  });

  it('injects script with dedup tag', () => {
    render(<AgentDeskWidget botId="test-bot" />);
    const scripts = document.querySelectorAll('script[data-agentdesk]');
    expect(scripts.length).toBe(1);
    expect((scripts[0] as HTMLScriptElement).dataset.botId).toBe('test-bot');
  });

  it('deduplicates scripts for same botId', () => {
    render(<AgentDeskWidget botId="test-bot" />);
    render(<AgentDeskWidget botId="test-bot" />);
    const scripts = document.querySelectorAll('script[data-agentdesk]');
    expect(scripts.length).toBe(1);
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(<AgentDeskWidget botId="test-bot" />);
    unmount();
    const scripts = document.querySelectorAll('script[data-agentdesk]');
    expect(scripts.length).toBe(0);
  });
});

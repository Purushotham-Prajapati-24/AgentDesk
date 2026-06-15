import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { AgentDeskWidget } from '../src/index';

describe('AgentDeskWidget (React)', () => {
  let messageListeners: Array<(event: MessageEvent) => void>;

  beforeEach(() => {
    messageListeners = [];
    const originalAdd = window.addEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'message' && typeof listener === 'function') {
        messageListeners.push(listener as (event: MessageEvent) => void);
        return;
      }
      return originalAdd(type, listener as EventListenerOrEventListenerObject);
    });
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.clearAllTimers();
    vi.restoreAllMocks();
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

  it('ref-counts multiple instances for the same botId', () => {
    const first = render(<AgentDeskWidget botId="shared-bot" />);
    const second = render(<AgentDeskWidget botId="shared-bot" />);
    expect(document.querySelectorAll('script[data-agentdesk]').length).toBe(1);

    // Unmounting the first should NOT remove the script (still ref'd).
    first.unmount();
    expect(document.querySelectorAll('script[data-agentdesk]').length).toBe(1);

    // Unmounting the second SHOULD remove it.
    second.unmount();
    expect(document.querySelectorAll('script[data-agentdesk]').length).toBe(0);
  });

  const SAME_ORIGIN_EVENT = { origin: window.location.origin };

  it('invokes onOpen when receiving an open event for the matching botId', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    render(
      <AgentDeskWidget botId="event-bot" onOpen={onOpen} onClose={onClose} />,
    );

    expect(messageListeners.length).toBeGreaterThan(0);
    act(() => {
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-open', botId: 'event-bot' },
        }),
      );
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('invokes onClose when receiving a close event for the matching botId', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    render(
      <AgentDeskWidget botId="event-bot" onOpen={onOpen} onClose={onClose} />,
    );

    act(() => {
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-close', botId: 'event-bot' },
        }),
      );
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('ignores messages for a different botId', () => {
    const onOpen = vi.fn();
    render(<AgentDeskWidget botId="my-bot" onOpen={onOpen} />);

    act(() => {
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-open', botId: 'some-other-bot' },
        }),
      );
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('sends postMessage when mode changes', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    const { rerender } = render(
      <AgentDeskWidget botId="mode-bot" mode="launcher" />,
    );

    rerender(<AgentDeskWidget botId="mode-bot" mode="inline" />);

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: 'agentdesk-set-mode', botId: 'mode-bot', mode: 'inline' },
      window.location.origin,
    );
    postMessageSpy.mockRestore();
  });

  it('ignores events from a different origin', () => {
    const onOpen = vi.fn();
    render(<AgentDeskWidget botId="origin-bot" onOpen={onOpen} />);

    act(() => {
      messageListeners[0](
        new MessageEvent('message', {
          origin: 'https://evil-site.com',
          data: { type: 'agentdesk-widget-open', botId: 'origin-bot' },
        }),
      );
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('is SSR-safe — renders null without accessing DOM', () => {
    // Component always returns null; it never accesses DOM during render.
    const { container } = render(<AgentDeskWidget botId="ssr-bot" />);
    expect(container.innerHTML).toBe('');
  });

  it('ignores messages with an unknown shape', () => {
    const onOpen = vi.fn();
    render(<AgentDeskWidget botId="shape-bot" onOpen={onOpen} />);

    act(() => {
      messageListeners[0](
        new MessageEvent('message', { ...SAME_ORIGIN_EVENT, data: null }),
      );
      messageListeners[0](
        new MessageEvent('message', { ...SAME_ORIGIN_EVENT, data: 'not-an-object' }),
      );
      messageListeners[0](
        new MessageEvent('message', { ...SAME_ORIGIN_EVENT, data: { type: 'unrelated' } }),
      );
    });
    expect(onOpen).not.toHaveBeenCalled();
  });
});

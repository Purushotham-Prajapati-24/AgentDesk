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

  it('allows events from origins matching apiOrigin or scriptSrc', () => {
    const onOpen = vi.fn();
    render(
      <AgentDeskWidget
        botId="custom-origin-bot"
        apiOrigin="https://api.custom-desk.com"
        scriptSrc="https://widget.custom-desk.com/sdk.js"
        onOpen={onOpen}
      />,
    );

    expect(messageListeners.length).toBeGreaterThan(0);

    // Test message from apiOrigin
    act(() => {
      messageListeners[0](
        new MessageEvent('message', {
          origin: 'https://api.custom-desk.com',
          data: { type: 'agentdesk-widget-open', botId: 'custom-origin-bot' },
        }),
      );
    });
    expect(onOpen).toHaveBeenCalledTimes(1);

    // Test message from scriptSrc origin
    act(() => {
      messageListeners[0](
        new MessageEvent('message', {
          origin: 'https://widget.custom-desk.com',
          data: { type: 'agentdesk-widget-open', botId: 'custom-origin-bot' },
        }),
      );
    });
    expect(onOpen).toHaveBeenCalledTimes(2);

    // Test message from untrusted origin
    act(() => {
      messageListeners[0](
        new MessageEvent('message', {
          origin: 'https://evil-site.com',
          data: { type: 'agentdesk-widget-open', botId: 'custom-origin-bot' },
        }),
      );
    });
    // Count should still be 2
    expect(onOpen).toHaveBeenCalledTimes(2);
  });


  it('injects scripts with default same-origin endpoints', () => {
    render(<AgentDeskWidget botId="saas-bot" />);
    const script = document.querySelector('script[data-agentdesk]') as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.getAttribute('src')).toBe('https://agentdeskbot.vercel.app/widget.js');
    expect(script.dataset.apiOrigin).toBe('https://agentdeskbot.vercel.app');
  });

  it('injects optional styling, positioning, and security attributes', () => {
    render(
      <AgentDeskWidget
        botId="attrs-bot"
        theme="webchat-v1"
        cspNonce="xyz123"
        position="bottom-left"
        className="my-custom-container"
      />
    );
    const script = document.querySelector('script[data-agentdesk]') as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.dataset.theme).toBe('webchat-v1');
    expect(script.dataset.cspNonce).toBe('xyz123');
    expect(script.getAttribute('nonce')).toBe('xyz123');
    expect(script.dataset.position).toBe('bottom-left');
    expect(script.dataset.className).toBe('my-custom-container');
  });

  it('invokes new lifecycle callbacks correctly', () => {
    const onReady = vi.fn();
    const onError = vi.fn();
    const onMessageSent = vi.fn();
    const onWidgetInjected = vi.fn();

    render(
      <AgentDeskWidget
        botId="callbacks-bot"
        onReady={onReady}
        onError={onError}
        onMessageSent={onMessageSent}
        onWidgetInjected={onWidgetInjected}
      />
    );

    act(() => {
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-ready', botId: 'callbacks-bot' },
        }),
      );
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-error', botId: 'callbacks-bot', message: 'Config failed' },
        }),
      );
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-message-sent', botId: 'callbacks-bot', text: 'hello' },
        }),
      );
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-injected', botId: 'callbacks-bot' },
        }),
      );
    });

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({ message: 'Config failed' });
    expect(onMessageSent).toHaveBeenCalledWith({ text: 'hello' });
    expect(onWidgetInjected).toHaveBeenCalledTimes(1);
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

  it('allows multiple components with the same botId to receive lifecycle callbacks', () => {
    const onOpen1 = vi.fn();
    const onOpen2 = vi.fn();

    render(<AgentDeskWidget botId="shared-event-bot" onOpen={onOpen1} />);
    render(<AgentDeskWidget botId="shared-event-bot" onOpen={onOpen2} />);

    expect(messageListeners.length).toBeGreaterThan(0);

    act(() => {
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-open', botId: 'shared-event-bot' },
        }),
      );
    });

    expect(onOpen1).toHaveBeenCalledTimes(1);
    expect(onOpen2).toHaveBeenCalledTimes(1);
  });

  it('calls the latest callback when callback props change after rerender', () => {
    const onOpen1 = vi.fn();
    const onOpen2 = vi.fn();

    const { rerender } = render(<AgentDeskWidget botId="rerender-bot" onOpen={onOpen1} />);

    rerender(<AgentDeskWidget botId="rerender-bot" onOpen={onOpen2} />);

    act(() => {
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-open', botId: 'rerender-bot' },
        }),
      );
    });

    expect(onOpen1).not.toHaveBeenCalled();
    expect(onOpen2).toHaveBeenCalledTimes(1);
  });

  it('uses current props when botId changes, rather than stale first-render props', () => {
    const { rerender } = render(
      <AgentDeskWidget
        botId="bot-a"
        theme="theme-a"
        position="bottom-left"
      />
    );

    // Rerender with different botId and props
    rerender(
      <AgentDeskWidget
        botId="bot-b"
        theme="theme-b"
        position="top-right"
      />
    );

    const scriptA = document.querySelector('script[data-bot-id="bot-a"]') as HTMLScriptElement;
    const scriptB = document.querySelector('script[data-bot-id="bot-b"]') as HTMLScriptElement;

    expect(scriptA).toBeNull(); // Cleaned up
    expect(scriptB).not.toBeNull();
    expect(scriptB.dataset.theme).toBe('theme-b');
    expect(scriptB.dataset.position).toBe('top-right');
  });

  it('ensures onReady, onError, onMessageSent, and onWidgetInjected still work after rerender', () => {
    const onReady = vi.fn();
    const onError = vi.fn();
    const onMessageSent = vi.fn();
    const onWidgetInjected = vi.fn();

    const { rerender } = render(
      <AgentDeskWidget
        botId="dynamic-callbacks-bot"
        onReady={vi.fn()}
        onError={vi.fn()}
        onMessageSent={vi.fn()}
        onWidgetInjected={vi.fn()}
      />
    );

    rerender(
      <AgentDeskWidget
        botId="dynamic-callbacks-bot"
        onReady={onReady}
        onError={onError}
        onMessageSent={onMessageSent}
        onWidgetInjected={onWidgetInjected}
      />
    );

    act(() => {
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-ready', botId: 'dynamic-callbacks-bot' },
        }),
      );
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-error', botId: 'dynamic-callbacks-bot', message: 'Rerendered error' },
        }),
      );
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-message-sent', botId: 'dynamic-callbacks-bot', text: 'rerendered text' },
        }),
      );
      messageListeners[0](
        new MessageEvent('message', {
          ...SAME_ORIGIN_EVENT,
          data: { type: 'agentdesk-widget-injected', botId: 'dynamic-callbacks-bot' },
        }),
      );
    });

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({ message: 'Rerendered error' });
    expect(onMessageSent).toHaveBeenCalledWith({ text: 'rerendered text' });
    expect(onWidgetInjected).toHaveBeenCalledTimes(1);
  });

  it('correctly isolates and cleans up listeners when different botIds are unmounted', () => {
    const first = render(<AgentDeskWidget botId="bot-one" />);
    const second = render(<AgentDeskWidget botId="bot-two" />);

    expect(document.querySelectorAll('script[data-agentdesk]').length).toBe(2);

    first.unmount();
    expect(document.querySelectorAll('script[data-agentdesk][data-bot-id="bot-one"]').length).toBe(0);
    expect(document.querySelectorAll('script[data-agentdesk][data-bot-id="bot-two"]').length).toBe(1);

    second.unmount();
    expect(document.querySelectorAll('script[data-agentdesk]').length).toBe(0);
  });
});

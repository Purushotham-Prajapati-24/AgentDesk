import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { AgentDeskWidget } from '../src/index';
import { type AgentDeskWidgetGlobals } from '@agentdeskbot/core';

describe('AgentDeskWidget (Vue)', () => {
  let messageListeners: Array<(event: MessageEvent) => void>;

  beforeEach(() => {
    // Reset shared global state so each test starts fresh
    const windowRef = window as Window & AgentDeskWidgetGlobals;
    delete windowRef.__agentdeskGlobalListenerCount;
    delete windowRef.__agentdeskWidgetInstances;
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
    document.body.innerHTML = '';
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  it('injects script with dedup tag', () => {
    const wrapper = mount(AgentDeskWidget, { props: { botId: 'test-bot' } });
    const scripts = document.querySelectorAll('script[data-agentdesk]');
    expect(scripts.length).toBe(1);
    expect((scripts[0] as HTMLScriptElement).dataset.botId).toBe('test-bot');
    wrapper.unmount();
  });

  it('cleans up on unmount', () => {
    const wrapper = mount(AgentDeskWidget, { props: { botId: 'test-bot' } });
    wrapper.unmount();
    const scripts = document.querySelectorAll('script[data-agentdesk]');
    expect(scripts.length).toBe(0);
  });

  it('ref-counts multiple instances for the same botId', () => {
    const a = mount(AgentDeskWidget, { props: { botId: 'shared-bot' } });
    const b = mount(AgentDeskWidget, { props: { botId: 'shared-bot' } });
    expect(document.querySelectorAll('script[data-agentdesk]').length).toBe(1);

    a.unmount();
    expect(document.querySelectorAll('script[data-agentdesk]').length).toBe(1);

    b.unmount();
    expect(document.querySelectorAll('script[data-agentdesk]').length).toBe(0);
  });

  const SAME_ORIGIN_EVENT = { origin: window.location.origin };

  it('emits "open" when receiving an open event for the matching botId', async () => {
    const wrapper = mount(AgentDeskWidget, { props: { botId: 'event-bot' } });
    // The SDK wires emits directly, so we use the `wrapper.emitted()` capture API instead.
    expect(messageListeners.length).toBeGreaterThan(0);

    messageListeners[0](
      new MessageEvent('message', {
        ...SAME_ORIGIN_EVENT,
        data: { type: 'agentdesk-widget-open', botId: 'event-bot' },
      }),
    );
    await nextTick();
    expect(wrapper.emitted('open')?.length).toBe(1);
    expect(wrapper.emitted('close')).toBeUndefined();

    messageListeners[0](
      new MessageEvent('message', {
        ...SAME_ORIGIN_EVENT,
        data: { type: 'agentdesk-widget-close', botId: 'event-bot' },
      }),
    );
    await nextTick();
    expect(wrapper.emitted('close')?.length).toBe(1);
    wrapper.unmount();
  });

  it('ignores messages for a different botId', async () => {
    const wrapper = mount(AgentDeskWidget, { props: { botId: 'my-bot' } });

    messageListeners[0](
      new MessageEvent('message', {
        ...SAME_ORIGIN_EVENT,
        data: { type: 'agentdesk-widget-open', botId: 'some-other-bot' },
      }),
    );
    await nextTick();
    expect(wrapper.emitted('open')).toBeUndefined();
    wrapper.unmount();
  });

  it('sends postMessage when mode changes', async () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    const wrapper = mount(AgentDeskWidget, {
      props: { botId: 'mode-bot', mode: 'launcher' },
    });
    expect(postMessageSpy).not.toHaveBeenCalled();

    await wrapper.setProps({ mode: 'inline' });
    await nextTick();

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: 'agentdesk-set-mode', botId: 'mode-bot', mode: 'inline' },
      window.location.origin,
    );
    postMessageSpy.mockRestore();
    wrapper.unmount();
  });

  it('ignores events from a different origin', async () => {
    const wrapper = mount(AgentDeskWidget, { props: { botId: 'origin-bot' } });

    // First verify same-origin events work
    messageListeners[0](
      new MessageEvent('message', {
        ...SAME_ORIGIN_EVENT,
        data: { type: 'agentdesk-widget-open', botId: 'origin-bot' },
      }),
    );
    await nextTick();
    expect(wrapper.emitted('open')?.length).toBe(1);

    // Now fire from a different origin — should be ignored
    messageListeners[0](
      new MessageEvent('message', {
        origin: 'https://evil-site.com',
        data: { type: 'agentdesk-widget-open', botId: 'origin-bot' },
      }),
    );
    await nextTick();
    expect(wrapper.emitted('open')?.length).toBe(1);

    wrapper.unmount();
  });

  it('supports mount/unmount/remount cycle (keep-alive resiliency)', () => {
    // Simulates the pattern that KeepAlive uses: mount → deactivate → activate
    const a = mount(AgentDeskWidget, { props: { botId: 'cycle-bot' } });
    expect(document.querySelectorAll('script[data-agentdesk]').length).toBe(1);

    a.unmount();
    expect(document.querySelectorAll('script[data-agentdesk]').length).toBe(0);

    // Re-mount — should inject a fresh script
    const b = mount(AgentDeskWidget, { props: { botId: 'cycle-bot' } });
    expect(document.querySelectorAll('script[data-agentdesk]').length).toBe(1);

    b.unmount();
    expect(document.querySelectorAll('script[data-agentdesk]').length).toBe(0);
  });

  it('is SSR-safe — renders hidden span without accessing window', () => {
    const wrapper = mount(AgentDeskWidget, { props: { botId: 'ssr-bot' } });
    const host = wrapper.find('[data-agentdesk-vue-host]');
    expect(host.exists()).toBe(true);
    expect(host.attributes('aria-hidden')).toBe('true');
    expect(host.attributes('style')).toMatch(/display\s*:\s*none/);
    wrapper.unmount();
  });

  it('allows events from origins matching apiOrigin or scriptSrc', async () => {
    const wrapper = mount(AgentDeskWidget, {
      props: {
        botId: 'custom-origin-bot',
        apiOrigin: 'https://api.custom-desk.com',
        scriptSrc: 'https://widget.custom-desk.com/sdk.js',
      },
    });

    expect(messageListeners.length).toBeGreaterThan(0);

    // Test message from apiOrigin
    messageListeners[0](
      new MessageEvent('message', {
        origin: 'https://api.custom-desk.com',
        data: { type: 'agentdesk-widget-open', botId: 'custom-origin-bot' },
      }),
    );
    await nextTick();
    expect(wrapper.emitted('open')?.length).toBe(1);

    // Test message from scriptSrc origin
    messageListeners[0](
      new MessageEvent('message', {
        origin: 'https://widget.custom-desk.com',
        data: { type: 'agentdesk-widget-open', botId: 'custom-origin-bot' },
      }),
    );
    await nextTick();
    expect(wrapper.emitted('open')?.length).toBe(2);

    // Test message from untrusted origin
    messageListeners[0](
      new MessageEvent('message', {
        origin: 'https://evil-site.com',
        data: { type: 'agentdesk-widget-open', botId: 'custom-origin-bot' },
      }),
    );
    await nextTick();
    expect(wrapper.emitted('open')?.length).toBe(2);

    wrapper.unmount();
  });


  it('injects scripts with default same-origin endpoints', () => {
    const wrapper = mount(AgentDeskWidget, { props: { botId: 'saas-bot' } });
    const script = document.querySelector('script[data-agentdesk]') as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.getAttribute('src')).toBe('/widget.js');
    expect(script.dataset.apiOrigin).toBeUndefined();
    wrapper.unmount();
  });

  it('injects optional attributes on the script element', () => {
    const wrapper = mount(AgentDeskWidget, {
      props: {
        botId: 'attrs-bot',
        theme: 'webchat-v1',
        cspNonce: 'xyz123',
        position: 'bottom-left',
        className: 'my-custom-container',
      },
    });
    const script = document.querySelector('script[data-agentdesk]') as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.dataset.theme).toBe('webchat-v1');
    expect(script.dataset.cspNonce).toBe('xyz123');
    expect(script.getAttribute('nonce')).toBe('xyz123');
    expect(script.dataset.position).toBe('bottom-left');
    expect(script.dataset.className).toBe('my-custom-container');
    wrapper.unmount();
  });

  it('emits all new lifecycle events correctly', async () => {
    const wrapper = mount(AgentDeskWidget, { props: { botId: 'callbacks-bot' } });
    expect(messageListeners.length).toBeGreaterThan(0);

    messageListeners[0](
      new MessageEvent('message', {
        ...SAME_ORIGIN_EVENT,
        data: { type: 'agentdesk-widget-ready', botId: 'callbacks-bot' },
      }),
    );
    messageListeners[0](
      new MessageEvent('message', {
        ...SAME_ORIGIN_EVENT,
        data: { type: 'agentdesk-widget-error', botId: 'callbacks-bot', message: 'Fail' },
      }),
    );
    messageListeners[0](
      new MessageEvent('message', {
        ...SAME_ORIGIN_EVENT,
        data: { type: 'agentdesk-widget-message-sent', botId: 'callbacks-bot', text: 'hi' },
      }),
    );
    messageListeners[0](
      new MessageEvent('message', {
        ...SAME_ORIGIN_EVENT,
        data: { type: 'agentdesk-widget-injected', botId: 'callbacks-bot' },
      }),
    );

    await nextTick();
    expect(wrapper.emitted('ready')?.length).toBe(1);
    expect(wrapper.emitted('error')?.[0]).toEqual([{ message: 'Fail' }]);
    expect(wrapper.emitted('message-sent')?.[0]).toEqual([{ text: 'hi' }]);
    expect(wrapper.emitted('injected')?.length).toBe(1);
    wrapper.unmount();
  });

  it('ignores messages with an unknown shape', async () => {
    const wrapper = mount(AgentDeskWidget, { props: { botId: 'shape-bot' } });

    messageListeners[0](new MessageEvent('message', { ...SAME_ORIGIN_EVENT, data: null }));
    messageListeners[0](
      new MessageEvent('message', { ...SAME_ORIGIN_EVENT, data: 'not-an-object' }),
    );
    messageListeners[0](
      new MessageEvent('message', { ...SAME_ORIGIN_EVENT, data: { type: 'unrelated' } }),
    );
    await nextTick();
    expect(wrapper.emitted('open')).toBeUndefined();
    expect(wrapper.emitted('close')).toBeUndefined();
    wrapper.unmount();
  });

  it('allows multiple Vue components with the same botId to receive lifecycle events', async () => {
    const wrapper1 = mount(AgentDeskWidget, { props: { botId: 'shared-event-bot-vue' } });
    const wrapper2 = mount(AgentDeskWidget, { props: { botId: 'shared-event-bot-vue' } });

    expect(messageListeners.length).toBeGreaterThan(0);

    messageListeners[0](
      new MessageEvent('message', {
        ...SAME_ORIGIN_EVENT,
        data: { type: 'agentdesk-widget-open', botId: 'shared-event-bot-vue' },
      }),
    );
    await nextTick();

    expect(wrapper1.emitted('open')?.length).toBe(1);
    expect(wrapper2.emitted('open')?.length).toBe(1);

    wrapper1.unmount();
    wrapper2.unmount();
  });

  it('updates script dataset and custom element attributes when position or className props change', async () => {
    const wrapper = mount(AgentDeskWidget, {
      props: {
        botId: 'styling-bot',
        position: 'bottom-left',
        className: 'first-class',
      },
    });

    // Manually create the widget element in the mock DOM, as the widget.js script would usually do
    const mockWidgetEl = document.createElement('agentdesk-widget');
    mockWidgetEl.setAttribute('data-bot-id', 'styling-bot');
    document.body.appendChild(mockWidgetEl);

    // Update props
    await wrapper.setProps({
      position: 'top-right',
      className: 'second-class',
    });
    await nextTick();

    const script = document.querySelector('script[data-agentdesk]') as HTMLScriptElement;
    expect(script).not.toBeNull();
    expect(script.dataset.position).toBe('top-right');
    expect(script.dataset.className).toBe('second-class');

    expect(mockWidgetEl.className).toBe('second-class');
    expect(mockWidgetEl.getAttribute('data-agentdesk-position')).toBe('top-right');

    wrapper.unmount();
    mockWidgetEl.remove();
  });
});

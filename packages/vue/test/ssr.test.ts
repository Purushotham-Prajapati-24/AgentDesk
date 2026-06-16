// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from '@vue/server-renderer';
import { defineComponent, h } from 'vue';
import { AgentDeskWidget } from '../src/index';

describe('AgentDeskWidget SSR (Vue)', () => {
  it('renders without throwing and emits an SSR warning when window is undefined', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      // Wrap the component in a minimal host so renderToString can drive it.
      const App = defineComponent({
        render() {
          return h(AgentDeskWidget, { botId: 'ssr-warn-bot', mode: 'launcher' });
        },
      });

      // renderToString exercises the full Vue SSR lifecycle (setup → render) in
      // a Node environment where window is undefined.  It should not throw; the
      // component is expected to return null and emit a console warning.
      const html = await renderToString(h(App));

      // The component bails out in SSR and returns null, so the output is empty.
      expect(html).toBe('<!---->');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('AgentDeskWidget was initialized in a non-browser environment'),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});

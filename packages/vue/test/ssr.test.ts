// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { AgentDeskWidget } from '../src/index';

describe('AgentDeskWidget SSR (Vue)', () => {
  it('logs a warning when window is undefined', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const setupResult = (AgentDeskWidget.setup as (
        props: { botId: string; mode?: string },
        ctx: { emit: (...args: unknown[]) => void }
      ) => () => unknown)({ botId: 'ssr-warn-bot', mode: 'launcher' }, { emit: () => {} });
      expect(setupResult()).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("AgentDeskWidget was initialized in a non-browser environment")
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});

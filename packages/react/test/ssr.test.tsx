// @vitest-environment node
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { AgentDeskWidget } from '../src/index';

describe('AgentDeskWidget SSR', () => {
  it('logs a warning and returns null when window is undefined', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const html = renderToString(<AgentDeskWidget botId="ssr-bot" />);
      expect(html).toBe('');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("AgentDeskWidget was rendered on the server")
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});

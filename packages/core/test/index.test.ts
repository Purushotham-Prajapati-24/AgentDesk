import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  acquireInstance,
  releaseInstance,
  getEntry,
  getActiveBotIds,
  postSetMode,
  type AgentDeskWidgetGlobals,
} from '../src/index';

describe('AgentDesk Core Shared Types & Registry', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      const windowRef = window as unknown as AgentDeskWidgetGlobals;
      delete windowRef.__agentdeskWidgetInstances;
      delete windowRef.__agentdeskGlobalListenerCount;
    }
  });

  it('acquires and releases instances correctly with ref-counting', () => {
    // Acquire first instance for bot-a
    const acq1 = acquireInstance('bot-a', 'launcher');
    expect(acq1.isFirstForBot).toBe(true);
    expect(acq1.mustInstallListener).toBe(true);
    expect(acq1.modeChanged).toBe(false);
    expect(acq1.entry.count).toBe(1);
    expect(acq1.entry.mode).toBe('launcher');

    // Acquire second instance for bot-a (same mode)
    const acq2 = acquireInstance('bot-a', 'launcher');
    expect(acq2.isFirstForBot).toBe(false);
    expect(acq2.mustInstallListener).toBe(false);
    expect(acq2.modeChanged).toBe(false);
    expect(acq2.entry.count).toBe(2);

    // Acquire instance for bot-a with different mode
    const acq3 = acquireInstance('bot-a', 'inline');
    expect(acq3.isFirstForBot).toBe(false);
    expect(acq3.mustInstallListener).toBe(false);
    expect(acq3.modeChanged).toBe(true);
    expect(acq3.entry.count).toBe(3);
    expect(acq3.entry.mode).toBe('inline');

    // Release first instance
    const rel1 = releaseInstance('bot-a');
    expect(rel1.isLastForBot).toBe(false);
    expect(rel1.mustRemoveListener).toBe(false);

    // Release second instance
    const rel2 = releaseInstance('bot-a');
    expect(rel2.isLastForBot).toBe(false);
    expect(rel2.mustRemoveListener).toBe(false);

    // Release final instance
    const rel3 = releaseInstance('bot-a');
    expect(rel3.isLastForBot).toBe(true);
    expect(rel3.mustRemoveListener).toBe(true);
  });

  it('manages registry getEntry and getActiveBotIds', () => {
    expect(getActiveBotIds()).toEqual([]);
    expect(getEntry('bot-b')).toBeUndefined();

    acquireInstance('bot-b', 'launcher');
    acquireInstance('bot-c', 'inline');

    expect(getActiveBotIds()).toEqual(['bot-b', 'bot-c']);
    expect(getEntry('bot-b')).toEqual({ count: 1, mode: 'launcher' });
    expect(getEntry('bot-c')).toEqual({ count: 1, mode: 'inline' });

    releaseInstance('bot-b');
    expect(getActiveBotIds()).toEqual(['bot-c']);

    releaseInstance('bot-c');
    expect(getActiveBotIds()).toEqual([]);
  });

  it('postSetMode dispatches window message events', () => {
    const postSpy = vi.spyOn(window, 'postMessage');
    postSetMode('bot-d', 'inline');
    expect(postSpy).toHaveBeenCalledWith(
      { type: 'agentdesk-set-mode', botId: 'bot-d', mode: 'inline' },
      window.location.origin
    );
    postSpy.mockRestore();
  });
});

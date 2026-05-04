// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from './history-store';
import type { HistoricalRun } from '@/components/ui/auto-trader/types';

function makeRun(id: string, overrides: Partial<HistoricalRun> = {}): HistoricalRun {
  return {
    id,
    timestamp: Date.now(),
    status: 'completed',
    plan: null,
    decisions: null,
    analystSignals: null,
    orderResults: [],
    selectedAgents: [],
    modelName: 'gpt-4o-mini',
    ...overrides,
  } as HistoricalRun;
}

describe('useHistoryStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useHistoryStore.setState({ runs: [] });
  });

  it('starts with an empty list', () => {
    expect(useHistoryStore.getState().runs).toEqual([]);
  });

  it('addRun prepends new entries (newest first)', () => {
    const { addRun } = useHistoryStore.getState();
    addRun(makeRun('a'));
    addRun(makeRun('b'));
    addRun(makeRun('c'));
    expect(useHistoryStore.getState().runs.map(r => r.id)).toEqual(['c', 'b', 'a']);
  });

  it('caps the list at 50 entries (MAX_RUNS)', () => {
    const { addRun } = useHistoryStore.getState();
    for (let i = 0; i < 60; i++) addRun(makeRun(`run-${i}`));
    const runs = useHistoryStore.getState().runs;
    expect(runs).toHaveLength(50);
    // Newest at top, oldest dropped
    expect(runs[0].id).toBe('run-59');
    expect(runs[49].id).toBe('run-10');
  });

  it('updateRun patches the matching run only', () => {
    const { addRun, updateRun } = useHistoryStore.getState();
    addRun(makeRun('a', { status: 'running' }));
    addRun(makeRun('b', { status: 'running' }));
    updateRun('a', { status: 'completed' });
    const runs = useHistoryStore.getState().runs;
    expect(runs.find(r => r.id === 'a')?.status).toBe('completed');
    expect(runs.find(r => r.id === 'b')?.status).toBe('running');
  });

  it('updateRun is a no-op when id does not exist', () => {
    const { addRun, updateRun } = useHistoryStore.getState();
    addRun(makeRun('a'));
    updateRun('missing', { status: 'failed' });
    expect(useHistoryStore.getState().runs).toHaveLength(1);
    expect(useHistoryStore.getState().runs[0].id).toBe('a');
  });

  it('deleteRun removes a single entry by id', () => {
    const { addRun, deleteRun } = useHistoryStore.getState();
    addRun(makeRun('a'));
    addRun(makeRun('b'));
    deleteRun('a');
    expect(useHistoryStore.getState().runs.map(r => r.id)).toEqual(['b']);
  });

  it('clearAll empties the list', () => {
    const { addRun, clearAll } = useHistoryStore.getState();
    addRun(makeRun('a'));
    addRun(makeRun('b'));
    clearAll();
    expect(useHistoryStore.getState().runs).toEqual([]);
  });
});

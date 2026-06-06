import { describe, it, expect } from 'vitest';
import { applyProgressEvent } from './applyProgressEvent';
import type { LogEntry } from '../types';

describe('applyProgressEvent', () => {
  it('appends a running log when result is absent', () => {
    const logs: LogEntry[] = [];
    const next = applyProgressEvent(
      logs,
      { agent: 'warren_buffett_agent', ticker: 'AAPL', status: 'Fetching financial metrics' },
      'p-1',
    );
    expect(next).toHaveLength(1);
    expect(next[0].status).toBe('running');
    expect(next[0].detail).toBe('Fetching financial metrics');
  });

  it('appends an ok row when analysis is present but result is absent (legacy "Done" event)', () => {
    const next = applyProgressEvent([], {
      agent: 'warren_buffett_agent', ticker: 'AAPL', status: 'Done', analysis: 'Stable cash flows, good ROE.',
    }, 'p-1');
    expect(next).toHaveLength(1);
    expect(next[0].status).toBe('ok');
  });

  it('flips the matching running row to ok when result=ok', () => {
    const running = applyProgressEvent([], {
      agent: 'warren_buffett_agent', ticker: 'AAPL', status: 'Fetching financial metrics',
    }, 'p-1');
    const done = applyProgressEvent(running, {
      agent: 'warren_buffett_agent', ticker: 'AAPL', status: 'Fetching financial metrics', result: 'ok',
    }, 'p-2');
    expect(done).toHaveLength(1);
    expect(done[0].status).toBe('ok');
  });

  it('flips to warn when result=empty', () => {
    const running = applyProgressEvent([], {
      agent: 'warren_buffett_agent', ticker: 'AAPL', status: 'Fetching financial metrics',
    }, 'p-1');
    const done = applyProgressEvent(running, {
      agent: 'warren_buffett_agent', ticker: 'AAPL', status: 'Fetching financial metrics', result: 'empty',
    }, 'p-2');
    expect(done[0].status).toBe('warn');
  });

  it('flips to error when result=error', () => {
    const running = applyProgressEvent([], {
      agent: 'warren_buffett_agent', ticker: 'AAPL', status: 'Fetching financial metrics',
    }, 'p-1');
    const done = applyProgressEvent(running, {
      agent: 'warren_buffett_agent', ticker: 'AAPL', status: 'Fetching financial metrics', result: 'error',
    }, 'p-2');
    expect(done[0].status).toBe('error');
  });

  it('appends a row defensively if no matching running log exists', () => {
    const next = applyProgressEvent([], {
      agent: 'warren_buffett_agent', ticker: 'AAPL', status: 'Fetching financial metrics', result: 'ok',
    }, 'p-1');
    expect(next).toHaveLength(1);
    expect(next[0].status).toBe('ok');
  });

  it('does not collapse rows that share status but belong to different tickers', () => {
    const a = applyProgressEvent([], {
      agent: 'warren_buffett_agent', ticker: 'AAPL', status: 'Fetching financial metrics',
    }, 'p-1');
    const b = applyProgressEvent(a, {
      agent: 'warren_buffett_agent', ticker: 'MSFT', status: 'Fetching financial metrics',
    }, 'p-2');
    const ok = applyProgressEvent(b, {
      agent: 'warren_buffett_agent', ticker: 'AAPL', status: 'Fetching financial metrics', result: 'ok',
    }, 'p-3');
    expect(ok).toHaveLength(2);
    expect(ok.find(l => l.ticker === 'AAPL')!.status).toBe('ok');
    expect(ok.find(l => l.ticker === 'MSFT')!.status).toBe('running');
  });
});

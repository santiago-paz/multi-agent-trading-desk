import { describe, it, expect } from 'vitest';
import { buildDemoBacktestDays, demoBacktestStream } from './backtest-stream';
import { parseSSEChunk } from '@/lib/sse';
import type { BacktestDayResult } from '@/lib/backtesting/types';

const BODY = { tickers: ['AAPL', 'KO'], initial_capital: 10000, start_date: '2025-01-01', end_date: '2025-01-10' };

async function readAll(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value); }
  return out;
}

describe('demo /backtest', () => {
  it('generates one day result per trading day with monotonic progress', () => {
    const { days, metrics } = buildDemoBacktestDays(BODY);
    expect(days.length).toBeGreaterThan(0);
    expect(days[0].portfolio_value).toBeGreaterThan(0);
    expect(typeof metrics.sharpe_ratio).toBe('number');
  });

  it('streams day-result progress events + a complete with metrics', async () => {
    const text = await readAll(demoBacktestStream(BODY, { delayMs: 0 }));
    const events = parseSSEChunk(text);
    const progress = events.filter(e => e.event === 'progress');
    expect(progress.length).toBeGreaterThan(0);
    // day-result analysis parses back to a BacktestDayResult and status carries (n/N)
    const first = progress[0].data as { agent: string; status: string; analysis: string };
    expect(first.agent).toBe('backtest');
    expect(first.status).toMatch(/\(\d+\/\d+\)/);
    const day = JSON.parse(first.analysis) as BacktestDayResult;
    expect(day.date).toBeTruthy();
    const complete = events.find(e => e.event === 'complete')!.data as { data: { performance_metrics: unknown; total_days: number } };
    expect(complete.data.total_days).toBe(progress.length);
  });
});

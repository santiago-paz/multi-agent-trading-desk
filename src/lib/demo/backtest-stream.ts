import { hashString } from './seed';
import { sseEvent, pacedStream, type PacedItem } from './sse';
import type { BacktestDayResult, PerformanceMetrics } from '@/lib/backtesting/types';

export interface DemoBacktestBody {
  tickers?: string[];
  initial_capital?: number;
  start_date?: string;
  end_date?: string;
}

/** Trading days (Mon–Fri) between two ISO dates, capped for a snappy demo. */
function tradingDays(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const start = new Date(startISO + 'T00:00:00Z');
  const end = new Date(endISO + 'T00:00:00Z');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return out;
  const d = new Date(start);
  while (d <= end && out.length < 120) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function buildDemoBacktestDays(body: DemoBacktestBody): { days: BacktestDayResult[]; metrics: PerformanceMetrics } {
  const tickers = body.tickers ?? ['AAPL'];
  const initial = body.initial_capital ?? 10000;
  const dates = tradingDays(body.start_date ?? '2025-01-01', body.end_date ?? '2025-03-01');

  let value = initial;
  let peak = initial;
  let maxDrawdown = 0;
  let maxDrawdownDate = dates[0] ?? '';
  const days: BacktestDayResult[] = [];

  dates.forEach((date, i) => {
    // Deterministic drift + seeded noise around a mild uptrend.
    const noise = ((hashString(`${date}:${i}`) % 1000) / 1000 - 0.45) * 0.02;
    value = Math.round(value * (1 + 0.0008 + noise) * 100) / 100;
    if (value > peak) peak = value;
    const dd = (peak - value) / peak;
    if (dd > maxDrawdown) { maxDrawdown = dd; maxDrawdownDate = date; }

    const current_prices: Record<string, number> = {};
    for (const t of tickers) current_prices[t] = 50 + (hashString(`${t}:${date}`) % 400);

    days.push({
      date,
      portfolio_value: value,
      cash: Math.round(value * 0.15 * 100) / 100,
      decisions: {},
      executed_trades: {},
      analyst_signals: {},
      current_prices,
      long_exposure: Math.round(value * 0.85 * 100) / 100,
      short_exposure: 0,
      gross_exposure: Math.round(value * 0.85 * 100) / 100,
      net_exposure: Math.round(value * 0.85 * 100) / 100,
    });
  });

  const totalReturn = initial > 0 ? (value - initial) / initial : 0;
  const metrics: PerformanceMetrics = {
    sharpe_ratio: Math.round((1.2 + totalReturn) * 100) / 100,
    sortino_ratio: Math.round((1.6 + totalReturn) * 100) / 100,
    max_drawdown: Math.round(-maxDrawdown * 1000) / 10, // percent, negative
    max_drawdown_date: maxDrawdownDate,
    gross_exposure: days.length ? days[days.length - 1].gross_exposure : 0,
    net_exposure: days.length ? days[days.length - 1].net_exposure : 0,
  };

  return { days, metrics };
}

export function demoBacktestStream(body: DemoBacktestBody, opts: { delayMs?: number } = {}): Response {
  const delayMs = opts.delayMs ?? 20;
  const { days, metrics } = buildDemoBacktestDays(body);

  const items: PacedItem[] = [];
  items.push({ chunk: sseEvent('start', {}), delayMs });
  days.forEach((day, i) => {
    items.push({
      chunk: sseEvent('progress', {
        agent: 'backtest',
        status: `Completed ${day.date} (${i + 1}/${days.length}) - Portfolio: $${day.portfolio_value}`,
        analysis: JSON.stringify(day),
      }),
      delayMs,
    });
  });
  items.push({
    chunk: sseEvent('complete', { data: { performance_metrics: metrics, total_days: days.length } }),
    delayMs: 0,
  });

  return new Response(pacedStream(items), {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform' },
  });
}

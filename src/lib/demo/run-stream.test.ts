import { describe, it, expect } from 'vitest';
import { buildDemoRunPayload, demoRunStream, stepDelayMs } from './run-stream';
import { parseSSEChunk } from '@/lib/sse';

const BODY = {
  tickers: ['AAPL', 'KO', 'NVDA'],
  graph_nodes: [
    { id: 'warren_buffett' },
    { id: 'technical_analyst' },
    { id: 'portfolio_manager_ab12cd' },
  ],
};

async function readAll(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value); }
  return out;
}

describe('demo /run', () => {
  it('builds decisions + signals for exactly the requested tickers', () => {
    const p = buildDemoRunPayload(BODY);
    expect(Object.keys(p.decisions).sort()).toEqual(['AAPL', 'KO', 'NVDA']);
    // one signal record per selected agent, plus the risk manager
    expect(p.analyst_signals['warren_buffett']).toBeTruthy();
    expect(p.analyst_signals['risk_management_agent_ab12cd']).toBeTruthy();
    const risk = p.analyst_signals['risk_management_agent_ab12cd'] as Record<string, { current_price: number }>;
    expect(risk['AAPL'].current_price).toBeGreaterThan(0);
  });

  it('streams start -> progress -> complete, round-trippable', async () => {
    const text = await readAll(demoRunStream(BODY, { delayMs: 0 }));
    const events = parseSSEChunk(text);
    const kinds = events.map(e => e.event);
    expect(kinds[0]).toBe('start');
    expect(kinds).toContain('progress');
    expect(kinds[kinds.length - 1]).toBe('complete');
    const complete = events[events.length - 1].data as { data: { decisions: Record<string, unknown> } };
    expect(Object.keys(complete.data.decisions)).toContain('NVDA');
  });

  it('walks each agent through its real step sequence and ends with the reasoning', async () => {
    const text = await readAll(demoRunStream(BODY, { delayMs: 0 }));
    const events = parseSSEChunk(text).filter(e => e.event === 'progress');
    const buffett = events
      .map(e => e.data as { agent: string; ticker: string; status: string; analysis?: string; result?: string })
      .filter(d => d.agent === 'warren_buffett' && d.ticker === 'KO');

    // More than one step per agent+ticker. That's what makes the demo watchable.
    expect(buffett.length).toBeGreaterThan(5);
    expect(buffett.map(d => d.status)).toContain('Analyzing competitive moat');
    // Fetch steps are emitted twice: running, then with a result.
    expect(buffett.filter(d => d.status === 'Getting market cap')).toHaveLength(2);
    expect(buffett.filter(d => d.result === 'ok').length).toBeGreaterThan(0);

    // The last event carries the prose and NO result, so the frontend flags it
    // as the analysis log and renders the persona card.
    const last = buffett[buffett.length - 1];
    expect(last.status).toBe('Done');
    expect(last.result).toBeUndefined();
    expect(last.analysis).toContain('KO');
  });

  it('signal reasoning matches the streamed analysis', async () => {
    const payload = buildDemoRunPayload(BODY);
    const text = await readAll(demoRunStream(BODY, { delayMs: 0 }));
    const done = parseSSEChunk(text)
      .filter(e => e.event === 'progress')
      .map(e => e.data as { agent: string; ticker: string; status: string; analysis?: string })
      .find(d => d.agent === 'warren_buffett' && d.ticker === 'AAPL' && d.status === 'Done');
    const signal = (payload.analyst_signals['warren_buffett'] as Record<string, { reasoning: string }>)['AAPL'];
    expect(done?.analysis).toBe(signal.reasoning);
  });

  it('paces the stream toward a target duration, within bounds', () => {
    // Few events: capped so a one-ticker run doesn't crawl.
    expect(stepDelayMs(10, 60_000)).toBe(650);
    // Many events: floored so a 20-ticker run still finishes.
    expect(stepDelayMs(10_000, 60_000)).toBe(45);
    // In between: spread across the target.
    expect(stepDelayMs(300, 60_000)).toBe(200);
  });
});

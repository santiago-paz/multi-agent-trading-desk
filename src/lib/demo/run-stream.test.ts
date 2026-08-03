import { describe, it, expect } from 'vitest';
import { buildDemoRunPayload, demoRunStream } from './run-stream';
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
});

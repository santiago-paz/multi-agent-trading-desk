import { describe, it, expect } from 'vitest';
import { sseEvent, pacedStream } from './sse';
import { parseSSEChunk } from '@/lib/sse';

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value); }
  return out;
}

describe('demo sse helpers', () => {
  it('sseEvent produces a parseable event block', () => {
    const block = sseEvent('progress', { agent: 'x', status: 'done' });
    const [evt] = parseSSEChunk(block);
    expect(evt.event).toBe('progress');
    expect(evt.data).toEqual({ agent: 'x', status: 'done' });
  });

  it('pacedStream emits all chunks in order and round-trips', async () => {
    const items = [
      { chunk: sseEvent('start', {}), delayMs: 0 },
      { chunk: sseEvent('progress', { n: 1 }), delayMs: 0 },
      { chunk: sseEvent('complete', { data: { ok: true } }), delayMs: 0 },
    ];
    const text = await readAll(pacedStream(items));
    const events = parseSSEChunk(text);
    expect(events.map(e => e.event)).toEqual(['start', 'progress', 'complete']);
  });
});

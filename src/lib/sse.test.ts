import { describe, it, expect } from 'vitest';
import { parseSSEChunk } from './sse';

describe('parseSSEChunk', () => {
  it('parses a single event/data block', () => {
    expect(parseSSEChunk('event: ping\ndata: {"v":1}\n\n')).toEqual([
      { event: 'ping', data: { v: 1 } },
    ]);
  });

  it('parses multiple blocks separated by blank lines, preserving order', () => {
    const text =
      'event: start\ndata: {"id":"x"}\n\n' +
      'event: tick\ndata: 1\n\n' +
      'event: end\ndata: "done"\n\n';
    expect(parseSSEChunk(text)).toEqual([
      { event: 'start', data: { id: 'x' } },
      { event: 'tick', data: 1 },
      { event: 'end', data: 'done' },
    ]);
  });

  it('skips blocks missing event or data', () => {
    const text =
      'event: only\n\n' +              // no data
      'data: 42\n\n' +                  // no event
      'event: full\ndata: 1\n\n';
    expect(parseSSEChunk(text)).toEqual([{ event: 'full', data: 1 }]);
  });

  it('drops blocks with malformed JSON without throwing', () => {
    const text =
      'event: bad\ndata: not-json\n\n' +
      'event: good\ndata: {"ok":1}\n\n';
    expect(parseSSEChunk(text)).toEqual([{ event: 'good', data: { ok: 1 } }]);
  });

  it('returns [] for empty input', () => {
    expect(parseSSEChunk('')).toEqual([]);
  });

  it('ignores blocks made only of whitespace', () => {
    expect(parseSSEChunk('\n\n   \n\n')).toEqual([]);
  });
});

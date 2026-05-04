import { describe, it, expect } from 'vitest';
import { fmtARS, fmtARS2, remapToIol } from './utils';

describe('fmtARS', () => {
  it('formats integers with es-AR thousand separators', () => {
    expect(fmtARS(1234567)).toBe('1.234.567');
  });

  it('rounds to 0 decimal places', () => {
    expect(fmtARS(1234.78)).toBe('1.235');
  });

  it('handles zero and negatives', () => {
    expect(fmtARS(0)).toBe('0');
    expect(fmtARS(-1500)).toBe('-1.500');
  });
});

describe('fmtARS2', () => {
  it('always renders exactly two decimal places', () => {
    expect(fmtARS2(1)).toBe('1,00');
    expect(fmtARS2(1.5)).toBe('1,50');
    expect(fmtARS2(1234.567)).toBe('1.234,57');
  });
});

describe('remapToIol', () => {
  it('translates FMP-keyed entries to IOL symbols', () => {
    const result = remapToIol(
      { AAPL: 100, KO: 50, XRX: 25 },
      { AAPL: 'AAPL', KO: 'KOC', XRX: 'XROX' },
    );
    expect(result).toEqual({ AAPL: 100, KOC: 50, XROX: 25 });
  });

  it('passes through keys not present in the map', () => {
    const result = remapToIol({ FOO: 1, BAR: 2 }, { FOO: 'FOOC' });
    expect(result).toEqual({ FOOC: 1, BAR: 2 });
  });

  it('returns an empty object for empty input', () => {
    expect(remapToIol({}, { AAPL: 'AAPLC' })).toEqual({});
  });

  it('preserves value identity for object values', () => {
    const obj = { foo: 'bar' };
    const result = remapToIol({ AAPL: obj }, { AAPL: 'AAPLC' });
    expect(result.AAPLC).toBe(obj);
  });
});

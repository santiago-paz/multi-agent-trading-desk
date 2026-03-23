import { describe, it, expect } from 'vitest';
import {
  stripCurrencySuffix,
  toFmpTicker,
  buildFmpToIolMap,
  deduplicateIolSymbols,
} from './cedear-map';

// ── stripCurrencySuffix ─────────────────────────────────────────────────────

describe('stripCurrencySuffix', () => {
  it('strips C suffix (pesos)', () => {
    expect(stripCurrencySuffix('AAPLC')).toBe('AAPL');
  });

  it('strips D suffix (dollars)', () => {
    expect(stripCurrencySuffix('AAPLD')).toBe('AAPL');
  });

  it('returns symbol unchanged when no C/D suffix', () => {
    expect(stripCurrencySuffix('AAPL')).toBe('AAPL');
  });

  it('does not strip C/D from single-character symbols', () => {
    expect(stripCurrencySuffix('C')).toBe('C');
    expect(stripCurrencySuffix('D')).toBe('D');
  });

  it('does not strip lowercase c/d', () => {
    expect(stripCurrencySuffix('AAPLc')).toBe('AAPLc');
  });

  it('handles empty string', () => {
    expect(stripCurrencySuffix('')).toBe('');
  });

  it('handles symbols ending in C that are real tickers (length > 1)', () => {
    // "KOC" → strips to "KO" — this is expected behavior since
    // IOL always appends C/D to CEDEAR symbols
    expect(stripCurrencySuffix('KOC')).toBe('KO');
  });
});

// ── toFmpTicker ─────────────────────────────────────────────────────────────

describe('toFmpTicker', () => {
  it('returns identity for standard tickers', () => {
    expect(toFmpTicker('AAPL')).toBe('AAPL');
    expect(toFmpTicker('TSLA')).toBe('TSLA');
    expect(toFmpTicker('KO')).toBe('KO');
  });

  it('maps XROX → XRX (known exception)', () => {
    expect(toFmpTicker('XROX')).toBe('XRX');
  });

  it('returns null for CSNA3 (no US equivalent)', () => {
    expect(toFmpTicker('CSNA3')).toBeNull();
  });

  it('strips C/D suffix before mapping', () => {
    expect(toFmpTicker('XROXC')).toBe('XRX');
    expect(toFmpTicker('XROXD')).toBe('XRX');
    expect(toFmpTicker('CSNA3C')).toBeNull();
  });

  it('handles standard ticker with C/D suffix', () => {
    expect(toFmpTicker('AAPLC')).toBe('AAPL');
    expect(toFmpTicker('AAPLD')).toBe('AAPL');
  });
});

// ── buildFmpToIolMap ────────────────────────────────────────────────────────

describe('buildFmpToIolMap', () => {
  it('maps FMP ticker back to IOL base for exceptions', () => {
    const map = buildFmpToIolMap(['XROXC', 'XROXD', 'AAPLC']);
    expect(map.get('XRX')).toBe('XROX');
  });

  it('does not include identity mappings', () => {
    const map = buildFmpToIolMap(['AAPLC', 'KOD', 'TSLA']);
    // AAPL → AAPL is identity, should NOT be in map
    expect(map.has('AAPL')).toBe(false);
    expect(map.has('KO')).toBe(false);
    expect(map.has('TSLA')).toBe(false);
  });

  it('skips null FMP tickers', () => {
    const map = buildFmpToIolMap(['CSNA3C']);
    expect(map.size).toBe(0);
  });

  it('returns empty map for empty input', () => {
    const map = buildFmpToIolMap([]);
    expect(map.size).toBe(0);
  });
});

// ── deduplicateIolSymbols ───────────────────────────────────────────────────

describe('deduplicateIolSymbols', () => {
  it('collapses C/D variants into single base symbol', () => {
    expect(deduplicateIolSymbols(['AAPLC', 'AAPLD'])).toEqual(['AAPL']);
  });

  it('preserves insertion order (first occurrence wins)', () => {
    const result = deduplicateIolSymbols(['KOD', 'AAPLC', 'KOC', 'AAPLD', 'TSLAC']);
    expect(result).toEqual(['KO', 'AAPL', 'TSLA']);
  });

  it('handles symbols without suffix', () => {
    expect(deduplicateIolSymbols(['AAPL', 'TSLA'])).toEqual(['AAPL', 'TSLA']);
  });

  it('handles mixed suffixed and unsuffixed', () => {
    expect(deduplicateIolSymbols(['AAPL', 'AAPLC'])).toEqual(['AAPL']);
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateIolSymbols([])).toEqual([]);
  });
});

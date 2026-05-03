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

  it('strips KOC → KO (typical currency-variant pattern)', () => {
    expect(stripCurrencySuffix('KOC')).toBe('KO');
  });

  it('does NOT strip natural tickers ending in C/D registered in IOL_TO_FMP', () => {
    // These are real US tickers that already end in C or D — IOL lists them
    // bare (no currency suffix), so stripping would map to the wrong company.
    expect(stripCurrencySuffix('JD')).toBe('JD');     // JD.com (was being stripped to "J" = Jacobs)
    expect(stripCurrencySuffix('HD')).toBe('HD');     // Home Depot
    expect(stripCurrencySuffix('AMD')).toBe('AMD');   // Advanced Micro Devices
    expect(stripCurrencySuffix('BBD')).toBe('BBD');   // Banco Bradesco
    expect(stripCurrencySuffix('DD')).toBe('DD');     // DuPont
    expect(stripCurrencySuffix('GILD')).toBe('GILD'); // Gilead
    expect(stripCurrencySuffix('HMC')).toBe('HMC');   // Honda
    expect(stripCurrencySuffix('HOOD')).toBe('HOOD'); // Robinhood
    expect(stripCurrencySuffix('HSBC')).toBe('HSBC'); // HSBC
    expect(stripCurrencySuffix('INTC')).toBe('INTC'); // Intel
    expect(stripCurrencySuffix('KGC')).toBe('KGC');   // Kinross Gold
    expect(stripCurrencySuffix('LAC')).toBe('LAC');   // Lithium Americas
    expect(stripCurrencySuffix('LND')).toBe('LND');   // BrasilAgro
    expect(stripCurrencySuffix('MCD')).toBe('MCD');   // McDonald's
    expect(stripCurrencySuffix('PAC')).toBe('PAC');   // Grupo Aeroport. Pacífico
    expect(stripCurrencySuffix('PDD')).toBe('PDD');   // PDD Holdings
    expect(stripCurrencySuffix('SID')).toBe('SID');   // CSN
    expect(stripCurrencySuffix('VOD')).toBe('VOD');   // Vodafone
    expect(stripCurrencySuffix('WFC')).toBe('WFC');   // Wells Fargo
    expect(stripCurrencySuffix('ERIC')).toBe('ERIC'); // Ericsson
  });

  it('does NOT strip ETF symbols ending in D registered in IOL_TO_FMP', () => {
    expect(stripCurrencySuffix('GLD')).toBe('GLD');   // SPDR Gold Shares
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

  it('resolves natural tickers ending in C/D to themselves (no strip)', () => {
    expect(toFmpTicker('JD')).toBe('JD');       // JD.com — was returning "J" (Jacobs)
    expect(toFmpTicker('HD')).toBe('HD');       // Home Depot
    expect(toFmpTicker('AMD')).toBe('AMD');     // AMD
    expect(toFmpTicker('GILD')).toBe('GILD');   // Gilead
    expect(toFmpTicker('INTC')).toBe('INTC');   // Intel
    expect(toFmpTicker('MCD')).toBe('MCD');     // McDonald's
    expect(toFmpTicker('PDD')).toBe('PDD');     // PDD Holdings
    expect(toFmpTicker('VOD')).toBe('VOD');     // Vodafone
    expect(toFmpTicker('WFC')).toBe('WFC');     // Wells Fargo
    expect(toFmpTicker('ERIC')).toBe('ERIC');   // Ericsson
  });

  it('resolves IOL-specific symbols to their FMP equivalents', () => {
    expect(toFmpTicker('TEN')).toBe('TS');      // Tenaris
    expect(toFmpTicker('BBV')).toBe('BBVA');    // BBVA
    expect(toFmpTicker('BBVD')).toBe('BBVA');
    expect(toFmpTicker('ALAD')).toBe('ALAB');   // Astera Labs
    expect(toFmpTicker('PETR')).toBe('PBR');    // Petrobras ADR
    expect(toFmpTicker('VAL3D')).toBe('VALE');  // Vale ADR
    expect(toFmpTicker('NAT3D')).toBe('NTCO');  // Natura
    expect(toFmpTicker('NATU3')).toBe('NTCO');
    expect(toFmpTicker('BBDCD')).toBe('BBD');   // Bradesco D-suffix form
  });

  it('handles symbols with dots/dashes', () => {
    expect(toFmpTicker('B.')).toBe('B');         // Barrick
    expect(toFmpTicker('C.D')).toBe('C');        // Citigroup
    expect(toFmpTicker('BB.D')).toBe('BB');      // BlackBerry
    expect(toFmpTicker('CAR.')).toBe('CAR');     // Avis Budget
    expect(toFmpTicker('AKO.B')).toBe('AKO-B');  // Embotelladora Andina
    expect(toFmpTicker('AKOBD')).toBe('AKO-B');
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

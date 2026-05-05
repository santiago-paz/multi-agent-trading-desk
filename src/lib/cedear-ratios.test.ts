import { describe, it, expect } from 'vitest';
import { getCedearRatio, cedearsToShares, sharesToCedears } from './cedear-ratios';

describe('getCedearRatio', () => {
  it('returns the BYMA ratio for known tickers', () => {
    expect(getCedearRatio('AAPL')).toEqual([20, 1]);
    expect(getCedearRatio('ADBE')).toEqual([44, 1]);
    expect(getCedearRatio('GOOGL')).toEqual([58, 1]);
    expect(getCedearRatio('NFLX')).toEqual([48, 1]);
    expect(getCedearRatio('NVDA')).toEqual([24, 1]);
    expect(getCedearRatio('ORLY')).toEqual([222, 1]);
  });

  it('handles inverse-ratio CEDEARs (1 CEDEAR = N shares)', () => {
    expect(getCedearRatio('ABEV')).toEqual([1, 3]);
    expect(getCedearRatio('SID')).toEqual([1, 8]);
    expect(getCedearRatio('RCTB4')).toEqual([1, 1000]);
  });

  it('strips the IOL currency suffix before lookup', () => {
    // AAPLC and AAPLD both map to AAPL
    expect(getCedearRatio('AAPLC')).toEqual([20, 1]);
    expect(getCedearRatio('AAPLD')).toEqual([20, 1]);
    // ADBED → ADBE
    expect(getCedearRatio('ADBED')).toEqual([44, 1]);
  });

  it('handles dotted forms (B/B., AKO.B, BA.C)', () => {
    // BYMA stores Barrick as "B"; IOL portfolio also returns "B"
    expect(getCedearRatio('B')).toEqual([2, 1]);
    // Alternate dot form (legacy)
    expect(getCedearRatio('B.')).toEqual([2, 1]);
    // Bank of America in BYMA is "BA.C"
    expect(getCedearRatio('BA.C')).toEqual([4, 1]);
    expect(getCedearRatio('AKO.B')).toEqual([1, 1]);
  });

  it('returns null for unknown tickers', () => {
    expect(getCedearRatio('FOOBAR')).toBeNull();
    expect(getCedearRatio('')).toBeNull();
  });
});

describe('cedearsToShares', () => {
  it('converts whole-share-equivalent quantities (most common case)', () => {
    // 44 ADBE CEDEARs = 1 share
    expect(cedearsToShares(44, 'ADBE')).toBe(1);
    // 222 ORLY CEDEARs = 1 share
    expect(cedearsToShares(222, 'ORLY')).toBe(1);
    // 24 NVDA CEDEARs = 1 share
    expect(cedearsToShares(24, 'NVDA')).toBe(1);
  });

  it('preserves fractional shares when CEDEAR count is below the ratio', () => {
    // 1 ADBE CEDEAR = 1/44 share
    expect(cedearsToShares(1, 'ADBE')).toBeCloseTo(1 / 44, 10);
    // 101 GOOGL = 101/58 shares
    expect(cedearsToShares(101, 'GOOGL')).toBeCloseTo(101 / 58, 10);
  });

  it('handles inverse ratios (1 CEDEAR = N shares)', () => {
    // 1 ABEV CEDEAR = 3 shares
    expect(cedearsToShares(1, 'ABEV')).toBe(3);
    // 5 SID CEDEARs = 40 shares
    expect(cedearsToShares(5, 'SID')).toBe(40);
  });

  it('falls back to 1:1 when the ticker is unknown', () => {
    expect(cedearsToShares(10, 'UNKNOWN')).toBe(10);
  });

  it('replicates the real Auto Trader portfolio totals (regression check)', () => {
    // Snapshot of the user's holdings the day we discovered the ratio bug.
    // Backend was seeing $49,978 when reality (per IOL titulosValorizados ÷ MEP) was ~$2,810.
    const fmpPrices: Record<string, number> = {
      ADBE: 255.76,  B: 38.79,    GOOGL: 386.31, HMY: 15.62, JD: 29.75,
      KO: 78.72,     NFLX: 87.81, NVDA: 196.72,  ORLY: 95.08, PAAS: 50.70,
    };
    const cedearHoldings: Record<string, number> = {
      ADBE: 1, B: 41, GOOGL: 101, HMY: 34, JD: 1,
      KO: 1,  NFLX: 6, NVDA: 34,  ORLY: 1, PAAS: 23,
    };
    let total = 0;
    for (const [t, qty] of Object.entries(cedearHoldings)) {
      total += cedearsToShares(qty, t) * fmpPrices[t];
    }
    // Should land around $2,706 — within 5% of the IOL-reported $2,810
    // (the small gap is the CEDEAR/underlying premium).
    expect(total).toBeGreaterThan(2_500);
    expect(total).toBeLessThan(2_900);
  });
});

describe('sharesToCedears', () => {
  it('converts shares to CEDEARs with floor by default', () => {
    expect(sharesToCedears(1, 'ADBE')).toBe(44);
    expect(sharesToCedears(2, 'NVDA')).toBe(48);
    expect(sharesToCedears(1, 'ORLY')).toBe(222);
  });

  it('floors fractional results so we never exceed caps', () => {
    // 1.5 ADBE shares = 66 CEDEARs (no fractional)
    expect(sharesToCedears(1.5, 'ADBE')).toBe(66);
    // 0.5 ORLY shares = 111 CEDEARs
    expect(sharesToCedears(0.5, 'ORLY')).toBe(111);
    // Below ratio threshold: floors to 0
    expect(sharesToCedears(0.001, 'ADBE')).toBe(0);
  });

  it('respects ceil and round modes when requested', () => {
    expect(sharesToCedears(1.9, 'NVDA', 'ceil')).toBe(46);   // 45.6 → 46
    expect(sharesToCedears(1.9, 'NVDA', 'round')).toBe(46);  // 45.6 → 46
    expect(sharesToCedears(1.9, 'NVDA', 'floor')).toBe(45);  // 45.6 → 45
  });

  it('handles inverse ratios', () => {
    // 6 shares of ABEV = 2 CEDEARs (since 1 CEDEAR = 3 shares)
    expect(sharesToCedears(6, 'ABEV')).toBe(2);
    // 5 shares of ABEV = 1 CEDEAR (1.66 floored)
    expect(sharesToCedears(5, 'ABEV')).toBe(1);
  });

  it('falls back to flooring shares when ticker is unknown', () => {
    expect(sharesToCedears(7.8, 'UNKNOWN')).toBe(7);
  });
});

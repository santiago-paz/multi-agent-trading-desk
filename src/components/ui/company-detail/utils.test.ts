import { describe, it, expect } from 'vitest';
import { fmtMktCap, fmtCompact, fmtVol } from './utils';

describe('fmtMktCap', () => {
  it('formats trillions with $ and 2 decimals', () => {
    expect(fmtMktCap(2_500_000_000_000)).toBe('$2.50T');
  });

  it('formats billions with 2 decimals', () => {
    expect(fmtMktCap(7_250_000_000)).toBe('$7.25B');
  });

  it('formats millions with 1 decimal', () => {
    expect(fmtMktCap(15_400_000)).toBe('$15.4M');
  });

  it('falls back to a $-prefixed locale string for sub-million values', () => {
    expect(fmtMktCap(123_456)).toBe('$123,456');
  });

  it('uses the trillion threshold at exactly 1e12', () => {
    expect(fmtMktCap(1e12)).toBe('$1.00T');
  });

  it('uses the billion threshold at exactly 1e9', () => {
    expect(fmtMktCap(1e9)).toBe('$1.00B');
  });
});

describe('fmtCompact', () => {
  it('formats billions with 1 decimal and no $ prefix', () => {
    expect(fmtCompact(2_300_000_000)).toBe('2.3B');
  });

  it('formats millions with 0 decimals', () => {
    expect(fmtCompact(7_500_000)).toBe('8M');
  });

  it('formats thousands with 0 decimals', () => {
    expect(fmtCompact(12_345)).toBe('12K');
  });

  it('renders sub-thousand numbers with 0 decimals', () => {
    expect(fmtCompact(999)).toBe('999');
    expect(fmtCompact(0.7)).toBe('1');
  });

  it('respects magnitude regardless of sign (uses absolute value for thresholds)', () => {
    // |-2.3B| ≥ 1e9 → renders as -2.3B (sign preserved by toFixed on negative)
    expect(fmtCompact(-2_300_000_000)).toBe('-2.3B');
    expect(fmtCompact(-7_500_000)).toBe('-8M');
    expect(fmtCompact(-1500)).toBe('-2K');
  });
});

describe('fmtVol', () => {
  it('formats with en-US thousand separators (commas)', () => {
    expect(fmtVol(1_234_567)).toBe('1,234,567');
  });

  it('handles zero', () => {
    expect(fmtVol(0)).toBe('0');
  });
});

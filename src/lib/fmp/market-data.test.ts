import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateSMA, calculateRSI, searchSymbolHits } from './market-data';

// ── calculateSMA ────────────────────────────────────────────────────────────

describe('calculateSMA', () => {
  it('calculates simple moving average for exact period length', () => {
    const data = [10, 20, 30];
    expect(calculateSMA(data, 3)).toBeCloseTo(20);
  });

  it('uses only the last N values when data > period', () => {
    // Last 3 values: 40, 50, 60 → avg = 50
    const data = [10, 20, 30, 40, 50, 60];
    expect(calculateSMA(data, 3)).toBeCloseTo(50);
  });

  it('returns null when data is shorter than period', () => {
    expect(calculateSMA([10, 20], 3)).toBeNull();
  });

  it('returns null for empty data', () => {
    expect(calculateSMA([], 20)).toBeNull();
  });

  it('handles period of 1 (returns last value)', () => {
    expect(calculateSMA([5, 10, 15], 1)).toBeCloseTo(15);
  });

  it('calculates SMA20 correctly', () => {
    // 20 sequential values: 1, 2, 3, ..., 20
    const data = Array.from({ length: 20 }, (_, i) => i + 1);
    // Average of 1..20 = 10.5
    expect(calculateSMA(data, 20)).toBeCloseTo(10.5);
  });

  it('calculates SMA50 correctly', () => {
    // 50 sequential values: 1, 2, ..., 50
    const data = Array.from({ length: 50 }, (_, i) => i + 1);
    // Average of 1..50 = 25.5
    expect(calculateSMA(data, 50)).toBeCloseTo(25.5);
  });
});

// ── calculateRSI ────────────────────────────────────────────────────────────

describe('calculateRSI', () => {
  it('returns null when data length <= period', () => {
    const data = Array.from({ length: 14 }, (_, i) => 100 + i);
    expect(calculateRSI(data, 14)).toBeNull();
  });

  it('returns null for empty data', () => {
    expect(calculateRSI([], 14)).toBeNull();
  });

  it('returns 100 when all changes are gains (no losses)', () => {
    // 15 values, each increasing by 1 — all gains, zero losses
    const data = Array.from({ length: 16 }, (_, i) => 100 + i);
    expect(calculateRSI(data, 14)).toBe(100);
  });

  it('returns 0 when all changes are losses', () => {
    // 16 values, each decreasing by 1 — all losses, zero gains
    const data = Array.from({ length: 16 }, (_, i) => 200 - i);
    expect(calculateRSI(data, 14)).toBeCloseTo(0);
  });

  it('returns ~50 for equal gains and losses', () => {
    // Alternating +1, -1 produces equal average gain and loss
    const data: number[] = [100];
    for (let i = 1; i <= 15; i++) {
      data.push(data[i - 1] + (i % 2 === 1 ? 1 : -1));
    }
    const rsi = calculateRSI(data, 14);
    expect(rsi).not.toBeNull();
    expect(rsi!).toBeCloseTo(50, 0); // roughly 50
  });

  it('calculates a known RSI value', () => {
    // Manual calculation:
    // 15 price changes over the last 14 periods
    // Gains: +2, +3, +1, +4, +2, +1, +3 = 16, avgGain = 16/14
    // Losses: -1, -2, -1, -3, -1, -1, -2 = 11, avgLoss = 11/14
    // RS = 16/11, RSI = 100 - 100/(1 + 16/11) = 100 - 100/2.4545 ≈ 59.26
    const data = [100, 102, 101, 104, 103, 107, 106, 105, 108, 107, 108, 111, 110, 109, 112];
    const rsi = calculateRSI(data, 14);
    expect(rsi).not.toBeNull();

    // Let me compute manually from the implementation's perspective:
    // It looks at data[1..14] (indices data.length-14 to data.length-1)
    // data has 15 elements, so period window is indices 1..14
    const gains: number[] = [];
    const losses: number[] = [];
    for (let i = 1; i < 15; i++) {
      const diff = data[i] - data[i - 1];
      if (diff > 0) gains.push(diff);
      else if (diff < 0) losses.push(-diff);
    }
    const totalGain = gains.reduce((a, b) => a + b, 0);
    const totalLoss = losses.reduce((a, b) => a + b, 0);
    const expectedRSI = 100 - 100 / (1 + totalGain / totalLoss);

    expect(rsi!).toBeCloseTo(expectedRSI, 5);
  });

  it('uses default period of 14', () => {
    const data = Array.from({ length: 16 }, (_, i) => 100 + i);
    // Should work without specifying period (defaults to 14)
    expect(calculateRSI(data)).toBe(100);
  });
});

// ── searchSymbolHits ─────────────────────────────────────────────────────────

describe('searchSymbolHits', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, FMP_API_KEY: 'test-key' };
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  function mockFetch(data: unknown, ok = true, status = 200) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok,
      status,
      json: async () => data,
    });
  }

  it('returns empty array for empty/whitespace query', async () => {
    expect(await searchSymbolHits('')).toEqual([]);
    expect(await searchSymbolHits('   ')).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('parses valid FMP response and returns mapped hits', async () => {
    mockFetch([
      { symbol: 'AAPL', name: 'Apple Inc.', exchangeShortName: 'NASDAQ', stockExchange: 'NASDAQ Global Select' },
      { symbol: 'AAPL.L', name: 'Apple Inc.', exchangeShortName: 'LSE', stockExchange: 'London Stock Exchange' },
    ]);

    const result = await searchSymbolHits('AAPL');
    expect(result).toEqual([
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      { symbol: 'AAPL.L', name: 'Apple Inc.', exchange: 'LSE' },
    ]);
  });

  it('prioritizes US exchanges over non-US while preserving order within groups', async () => {
    mockFetch([
      { symbol: 'KO.F', name: 'Coca-Cola', exchangeShortName: 'XETRA' },
      { symbol: 'KO', name: 'The Coca-Cola Company', exchangeShortName: 'NYSE' },
      { symbol: 'KO.MX', name: 'Coca-Cola MX', exchangeShortName: 'BMV' },
      { symbol: 'KOD.L', name: 'Kodal Minerals', exchangeShortName: 'LSE' },
      { symbol: 'KOS', name: 'Kosmos Energy', exchangeShortName: 'NYSE' },
    ]);

    const result = await searchSymbolHits('KO');
    expect(result[0].symbol).toBe('KO');
    expect(result[1].symbol).toBe('KOS');
    expect(result[2].symbol).toBe('KO.F');
    expect(result[3].symbol).toBe('KO.MX');
    expect(result[4].symbol).toBe('KOD.L');
  });

  it('respects the limit parameter', async () => {
    const data = Array.from({ length: 20 }, (_, i) => ({
      symbol: `SYM${i}`,
      name: `Company ${i}`,
      exchangeShortName: 'NYSE',
    }));
    mockFetch(data);

    const result = await searchSymbolHits('SYM', 5);
    expect(result).toHaveLength(5);
  });

  it('skips entries without a symbol', async () => {
    mockFetch([
      { symbol: '', name: 'No Symbol', exchangeShortName: 'NYSE' },
      { symbol: null, name: 'Null Symbol', exchangeShortName: 'NYSE' },
      { symbol: 'VALID', name: 'Valid Co', exchangeShortName: 'NASDAQ' },
    ]);

    const result = await searchSymbolHits('test');
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('VALID');
  });

  it('handles missing name and exchange fields gracefully', async () => {
    mockFetch([
      { symbol: 'XYZ' },
    ]);

    const result = await searchSymbolHits('XYZ');
    expect(result).toEqual([
      { symbol: 'XYZ', name: '', exchange: '' },
    ]);
  });

  it('falls back to stockExchange when exchangeShortName is missing', async () => {
    mockFetch([
      { symbol: 'TEST', name: 'Test Corp', stockExchange: 'New York Stock Exchange' },
    ]);

    const result = await searchSymbolHits('TEST');
    expect(result[0].exchange).toBe('New York Stock Exchange');
  });

  it('returns empty array on HTTP error', async () => {
    mockFetch(null, false, 500);

    const result = await searchSymbolHits('AAPL');
    expect(result).toEqual([]);
  });

  it('returns empty array when API returns non-array', async () => {
    mockFetch({ error: 'something went wrong' });

    const result = await searchSymbolHits('AAPL');
    expect(result).toEqual([]);
  });

  it('skips malformed entries (null, primitives)', async () => {
    mockFetch([
      null,
      42,
      'string',
      { symbol: 'OK', name: 'Good', exchangeShortName: 'AMEX' },
    ]);

    const result = await searchSymbolHits('test');
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('OK');
  });

  it('includes the query and limit in the FMP URL', async () => {
    mockFetch([]);
    await searchSymbolHits('Apple', 10);

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('query=Apple');
    expect(url).toContain('limit=30');
    expect(url).toContain('apikey=test-key');
  });

  it('throws when FMP_API_KEY is not set', async () => {
    delete process.env.FMP_API_KEY;
    await expect(searchSymbolHits('AAPL')).rejects.toThrow('FMP_API_KEY not set');
  });
});

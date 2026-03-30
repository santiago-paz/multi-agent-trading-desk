import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateSMA,
  calculateRSI,
  searchSymbolHits,
  getAllNews,
  getNews,
  getGeneralMarketNews,
  getHistoricalData,
  getHistoricalPrices,
  getComprehensiveAssetData,
  getCompanyNames,
  getCompanyProfile,
  getIncomeStatements,
  getKeyMetrics,
  getCashFlowStatements,
  getBalanceSheetStatements,
  getFinancialScores,
  getDCFValue,
  getTickerNews,
} from './market-data';

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

// ── Shared fetch mock helper ─────────────────────────────────────────────────

function setupFetchEnv() {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv, FMP_API_KEY: 'test-key' };
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });
}

function mockFetchSequence(responses: { data: unknown; ok?: boolean; status?: number }[]) {
  const fn = globalThis.fetch as ReturnType<typeof vi.fn>;
  for (const { data, ok = true, status = 200 } of responses) {
    fn.mockResolvedValueOnce({ ok, status, json: async () => data });
  }
}

function mockFetch(data: unknown, ok = true, status = 200) {
  mockFetchSequence([{ data, ok, status }]);
}

// ── getHistoricalData ────────────────────────────────────────────────────────

describe('getHistoricalData', () => {
  setupFetchEnv();

  it('returns OHLCV rows in chronological order', async () => {
    mockFetch([
      { date: '2025-03-03', open: 10, high: 12, low: 9, close: 11, volume: 100 },
      { date: '2025-03-02', open: 9, high: 11, low: 8, close: 10, volume: 90 },
      { date: '2025-03-01', open: 8, high: 10, low: 7, close: 9, volume: 80 },
    ]);

    const rows = await getHistoricalData('AAPL', 5);
    expect(rows).toHaveLength(3);
    expect(rows[0].close).toBe(9);
    expect(rows[2].close).toBe(11);
    expect(rows[0].date).toBeInstanceOf(Date);
  });

  it('filters out rows with null close', async () => {
    mockFetch([
      { date: '2025-03-02', open: 10, high: 12, low: 9, close: 11, volume: 100 },
      { date: '2025-03-01', open: 9, high: 11, low: 8, close: null, volume: 90 },
    ]);

    const rows = await getHistoricalData('AAPL', 5);
    expect(rows).toHaveLength(1);
    expect(rows[0].close).toBe(11);
  });

  it('throws on HTTP error', async () => {
    mockFetch(null, false, 500);
    await expect(getHistoricalData('AAPL')).rejects.toThrow('FMP API error: 500');
  });

  it('throws when API returns empty array', async () => {
    mockFetch([]);
    await expect(getHistoricalData('AAPL')).rejects.toThrow('No data returned from FMP');
  });

  it('throws when API returns non-array', async () => {
    mockFetch({ error: 'bad' });
    await expect(getHistoricalData('AAPL')).rejects.toThrow('No data returned from FMP');
  });

  it('builds correct URL with date range', async () => {
    mockFetch([
      { date: '2025-03-01', open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
    ]);
    await getHistoricalData('TSLA', 30);

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('symbol=TSLA');
    expect(url).toContain('apikey=test-key');
    expect(url).toMatch(/from=\d{4}-\d{2}-\d{2}/);
    expect(url).toMatch(/to=\d{4}-\d{2}-\d{2}/);
  });

  it('throws when FMP_API_KEY is not set', async () => {
    delete process.env.FMP_API_KEY;
    await expect(getHistoricalData('AAPL')).rejects.toThrow('FMP_API_KEY not set');
  });
});

// ── getAllNews ────────────────────────────────────────────────────────────────

describe('getAllNews', () => {
  setupFetchEnv();

  function stockArticle(symbol: string, title: string) {
    return { symbol, title, publishedDate: '2025-03-01T12:00:00Z', image: '', site: 'Test', text: 'body', url: 'https://example.com' };
  }

  function generalArticle(title: string) {
    return { symbol: null, title, publishedDate: '2025-03-01T12:00:00Z', image: '', site: 'Test', text: 'body', url: 'https://example.com' };
  }

  it('returns general and ticker-specific news', async () => {
    mockFetchSequence([
      { data: [stockArticle('AAPL', 'Apple up'), stockArticle('TSLA', 'Tesla news')] },
      { data: [generalArticle('Markets rally')] },
    ]);

    const result = await getAllNews();
    expect(result.general).toHaveLength(1);
    expect(result.general[0].title).toBe('Markets rally');
    expect(result.specific['AAPL']).toHaveLength(1);
    expect(result.specific['TSLA']).toHaveLength(1);
  });

  it('groups multiple articles under the same ticker', async () => {
    mockFetchSequence([
      { data: [stockArticle('AAPL', 'A1'), stockArticle('AAPL', 'A2'), stockArticle('KO', 'K1')] },
      { data: [] },
    ]);

    const result = await getAllNews();
    expect(result.specific['AAPL']).toHaveLength(2);
    expect(result.specific['KO']).toHaveLength(1);
  });

  it('normalizes ticker symbols to uppercase', async () => {
    mockFetchSequence([
      { data: [stockArticle('aapl', 'Apple lowercase')] },
      { data: [] },
    ]);

    const result = await getAllNews();
    expect(result.specific['AAPL']).toHaveLength(1);
  });

  it('uses legacy fallback when general endpoint returns empty', async () => {
    mockFetchSequence([
      { data: [stockArticle('AAPL', 'Ticker news'), generalArticle('General from stock feed')] },
      { data: [] },
    ]);

    const result = await getAllNews();
    expect(result.general).toHaveLength(1);
    expect(result.general[0].title).toBe('General from stock feed');
  });

  it('does not add symbolless stock articles to general when general endpoint has results', async () => {
    mockFetchSequence([
      { data: [generalArticle('Should NOT appear in general')] },
      { data: [generalArticle('From general endpoint')] },
    ]);

    const result = await getAllNews();
    expect(result.general).toHaveLength(1);
    expect(result.general[0].title).toBe('From general endpoint');
  });

  it('handles stock-latest failure gracefully', async () => {
    const fn = globalThis.fetch as ReturnType<typeof vi.fn>;
    fn.mockRejectedValueOnce(new Error('network error'));
    fn.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [generalArticle('General ok')] });

    const result = await getAllNews();
    expect(result.specific).toEqual({});
    expect(result.general).toHaveLength(1);
  });

  it('handles general-latest failure gracefully', async () => {
    const fn = globalThis.fetch as ReturnType<typeof vi.fn>;
    fn.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [stockArticle('AAPL', 'A1')] });
    fn.mockRejectedValueOnce(new Error('network error'));

    const result = await getAllNews();
    expect(result.specific['AAPL']).toHaveLength(1);
    expect(result.general).toEqual([]);
  });

  it('handles both endpoints failing', async () => {
    const fn = globalThis.fetch as ReturnType<typeof vi.fn>;
    fn.mockRejectedValueOnce(new Error('fail 1'));
    fn.mockRejectedValueOnce(new Error('fail 2'));

    const result = await getAllNews();
    expect(result.general).toEqual([]);
    expect(result.specific).toEqual({});
  });

  it('maps FMP article fields to NewsItem shape', async () => {
    mockFetchSequence([
      { data: [] },
      { data: [{ symbol: null, title: 'T', publishedDate: '2025-06-15T10:30:00Z', image: 'img.png', site: 'Bloomberg', text: 'body text', url: 'https://news.com/1' }] },
    ]);

    const result = await getAllNews();
    const item = result.general[0];
    expect(item.title).toBe('T');
    expect(item.link).toBe('https://news.com/1');
    expect(item.publisher).toBe('Bloomberg');
    expect(item.providerPublishTime).toBeInstanceOf(Date);
    expect(item.text).toBe('body text');
    expect(item.image).toBe('img.png');
  });
});

// ── getNews / getGeneralMarketNews ───────────────────────────────────────────

describe('getNews', () => {
  setupFetchEnv();

  function stockArticle(symbol: string, title: string) {
    return { symbol, title, publishedDate: '2025-03-01T12:00:00Z', image: '', site: 'T', text: '', url: 'https://x.com' };
  }

  it('returns news filtered by ticker with limit', async () => {
    const articles = Array.from({ length: 10 }, (_, i) => stockArticle('AAPL', `A${i}`));
    mockFetchSequence([
      { data: articles },
      { data: [] },
    ]);

    const result = await getNews('AAPL', 3);
    expect(result).toHaveLength(3);
  });

  it('is case-insensitive on ticker lookup', async () => {
    mockFetchSequence([
      { data: [stockArticle('AAPL', 'Apple news')] },
      { data: [] },
    ]);

    const result = await getNews('aapl', 5);
    expect(result).toHaveLength(1);
  });

  it('returns empty when ticker has no news', async () => {
    mockFetchSequence([
      { data: [stockArticle('AAPL', 'Apple')] },
      { data: [] },
    ]);

    const result = await getNews('MSFT', 5);
    expect(result).toEqual([]);
  });
});

describe('getGeneralMarketNews', () => {
  setupFetchEnv();

  it('returns general news with limit', async () => {
    const generals = Array.from({ length: 10 }, (_, i) => ({
      symbol: null, title: `G${i}`, publishedDate: '2025-03-01T12:00:00Z',
      image: '', site: 'T', text: '', url: 'https://x.com',
    }));
    mockFetchSequence([
      { data: [] },
      { data: generals },
    ]);

    const result = await getGeneralMarketNews(3);
    expect(result).toHaveLength(3);
  });
});

// ── getComprehensiveAssetData ────────────────────────────────────────────────

describe('getComprehensiveAssetData', () => {
  setupFetchEnv();

  function makeHistorical(count: number, basePrice = 100) {
    return Array.from({ length: count }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      open: basePrice + i,
      high: basePrice + i + 2,
      low: basePrice + i - 1,
      close: basePrice + i,
      volume: 1000 + i * 10,
    })).reverse(); // FMP returns newest-first
  }

  it('returns asset data with technicals and news', async () => {
    const history = makeHistorical(55);
    mockFetchSequence([
      { data: history },
      { data: [{ symbol: 'AAPL', title: 'News', publishedDate: '2025-03-01T12:00:00Z', image: '', site: 'T', text: 'body', url: 'https://x.com' }] },
      { data: [] },
    ]);

    const result = await getComprehensiveAssetData('AAPL');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('AAPL');
    expect(result!.currentPrice).toBeGreaterThan(0);
    expect(result!.historicalPrices.length).toBeLessThanOrEqual(30);
    expect(result!.technicals).toHaveProperty('sma20');
    expect(result!.technicals).toHaveProperty('sma50');
    expect(result!.technicals).toHaveProperty('rsi14');
    expect(result!.technicals).toHaveProperty('priceToSMA20Ratio');
  });

  it('computes SMA20 when enough data, null for SMA50 when < 50 points', async () => {
    const history = makeHistorical(25);
    mockFetchSequence([
      { data: history },
      { data: [] },
      { data: [] },
    ]);

    const result = await getComprehensiveAssetData('AAPL');
    expect(result).not.toBeNull();
    expect(result!.technicals.sma20).not.toBeNull();
    expect(result!.technicals.sma50).toBeNull();
  });

  it('returns null when historical data fetch fails', async () => {
    mockFetch([], true, 200);

    const result = await getComprehensiveAssetData('INVALID');
    expect(result).toBeNull();
  });

  it('returns null when historical data returns HTTP error', async () => {
    mockFetch(null, false, 500);

    const result = await getComprehensiveAssetData('AAPL');
    expect(result).toBeNull();
  });

  it('sets priceToSMA20Ratio to null when SMA20 is null', async () => {
    const history = makeHistorical(10);
    mockFetchSequence([
      { data: history },
      { data: [] },
      { data: [] },
    ]);

    const result = await getComprehensiveAssetData('AAPL');
    expect(result).not.toBeNull();
    expect(result!.technicals.sma20).toBeNull();
    expect(result!.technicals.priceToSMA20Ratio).toBeNull();
  });

  it('includes up to 3 recent news items', async () => {
    const history = makeHistorical(20);
    const news = Array.from({ length: 5 }, (_, i) => ({
      symbol: 'AAPL', title: `N${i}`, publishedDate: '2025-03-01T12:00:00Z',
      image: '', site: 'T', text: '', url: 'https://x.com',
    }));
    mockFetchSequence([
      { data: history },
      { data: news },
      { data: [] },
    ]);

    const result = await getComprehensiveAssetData('AAPL');
    expect(result).not.toBeNull();
    expect(result!.recentNews.length).toBeLessThanOrEqual(3);
  });
});

// ── getCompanyNames ──────────────────────────────────────────────────────────

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
  };
});

describe('getCompanyNames', () => {
  setupFetchEnv();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns cached names without making API calls', async () => {
    const fs = (await import('fs')).default;
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({ AAPL: 'Apple Inc.', TSLA: 'Tesla Inc.' })
    );

    const result = await getCompanyNames(['AAPL', 'TSLA']);
    expect(result).toEqual({ AAPL: 'Apple Inc.', TSLA: 'Tesla Inc.' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('fetches missing symbols and updates cache', async () => {
    const fs = (await import('fs')).default;
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({ AAPL: 'Apple Inc.' })
    );

    mockFetch([{ companyName: 'Tesla Inc.' }]);

    const result = await getCompanyNames(['AAPL', 'TSLA']);
    expect(result).toEqual({ AAPL: 'Apple Inc.', TSLA: 'Tesla Inc.' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('falls back to symbol when profile has no companyName', async () => {
    const fs = (await import('fs')).default;
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('{}');

    mockFetch([{}]);

    const result = await getCompanyNames(['XYZ']);
    expect(result).toEqual({ XYZ: 'XYZ' });
  });

  it('falls back to symbol when fetch fails', async () => {
    const fs = (await import('fs')).default;
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('{}');

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));

    const result = await getCompanyNames(['XYZ']);
    expect(result).toEqual({ XYZ: 'XYZ' });
  });

  it('handles corrupted cache file gracefully', async () => {
    const fs = (await import('fs')).default;
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('ENOENT');
    });

    mockFetch([{ companyName: 'Apple Inc.' }]);

    const result = await getCompanyNames(['AAPL']);
    expect(result).toEqual({ AAPL: 'Apple Inc.' });
  });
});

// ── getCompanyProfile ────────────────────────────────────────────────────────

describe('getCompanyProfile', () => {
  setupFetchEnv();

  it('returns profile from first element of array response', async () => {
    mockFetch([{ symbol: 'AAPL', companyName: 'Apple Inc.', sector: 'Technology' }]);

    const result = await getCompanyProfile('AAPL');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('AAPL');
    expect(result!.companyName).toBe('Apple Inc.');
  });

  it('returns null on HTTP error', async () => {
    mockFetch(null, false, 500);
    expect(await getCompanyProfile('AAPL')).toBeNull();
  });

  it('returns null when API returns empty array', async () => {
    mockFetch([]);
    expect(await getCompanyProfile('INVALID')).toBeNull();
  });

  it('returns null when API returns non-array', async () => {
    mockFetch({ error: 'not found' });
    expect(await getCompanyProfile('INVALID')).toBeNull();
  });

  it('builds correct URL', async () => {
    mockFetch([{ symbol: 'TSLA' }]);
    await getCompanyProfile('TSLA');

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('symbol=TSLA');
    expect(url).toContain('apikey=test-key');
    expect(url).toContain('/stable/profile');
  });
});

// ── getIncomeStatements ──────────────────────────────────────────────────────

describe('getIncomeStatements', () => {
  setupFetchEnv();

  it('maps fields and returns in chronological order', async () => {
    mockFetch([
      { date: '2024-12-31', revenue: 200, netIncome: 50, grossProfit: 100, operatingIncome: 70, eps: 3.5 },
      { date: '2023-12-31', revenue: 180, netIncome: 40, grossProfit: 90, operatingIncome: 60, eps: 3.0 },
    ]);

    const rows = await getIncomeStatements('AAPL');
    expect(rows).toHaveLength(2);
    expect(rows[0].date).toBe('2023-12-31');
    expect(rows[1].date).toBe('2024-12-31');
    expect(rows[1].revenue).toBe(200);
    expect(rows[1].eps).toBe(3.5);
  });

  it('defaults missing numeric fields to 0', async () => {
    mockFetch([{ date: '2024-01-01' }]);

    const rows = await getIncomeStatements('AAPL');
    expect(rows[0].revenue).toBe(0);
    expect(rows[0].netIncome).toBe(0);
    expect(rows[0].eps).toBe(0);
  });

  it('returns empty array on HTTP error', async () => {
    mockFetch(null, false, 500);
    expect(await getIncomeStatements('AAPL')).toEqual([]);
  });

  it('returns empty array when API returns non-array', async () => {
    mockFetch({ error: 'bad' });
    expect(await getIncomeStatements('AAPL')).toEqual([]);
  });

  it('passes period parameter in URL', async () => {
    mockFetch([]);
    await getIncomeStatements('AAPL', 'quarter');

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('period=quarter');
  });

  it('defaults to annual period', async () => {
    mockFetch([]);
    await getIncomeStatements('AAPL');

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('period=annual');
  });
});

// ── getKeyMetrics ────────────────────────────────────────────────────────────

describe('getKeyMetrics', () => {
  setupFetchEnv();

  it('maps fields and returns in chronological order', async () => {
    mockFetch([
      { date: '2024-12-31', peRatio: 30, pbRatio: 40, returnOnEquity: 1.5, returnOnAssets: 0.3, debtToEquity: 1.8, currentRatio: 1.1, dividendYield: 0.006, enterpriseValue: 3e12, evToEbitda: 25 },
      { date: '2023-12-31', peRatio: 28, pbRatio: 35, returnOnEquity: 1.4, returnOnAssets: 0.28, debtToEquity: 1.7, currentRatio: 1.0, dividendYield: 0.007, enterpriseValue: 2.8e12, evToEbitda: 23 },
    ]);

    const rows = await getKeyMetrics('AAPL');
    expect(rows).toHaveLength(2);
    expect(rows[0].date).toBe('2023-12-31');
    expect(rows[1].peRatio).toBe(30);
    expect(rows[1].roe).toBe(1.5);
    expect(rows[1].roa).toBe(0.3);
  });

  it('defaults missing fields to 0', async () => {
    mockFetch([{ date: '2024-01-01' }]);

    const rows = await getKeyMetrics('AAPL');
    expect(rows[0].peRatio).toBe(0);
    expect(rows[0].dividendYield).toBe(0);
    expect(rows[0].evToEbitda).toBe(0);
  });

  it('returns empty array on HTTP error', async () => {
    mockFetch(null, false, 500);
    expect(await getKeyMetrics('AAPL')).toEqual([]);
  });

  it('returns empty array when API returns non-array', async () => {
    mockFetch({ error: 'bad' });
    expect(await getKeyMetrics('AAPL')).toEqual([]);
  });
});

// ── getCashFlowStatements ────────────────────────────────────────────────────

describe('getCashFlowStatements', () => {
  setupFetchEnv();

  it('maps fields and returns in chronological order', async () => {
    mockFetch([
      { date: '2024-12-31', operatingCashFlow: 100, capitalExpenditure: -20, freeCashFlow: 80, dividendsPaid: -15 },
      { date: '2023-12-31', operatingCashFlow: 90, capitalExpenditure: -18, freeCashFlow: 72, dividendsPaid: -12 },
    ]);

    const rows = await getCashFlowStatements('AAPL');
    expect(rows).toHaveLength(2);
    expect(rows[0].date).toBe('2023-12-31');
    expect(rows[1].operatingCashFlow).toBe(100);
    expect(rows[1].freeCashFlow).toBe(80);
  });

  it('defaults missing fields to 0', async () => {
    mockFetch([{ date: '2024-01-01' }]);

    const rows = await getCashFlowStatements('AAPL');
    expect(rows[0].operatingCashFlow).toBe(0);
    expect(rows[0].capitalExpenditure).toBe(0);
    expect(rows[0].freeCashFlow).toBe(0);
    expect(rows[0].dividendsPaid).toBe(0);
  });

  it('returns empty array on HTTP error', async () => {
    mockFetch(null, false, 500);
    expect(await getCashFlowStatements('AAPL')).toEqual([]);
  });

  it('returns empty array when API returns non-array', async () => {
    mockFetch({ error: 'bad' });
    expect(await getCashFlowStatements('AAPL')).toEqual([]);
  });
});

// ── getBalanceSheetStatements ────────────────────────────────────────────────

describe('getBalanceSheetStatements', () => {
  setupFetchEnv();

  it('maps fields and returns in chronological order', async () => {
    mockFetch([
      { date: '2024-12-31', totalAssets: 400, totalLiabilities: 250, totalStockholdersEquity: 150, netDebt: 80, totalDebt: 120, cashAndShortTermInvestments: 40 },
      { date: '2023-12-31', totalAssets: 380, totalLiabilities: 240, totalStockholdersEquity: 140, netDebt: 75, totalDebt: 110, cashAndShortTermInvestments: 35 },
    ]);

    const rows = await getBalanceSheetStatements('AAPL');
    expect(rows).toHaveLength(2);
    expect(rows[0].date).toBe('2023-12-31');
    expect(rows[1].totalAssets).toBe(400);
    expect(rows[1].totalStockholdersEquity).toBe(150);
    expect(rows[1].cashAndShortTermInvestments).toBe(40);
  });

  it('defaults missing fields to 0', async () => {
    mockFetch([{ date: '2024-01-01' }]);

    const rows = await getBalanceSheetStatements('AAPL');
    expect(rows[0].totalAssets).toBe(0);
    expect(rows[0].totalLiabilities).toBe(0);
    expect(rows[0].netDebt).toBe(0);
  });

  it('returns empty array on HTTP error', async () => {
    mockFetch(null, false, 500);
    expect(await getBalanceSheetStatements('AAPL')).toEqual([]);
  });

  it('returns empty array when API returns non-array', async () => {
    mockFetch({ error: 'bad' });
    expect(await getBalanceSheetStatements('AAPL')).toEqual([]);
  });
});

// ── getFinancialScores ───────────────────────────────────────────────────────

describe('getFinancialScores', () => {
  setupFetchEnv();

  it('returns scores from first element of array response', async () => {
    mockFetch([{ symbol: 'AAPL', altmanZScore: 5.2, piotroskiScore: 7 }]);

    const result = await getFinancialScores('AAPL');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('AAPL');
    expect(result!.altmanZScore).toBe(5.2);
    expect(result!.piotroskiScore).toBe(7);
  });

  it('defaults missing numeric fields to 0', async () => {
    mockFetch([{ symbol: 'AAPL' }]);

    const result = await getFinancialScores('AAPL');
    expect(result).not.toBeNull();
    expect(result!.altmanZScore).toBe(0);
    expect(result!.piotroskiScore).toBe(0);
  });

  it('returns null on HTTP error', async () => {
    mockFetch(null, false, 500);
    expect(await getFinancialScores('AAPL')).toBeNull();
  });

  it('returns null when API returns empty array', async () => {
    mockFetch([]);
    expect(await getFinancialScores('INVALID')).toBeNull();
  });

  it('returns null when API returns non-array', async () => {
    mockFetch({ error: 'bad' });
    expect(await getFinancialScores('AAPL')).toBeNull();
  });
});

// ── getDCFValue ──────────────────────────────────────────────────────────────

describe('getDCFValue', () => {
  setupFetchEnv();

  it('returns DCF data from first element of array response', async () => {
    mockFetch([{ symbol: 'AAPL', dcf: 185.5, stockPrice: 175.0 }]);

    const result = await getDCFValue('AAPL');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('AAPL');
    expect(result!.dcf).toBe(185.5);
    expect(result!.price).toBe(175.0);
  });

  it('defaults missing numeric fields to 0', async () => {
    mockFetch([{ symbol: 'AAPL' }]);

    const result = await getDCFValue('AAPL');
    expect(result).not.toBeNull();
    expect(result!.dcf).toBe(0);
    expect(result!.price).toBe(0);
  });

  it('returns null on HTTP error', async () => {
    mockFetch(null, false, 500);
    expect(await getDCFValue('AAPL')).toBeNull();
  });

  it('returns null when API returns empty array', async () => {
    mockFetch([]);
    expect(await getDCFValue('INVALID')).toBeNull();
  });

  it('returns null when API returns non-array', async () => {
    mockFetch({ error: 'bad' });
    expect(await getDCFValue('AAPL')).toBeNull();
  });
});

// ── getHistoricalPrices ──────────────────────────────────────────────────────

describe('getHistoricalPrices', () => {
  setupFetchEnv();

  it('returns formatted price string', async () => {
    mockFetch([
      { date: '2025-03-03', open: 10, high: 12, low: 9, close: 11.5, volume: 100 },
      { date: '2025-03-02', open: 9, high: 11, low: 8, close: 10.25, volume: 90 },
    ]);

    const result = await getHistoricalPrices('AAPL', 5);
    expect(result).toBe('Price trend for last 5 days: 10.25, 11.50');
  });

  it('returns error message on failure', async () => {
    mockFetch(null, false, 500);

    const result = await getHistoricalPrices('AAPL', 30);
    expect(result).toContain('Error fetching data for AAPL');
  });
});

// ── getTickerNews ────────────────────────────────────────────────────────────

describe('getTickerNews', () => {
  setupFetchEnv();

  it('maps FMP articles to NewsItem shape', async () => {
    mockFetch([
      { symbol: 'AAPL', title: 'Apple Q1', publishedDate: '2025-03-01T10:00:00Z', image: 'img.png', site: 'Reuters', text: 'body', url: 'https://r.com/1' },
      { symbol: 'AAPL', title: 'Apple Q2', publishedDate: '2025-03-02T10:00:00Z', image: '', site: 'Bloomberg', text: 'text', url: 'https://b.com/2' },
    ]);

    const result = await getTickerNews('AAPL', 5);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Apple Q1');
    expect(result[0].link).toBe('https://r.com/1');
    expect(result[0].publisher).toBe('Reuters');
    expect(result[0].providerPublishTime).toBeInstanceOf(Date);
    expect(result[0].relatedTickers).toEqual(['AAPL']);
  });

  it('returns empty array on HTTP error', async () => {
    mockFetch(null, false, 500);
    expect(await getTickerNews('AAPL')).toEqual([]);
  });

  it('returns empty array when API returns non-array', async () => {
    mockFetch({ error: 'bad' });
    expect(await getTickerNews('AAPL')).toEqual([]);
  });

  it('builds correct URL with ticker and limit', async () => {
    mockFetch([]);
    await getTickerNews('TSLA', 10);

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('symbols=TSLA');
    expect(url).toContain('limit=10');
    expect(url).toContain('apikey=test-key');
    expect(url).toContain('/stable/news/stock');
  });

  it('handles article without symbol gracefully', async () => {
    mockFetch([
      { symbol: null, title: 'No ticker', publishedDate: '2025-03-01T10:00:00Z', image: '', site: 'T', text: '', url: 'https://x.com' },
    ]);

    const result = await getTickerNews('AAPL');
    expect(result).toHaveLength(1);
    expect(result[0].relatedTickers).toBeUndefined();
  });
});

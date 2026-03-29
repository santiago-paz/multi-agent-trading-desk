/**
 * Integration tests against the real FMP (Financial Modeling Prep) API.
 *
 * These tests hit live endpoints with a real API key.
 * All endpoints are read-only — nothing mutates state.
 *
 * Run manually:   FMP_INTEGRATION=1 FMP_API_KEY=<key> npx vitest run src/lib/market-data.integration.test.ts
 * Skip (default): npx vitest run  (skipped unless FMP_INTEGRATION is set)
 */
import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import type {
  BalanceSheetRow,
  CashFlowRow,
  CompanyProfile,
  DCFValue,
  FinancialScores,
  HistoricalRow,
  IncomeStatementRow,
  KeyMetricsRow,
  NewsItem,
} from './market-data';
import {
  calculateRSI,
  calculateSMA,
  getAllNews,
  getBalanceSheetStatements,
  getCashFlowStatements,
  getCompanyNames,
  getCompanyProfile,
  getDCFValue,
  getFinancialScores,
  getGeneralMarketNews,
  getHistoricalData,
  getHistoricalPrices,
  getIncomeStatements,
  getKeyMetrics,
  getTickerNews,
} from './market-data';

/** Recursively extract the "shape" of a JSON value as a sorted list of dot-separated key paths. */
function extractShape(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [prefix + '[]'];
    return extractShape(value[0], prefix + '[].');
  }
  if (value !== null && typeof value === 'object') {
    const keys: string[] = [];
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const child = (value as Record<string, unknown>)[key];
      const childPath = prefix + key;
      if (child !== null && typeof child === 'object') {
        keys.push(...extractShape(child, childPath + (Array.isArray(child) ? '' : '.')));
      } else {
        keys.push(childPath);
      }
    }
    return keys.sort();
  }
  return prefix ? [prefix.replace(/\.$/, '')] : [];
}

function loadFixture(name: string): unknown {
  const fixturePath = path.join(__dirname, '__fixtures__', name);
  return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
}

async function fetchFMPRaw(endpoint: string, params: Record<string, string> = {}): Promise<unknown> {
  const apiKey = process.env.FMP_API_KEY!;
  const qs = new URLSearchParams({ ...params, apikey: apiKey }).toString();
  const res = await fetch(`https://financialmodelingprep.com/stable/${endpoint}?${qs}`);
  if (!res.ok) throw new Error(`FMP ${endpoint}: ${res.status}`);
  return res.json();
}

const SKIP = !process.env.FMP_INTEGRATION;
const TICKER = 'AAPL';

describe.skipIf(SKIP)('FMP Market Data integration', () => {

  // ── getCompanyNames ─────────────────────────────────────────────────────

  describe('getCompanyNames', () => {
    let names: Record<string, string>;

    beforeAll(async () => {
      names = await getCompanyNames([TICKER, 'MSFT']);
    });

    it('returns a record with requested symbols as keys', () => {
      expect(names).toHaveProperty(TICKER);
      expect(names).toHaveProperty('MSFT');
    });

    it('values are non-empty strings', () => {
      expect(typeof names[TICKER]).toBe('string');
      expect(names[TICKER].length).toBeGreaterThan(0);
      expect(typeof names['MSFT']).toBe('string');
      expect(names['MSFT'].length).toBeGreaterThan(0);
    });
  });

  // ── getCompanyProfile ───────────────────────────────────────────────────

  describe('getCompanyProfile', () => {
    let profile: CompanyProfile | null;

    beforeAll(async () => {
      profile = await getCompanyProfile(TICKER);
    });

    it('returns a non-null profile', () => {
      expect(profile).not.toBeNull();
    });

    it('has string identity fields', () => {
      expect(typeof profile!.symbol).toBe('string');
      expect(typeof profile!.companyName).toBe('string');
      expect(typeof profile!.sector).toBe('string');
      expect(typeof profile!.industry).toBe('string');
      expect(typeof profile!.country).toBe('string');
      expect(typeof profile!.exchange).toBe('string');
      expect(typeof profile!.currency).toBe('string');
    });

    it('has numeric valuation fields', () => {
      // FMP stable API returns marketCap / averageVolume (not mktCap / volAvg)
      const raw = profile as unknown as Record<string, unknown>;
      expect(typeof raw.marketCap).toBe('number');
      expect(typeof raw.price).toBe('number');
      expect(typeof profile!.beta).toBe('number');
      expect(typeof raw.averageVolume).toBe('number');
      expect(raw.price as number).toBeGreaterThan(0);
      expect(raw.marketCap as number).toBeGreaterThan(0);
    });

    it('has boolean flags', () => {
      expect(typeof profile!.isActivelyTrading).toBe('boolean');
    });
  });

  // ── getIncomeStatements ─────────────────────────────────────────────────

  describe('getIncomeStatements', () => {
    let annual: IncomeStatementRow[];
    let quarterly: IncomeStatementRow[];

    beforeAll(async () => {
      annual = await getIncomeStatements(TICKER, 'annual');
      quarterly = await getIncomeStatements(TICKER, 'quarter');
    });

    it('returns non-empty annual array', () => {
      expect(annual.length).toBeGreaterThan(0);
    });

    it('each annual row has expected fields', () => {
      for (const row of annual.slice(0, 3)) {
        expect(typeof row.date).toBe('string');
        expect(typeof row.revenue).toBe('number');
        expect(typeof row.netIncome).toBe('number');
        expect(typeof row.grossProfit).toBe('number');
        expect(typeof row.operatingIncome).toBe('number');
        expect(typeof row.eps).toBe('number');
      }
    });

    it('annual rows are in chronological order', () => {
      for (let i = 1; i < annual.length; i++) {
        expect(new Date(annual[i].date).getTime()).toBeGreaterThan(new Date(annual[i - 1].date).getTime());
      }
    });

    it('returns non-empty quarterly array', () => {
      expect(quarterly.length).toBeGreaterThan(0);
      expect(quarterly.length).toBeGreaterThanOrEqual(annual.length);
    });
  });

  // ── getHistoricalData ───────────────────────────────────────────────────

  describe('getHistoricalData', () => {
    let data: HistoricalRow[];

    beforeAll(async () => {
      data = await getHistoricalData(TICKER, 30);
    });

    it('returns non-empty array', () => {
      expect(data.length).toBeGreaterThan(0);
    });

    it('each row has OHLCV fields', () => {
      for (const row of data.slice(0, 5)) {
        expect(row.date).toBeInstanceOf(Date);
        expect(typeof row.open).toBe('number');
        expect(typeof row.high).toBe('number');
        expect(typeof row.low).toBe('number');
        expect(typeof row.close).toBe('number');
        expect(typeof row.volume).toBe('number');
        expect(row.close).toBeGreaterThan(0);
      }
    });

    it('rows are in chronological order', () => {
      for (let i = 1; i < data.length; i++) {
        expect(data[i].date.getTime()).toBeGreaterThanOrEqual(data[i - 1].date.getTime());
      }
    });

    it('high >= low for each row', () => {
      for (const row of data) {
        expect(row.high).toBeGreaterThanOrEqual(row.low);
      }
    });
  });

  // ── getHistoricalPrices ─────────────────────────────────────────────────

  describe('getHistoricalPrices', () => {
    it('returns a string starting with expected prefix', async () => {
      const result = await getHistoricalPrices(TICKER, 30);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^Price trend for last 30 days:/);
    });
  });

  // ── getKeyMetrics ───────────────────────────────────────────────────────

  describe('getKeyMetrics', () => {
    let metrics: KeyMetricsRow[];

    beforeAll(async () => {
      metrics = await getKeyMetrics(TICKER);
    });

    it('returns non-empty array', () => {
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('each row has expected numeric fields', () => {
      for (const row of metrics.slice(0, 3)) {
        expect(typeof row.date).toBe('string');
        expect(typeof row.peRatio).toBe('number');
        expect(typeof row.pbRatio).toBe('number');
        expect(typeof row.roe).toBe('number');
        expect(typeof row.roa).toBe('number');
        expect(typeof row.debtToEquity).toBe('number');
        expect(typeof row.currentRatio).toBe('number');
        expect(typeof row.dividendYield).toBe('number');
        expect(typeof row.enterpriseValue).toBe('number');
        expect(typeof row.evToEbitda).toBe('number');
      }
    });

    it('rows are in chronological order', () => {
      for (let i = 1; i < metrics.length; i++) {
        expect(new Date(metrics[i].date).getTime()).toBeGreaterThan(new Date(metrics[i - 1].date).getTime());
      }
    });
  });

  // ── getCashFlowStatements ───────────────────────────────────────────────

  describe('getCashFlowStatements', () => {
    let rows: CashFlowRow[];

    beforeAll(async () => {
      rows = await getCashFlowStatements(TICKER);
    });

    it('returns non-empty array', () => {
      expect(rows.length).toBeGreaterThan(0);
    });

    it('each row has expected fields', () => {
      for (const row of rows.slice(0, 3)) {
        expect(typeof row.date).toBe('string');
        expect(typeof row.operatingCashFlow).toBe('number');
        expect(typeof row.capitalExpenditure).toBe('number');
        expect(typeof row.freeCashFlow).toBe('number');
        expect(typeof row.dividendsPaid).toBe('number');
      }
    });

    it('rows are in chronological order', () => {
      for (let i = 1; i < rows.length; i++) {
        expect(new Date(rows[i].date).getTime()).toBeGreaterThan(new Date(rows[i - 1].date).getTime());
      }
    });
  });

  // ── getBalanceSheetStatements ───────────────────────────────────────────

  describe('getBalanceSheetStatements', () => {
    let rows: BalanceSheetRow[];

    beforeAll(async () => {
      rows = await getBalanceSheetStatements(TICKER);
    });

    it('returns non-empty array', () => {
      expect(rows.length).toBeGreaterThan(0);
    });

    it('each row has expected fields', () => {
      for (const row of rows.slice(0, 3)) {
        expect(typeof row.date).toBe('string');
        expect(typeof row.totalAssets).toBe('number');
        expect(typeof row.totalLiabilities).toBe('number');
        expect(typeof row.totalStockholdersEquity).toBe('number');
        expect(typeof row.netDebt).toBe('number');
        expect(typeof row.totalDebt).toBe('number');
        expect(typeof row.cashAndShortTermInvestments).toBe('number');
      }
    });

    it('totalAssets > 0 for AAPL', () => {
      for (const row of rows) {
        expect(row.totalAssets).toBeGreaterThan(0);
      }
    });
  });

  // ── getFinancialScores ──────────────────────────────────────────────────

  describe('getFinancialScores', () => {
    let scores: FinancialScores | null;

    beforeAll(async () => {
      scores = await getFinancialScores(TICKER);
    });

    it('returns non-null result', () => {
      expect(scores).not.toBeNull();
    });

    it('has expected fields', () => {
      expect(typeof scores!.symbol).toBe('string');
      expect(typeof scores!.altmanZScore).toBe('number');
      expect(typeof scores!.piotroskiScore).toBe('number');
    });

    it('piotroskiScore is between 0 and 9', () => {
      expect(scores!.piotroskiScore).toBeGreaterThanOrEqual(0);
      expect(scores!.piotroskiScore).toBeLessThanOrEqual(9);
    });
  });

  // ── getDCFValue ─────────────────────────────────────────────────────────

  describe('getDCFValue', () => {
    let dcf: DCFValue | null;

    beforeAll(async () => {
      dcf = await getDCFValue(TICKER);
    });

    it('returns non-null result', () => {
      expect(dcf).not.toBeNull();
    });

    it('has expected fields', () => {
      expect(typeof dcf!.symbol).toBe('string');
      expect(typeof dcf!.dcf).toBe('number');
      expect(typeof dcf!.price).toBe('number');
    });

    it('dcf is a non-zero number', () => {
      expect(dcf!.dcf).not.toBe(0);
    });
  });

  // ── getTickerNews ───────────────────────────────────────────────────────

  describe('getTickerNews', () => {
    let news: NewsItem[];

    beforeAll(async () => {
      news = await getTickerNews(TICKER, 5);
    });

    it('returns an array', () => {
      expect(Array.isArray(news)).toBe(true);
    });

    it('each item has title, link, publisher', () => {
      for (const item of news.slice(0, 3)) {
        expect(typeof item.title).toBe('string');
        expect(item.title.length).toBeGreaterThan(0);
        expect(typeof item.link).toBe('string');
        expect(typeof item.publisher).toBe('string');
      }
    });

    it('providerPublishTime is a valid Date when present', () => {
      for (const item of news.slice(0, 3)) {
        if (item.providerPublishTime) {
          expect(item.providerPublishTime).toBeInstanceOf(Date);
          expect(item.providerPublishTime.getTime()).not.toBeNaN();
        }
      }
    });
  });

  // ── getAllNews ───────────────────────────────────────────────────────────

  describe('getAllNews', () => {
    let result: { general: NewsItem[]; specific: Record<string, NewsItem[]> };

    beforeAll(async () => {
      result = await getAllNews();
    });

    it('returns general array', () => {
      expect(Array.isArray(result.general)).toBe(true);
    });

    it('returns specific as a record', () => {
      expect(typeof result.specific).toBe('object');
      expect(result.specific).not.toBeNull();
    });

    it('specific has at least one ticker key', () => {
      expect(Object.keys(result.specific).length).toBeGreaterThan(0);
    });

    it('each specific ticker entry is an array of NewsItem', () => {
      const firstKey = Object.keys(result.specific)[0];
      const items = result.specific[firstKey];
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      expect(typeof items[0].title).toBe('string');
      expect(typeof items[0].link).toBe('string');
    });
  });

  // ── getGeneralMarketNews ────────────────────────────────────────────────

  describe('getGeneralMarketNews', () => {
    let news: NewsItem[];

    beforeAll(async () => {
      news = await getGeneralMarketNews(10);
    });

    it('returns an array', () => {
      expect(Array.isArray(news)).toBe(true);
    });

    it('respects limit', () => {
      expect(news.length).toBeLessThanOrEqual(10);
    });

    it('each item has title and link', () => {
      for (const item of news.slice(0, 3)) {
        expect(typeof item.title).toBe('string');
        expect(typeof item.link).toBe('string');
      }
    });
  });

  // ── calculateSMA (pure) ────────────────────────────────────────────────

  describe('calculateSMA', () => {
    it('returns correct average for exact-length input', () => {
      expect(calculateSMA([1, 2, 3, 4, 5], 5)).toBeCloseTo(3);
    });

    it('uses last N values when data is longer', () => {
      expect(calculateSMA([10, 20, 1, 2, 3], 3)).toBeCloseTo(2);
    });

    it('returns null when data is shorter than period', () => {
      expect(calculateSMA([1, 2], 5)).toBeNull();
    });
  });

  // ── calculateRSI (pure) ────────────────────────────────────────────────

  describe('calculateRSI', () => {
    it('returns 100 when all changes are gains', () => {
      const rising = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
      expect(calculateRSI(rising, 14)).toBe(100);
    });

    it('returns 0 when all changes are losses', () => {
      const falling = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      expect(calculateRSI(falling, 14)).toBeCloseTo(0);
    });

    it('returns null when data length <= period', () => {
      expect(calculateRSI([1, 2, 3], 14)).toBeNull();
    });

    it('returns a value between 0 and 100 for mixed data', () => {
      const mixed = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42,
        45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00];
      const rsi = calculateRSI(mixed, 14);
      expect(rsi).not.toBeNull();
      expect(rsi!).toBeGreaterThanOrEqual(0);
      expect(rsi!).toBeLessThanOrEqual(100);
    });
  });

  // ── Schema drift detection ────────────────────────────────────────────
  // Compare raw FMP API responses against captured fixtures to detect
  // fields that were added or removed since we last recorded them.

  describe('Schema drift detection', () => {
    function assertNoSchemaDrift(live: unknown, fixtureName: string) {
      const fixture = loadFixture(fixtureName);
      const liveShape = new Set(extractShape(live));
      const fixtureShape = new Set(extractShape(fixture));
      const added = [...liveShape].filter(k => !fixtureShape.has(k));
      const removed = [...fixtureShape].filter(k => !liveShape.has(k));
      expect(added, `New fields in live API not in ${fixtureName}: ${added.join(', ')}`).toEqual([]);
      expect(removed, `Fields in ${fixtureName} missing from live API: ${removed.join(', ')}`).toEqual([]);
    }

    it('profile matches fmp-profile-aapl.json fixture shape', async () => {
      const live = await fetchFMPRaw('profile', { symbol: TICKER });
      assertNoSchemaDrift(live, 'fmp-profile-aapl.json');
    });

    it('income-statement matches fmp-income-statement.json fixture shape', async () => {
      const live = await fetchFMPRaw('income-statement', { symbol: TICKER, period: 'annual' });
      assertNoSchemaDrift(live, 'fmp-income-statement.json');
    });

    it('historical-price-eod matches fmp-historical-eod.json fixture shape', async () => {
      const today = new Date();
      const from = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];
      const live = await fetchFMPRaw('historical-price-eod/full', { symbol: TICKER, from, to });
      assertNoSchemaDrift(live, 'fmp-historical-eod.json');
    });

    it('key-metrics matches fmp-key-metrics.json fixture shape', async () => {
      const live = await fetchFMPRaw('key-metrics', { symbol: TICKER, period: 'annual' });
      assertNoSchemaDrift(live, 'fmp-key-metrics.json');
    });

    it('cash-flow-statement matches fmp-cash-flow.json fixture shape', async () => {
      const live = await fetchFMPRaw('cash-flow-statement', { symbol: TICKER, period: 'annual' });
      assertNoSchemaDrift(live, 'fmp-cash-flow.json');
    });

    it('balance-sheet-statement matches fmp-balance-sheet.json fixture shape', async () => {
      const live = await fetchFMPRaw('balance-sheet-statement', { symbol: TICKER, period: 'annual' });
      assertNoSchemaDrift(live, 'fmp-balance-sheet.json');
    });

    it('financial-scores matches fmp-financial-scores.json fixture shape', async () => {
      const live = await fetchFMPRaw('financial-scores', { symbol: TICKER });
      assertNoSchemaDrift(live, 'fmp-financial-scores.json');
    });

    it('discounted-cash-flow matches fmp-dcf.json fixture shape', async () => {
      const live = await fetchFMPRaw('discounted-cash-flow', { symbol: TICKER });
      assertNoSchemaDrift(live, 'fmp-dcf.json');
    });

    it('news/stock matches fmp-ticker-news.json fixture shape', async () => {
      const live = await fetchFMPRaw('news/stock', { symbols: TICKER, limit: '2' });
      assertNoSchemaDrift(live, 'fmp-ticker-news.json');
    });

    it('news/stock-latest matches fmp-stock-latest-news.json fixture shape', async () => {
      const live = await fetchFMPRaw('news/stock-latest', { limit: '2' });
      assertNoSchemaDrift(live, 'fmp-stock-latest-news.json');
    });

    it('news/general-latest matches fmp-general-latest-news.json fixture shape', async () => {
      const live = await fetchFMPRaw('news/general-latest', { limit: '2' });
      assertNoSchemaDrift(live, 'fmp-general-latest-news.json');
    });
  });
});

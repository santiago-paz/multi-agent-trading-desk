import fs from 'fs';
import path from 'path';
import type {
  CompanyProfile,
  IncomeStatementRow,
  HistoricalRow,
  NewsItem,
  ComprehensiveAssetData,
  KeyMetricsRow,
  CashFlowRow,
  BalanceSheetRow,
  FinancialScores,
  DCFValue,
} from './types';

export type {
  CompanyProfile,
  IncomeStatementRow,
  HistoricalRow,
  NewsItem,
  ComprehensiveAssetData,
  KeyMetricsRow,
  CashFlowRow,
  BalanceSheetRow,
  FinancialScores,
  DCFValue,
};

const COMPANY_NAMES_CACHE_PATH = path.join(process.cwd(), '.company-names-cache.json');

function readCompanyNamesCache(): Record<string, string> {
  try {
    const raw = fs.readFileSync(COMPANY_NAMES_CACHE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeCompanyNamesCache(cache: Record<string, string>) {
  try {
    fs.writeFileSync(COMPANY_NAMES_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write company names cache:', e);
  }
}

function getFMPApiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error('FMP_API_KEY not set');
  return key;
}

export async function getCompanyNames(symbols: string[]): Promise<Record<string, string>> {
  const cache = readCompanyNamesCache();
  const missing = symbols.filter(s => !(s in cache));

  if (missing.length > 0) {
    const apiKey = getFMPApiKey();
    const results = await Promise.allSettled(
      missing.map(async (symbol) => {
        const url = `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].companyName) {
          return { symbol, name: data[0].companyName as string };
        }
        return null;
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        cache[r.value.symbol] = r.value.name;
      }
    }
    writeCompanyNamesCache(cache);
  }

  return Object.fromEntries(symbols.map(s => [s, cache[s] ?? s]));
}

export async function getCompanyProfile(fmpTicker: string): Promise<CompanyProfile | null> {
  const apiKey = getFMPApiKey();
  const url = `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(fmpTicker)}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return data[0] as CompanyProfile;
  }
  return null;
}

export async function getIncomeStatements(fmpTicker: string, period: 'annual' | 'quarter' = 'annual'): Promise<IncomeStatementRow[]> {
  const apiKey = getFMPApiKey();
  const url = `https://financialmodelingprep.com/stable/income-statement?symbol=${encodeURIComponent(fmpTicker)}&period=${period}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((row: Record<string, unknown>) => ({
    date: row.date as string,
    revenue: (row.revenue as number) ?? 0,
    netIncome: (row.netIncome as number) ?? 0,
    grossProfit: (row.grossProfit as number) ?? 0,
    operatingIncome: (row.operatingIncome as number) ?? 0,
    eps: (row.eps as number) ?? 0,
  })).reverse(); // chronological order
}

export async function getHistoricalData(symbol: string, days: number = 30): Promise<HistoricalRow[]> {
  try {
    const apiKey = getFMPApiKey();
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);

    const from = startDate.toISOString().split('T')[0];
    const to = today.toISOString().split('T')[0];

    const url = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FMP API error: ${res.status}`);

    const data: { date: string; open: number; high: number; low: number; close: number; volume: number }[] = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`No data returned from FMP for ${symbol}`);
    }

    // FMP returns newest-first; reverse to chronological order
    return data
      .filter(row => row.close != null)
      .reverse()
      .map(row => ({
        date: new Date(row.date),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
      }));
  } catch (error) {
    console.warn(`No FMP data for ${symbol}:`, (error as Error).message);
    throw error;
  }
}

export async function getHistoricalPrices(symbol: string, days: number = 30): Promise<string> {
  try {
    const result = await getHistoricalData(symbol, days);
    const prices = result.map(quote => quote.close.toFixed(2)).join(', ');
    return `Price trend for last ${days} days: ${prices}`;
  } catch (error) {
    return `Error fetching data for ${symbol}: ${(error as Error).message}`;
  }
}

// ── FMP News API ────────────────────────────────────────────────────────────
// The /stable/news/stock endpoint ignores the `tickers` filter (FMP bug as of
// March 2026), so we use /stable/news/stock-latest which returns a chronological
// feed across all symbols, and filter client-side.

interface FMPNewsArticle {
  symbol: string | null;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

function mapFMPToNewsItem(article: FMPNewsArticle): NewsItem {
  return {
    title: typeof article.title === 'string' ? article.title : String(article.title ?? ''),
    link: article.url,
    publisher: article.site,
    providerPublishTime: new Date(article.publishedDate),
    relatedTickers: article.symbol ? [article.symbol] : undefined,
    text: typeof article.text === 'string' ? article.text : undefined,
    image: article.image,
  };
}

async function fetchFMPLatestNews(limit: number = 200): Promise<FMPNewsArticle[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new Error('FMP_API_KEY not set');
  const url = `https://financialmodelingprep.com/stable/news/stock-latest?limit=${limit}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP API error: ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Broad market / macro headlines (not tied to a single ticker). */
async function fetchFMPGeneralLatestNews(limit: number = 200): Promise<FMPNewsArticle[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new Error('FMP_API_KEY not set');
  const url = `https://financialmodelingprep.com/stable/news/general-latest?limit=${limit}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP API error: ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetches general market news (general-latest) and per-ticker news (stock-latest).
 * Stock feed entries almost always carry a `symbol`, so "general" would stay empty if we
 * only split stock-latest by missing symbol — hence the dedicated general endpoint.
 */
export async function getAllNews(): Promise<{ general: NewsItem[]; specific: Record<string, NewsItem[]> }> {
  try {
    const [stockSettled, generalSettled] = await Promise.allSettled([
      fetchFMPLatestNews(2000),
      fetchFMPGeneralLatestNews(200),
    ]);

    if (stockSettled.status === 'rejected') {
      console.error('FMP stock-latest failed:', stockSettled.reason);
    }
    if (generalSettled.status === 'rejected') {
      console.error('FMP general-latest failed:', generalSettled.reason);
    }

    const articles = stockSettled.status === 'fulfilled' ? stockSettled.value : [];
    const generalRaw = generalSettled.status === 'fulfilled' ? generalSettled.value : [];

    const specific: Record<string, NewsItem[]> = {};
    const general: NewsItem[] = generalRaw.map(mapFMPToNewsItem);

    // Legacy fallback: older FMP rows sometimes omitted symbol on broad stock feed items
    if (general.length === 0) {
      for (const article of articles) {
        const sym = article.symbol?.toUpperCase().trim() ?? '';
        if (!sym) {
          general.push(mapFMPToNewsItem(article));
        }
      }
    }

    for (const article of articles) {
      const sym = article.symbol?.toUpperCase().trim() ?? '';
      if (!sym) continue;
      if (!specific[sym]) specific[sym] = [];
      specific[sym].push(mapFMPToNewsItem(article));
    }

    return { general, specific };
  } catch (error) {
    console.error('Error fetching FMP news:', error);
    return { general: [], specific: {} };
  }
}

export async function getNews(ticker: string, count: number = 5): Promise<NewsItem[]> {
  try {
    const { specific } = await getAllNews();
    return (specific[ticker.toUpperCase()] ?? []).slice(0, count);
  } catch (error) {
    console.error(`Error fetching FMP news for ${ticker}:`, error);
    return [];
  }
}

export async function getGeneralMarketNews(count: number = 5): Promise<NewsItem[]> {
  try {
    const { general } = await getAllNews();
    return general.slice(0, count);
  } catch (error) {
    console.error('Error fetching FMP general news:', error);
    return [];
  }
}

// ── Advanced Financial Data ────────────────────────────────────────────────

export async function getKeyMetrics(fmpTicker: string, period: 'annual' | 'quarter' = 'annual'): Promise<KeyMetricsRow[]> {
  const apiKey = getFMPApiKey();
  const url = `https://financialmodelingprep.com/stable/key-metrics?symbol=${encodeURIComponent(fmpTicker)}&period=${period}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((row: Record<string, unknown>) => ({
    date: row.date as string,
    peRatio: (row.peRatio as number) ?? 0,
    pbRatio: (row.pbRatio as number) ?? 0,
    roe: (row.returnOnEquity as number) ?? 0,
    roa: (row.returnOnAssets as number) ?? 0,
    debtToEquity: (row.debtToEquity as number) ?? 0,
    currentRatio: (row.currentRatio as number) ?? 0,
    dividendYield: (row.dividendYield as number) ?? 0,
    enterpriseValue: (row.enterpriseValue as number) ?? 0,
    evToEbitda: (row.evToEbitda as number) ?? 0,
  })).reverse();
}

export async function getCashFlowStatements(fmpTicker: string, period: 'annual' | 'quarter' = 'annual'): Promise<CashFlowRow[]> {
  const apiKey = getFMPApiKey();
  const url = `https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${encodeURIComponent(fmpTicker)}&period=${period}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((row: Record<string, unknown>) => ({
    date: row.date as string,
    operatingCashFlow: (row.operatingCashFlow as number) ?? 0,
    capitalExpenditure: (row.capitalExpenditure as number) ?? 0,
    freeCashFlow: (row.freeCashFlow as number) ?? 0,
    dividendsPaid: (row.dividendsPaid as number) ?? 0,
  })).reverse();
}

export async function getBalanceSheetStatements(fmpTicker: string, period: 'annual' | 'quarter' = 'annual'): Promise<BalanceSheetRow[]> {
  const apiKey = getFMPApiKey();
  const url = `https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${encodeURIComponent(fmpTicker)}&period=${period}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((row: Record<string, unknown>) => ({
    date: row.date as string,
    totalAssets: (row.totalAssets as number) ?? 0,
    totalLiabilities: (row.totalLiabilities as number) ?? 0,
    totalStockholdersEquity: (row.totalStockholdersEquity as number) ?? 0,
    netDebt: (row.netDebt as number) ?? 0,
    totalDebt: (row.totalDebt as number) ?? 0,
    cashAndShortTermInvestments: (row.cashAndShortTermInvestments as number) ?? 0,
  })).reverse();
}

export async function getFinancialScores(fmpTicker: string): Promise<FinancialScores | null> {
  const apiKey = getFMPApiKey();
  const url = `https://financialmodelingprep.com/stable/financial-scores?symbol=${encodeURIComponent(fmpTicker)}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    const row = data[0];
    return {
      symbol: row.symbol as string,
      altmanZScore: (row.altmanZScore as number) ?? 0,
      piotroskiScore: (row.piotroskiScore as number) ?? 0,
    };
  }
  return null;
}

export async function getDCFValue(fmpTicker: string): Promise<DCFValue | null> {
  const apiKey = getFMPApiKey();
  const url = `https://financialmodelingprep.com/stable/discounted-cash-flow?symbol=${encodeURIComponent(fmpTicker)}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    const row = data[0];
    return {
      symbol: row.symbol as string,
      dcf: (row.dcf as number) ?? 0,
      price: (row.stockPrice as number) ?? 0,
    };
  }
  return null;
}

/** Fetch news for a specific ticker directly (lightweight, no bulk fetch). */
export async function getTickerNews(fmpTicker: string, limit: number = 20): Promise<NewsItem[]> {
  const apiKey = getFMPApiKey();
  const url = `https://financialmodelingprep.com/stable/news/stock?symbols=${encodeURIComponent(fmpTicker)}&limit=${limit}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data: unknown = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((a: FMPNewsArticle) => mapFMPToNewsItem(a));
}

// --- Technical Indicators Math ---

export function calculateSMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(data.length - period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

export function calculateRSI(data: number[], period: number = 14): number | null {
  if (data.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = data.length - period; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export async function getComprehensiveAssetData(symbol: string): Promise<ComprehensiveAssetData | null> {
  try {
    // 1. Fetch 60 days to have enough runway for SMA50
    const history = await getHistoricalData(symbol, 60);
    if (!history || history.length === 0) return null;

    const closingPrices = history.map(h => h.close);
    const currentPrice = closingPrices[closingPrices.length - 1];

    // 2. Compute Technicals
    const sma20 = calculateSMA(closingPrices, 20);
    const sma50 = calculateSMA(closingPrices, 50);
    const rsi14 = calculateRSI(closingPrices, 14);

    // 3. Fetch News (FMP already includes article text)
    const recentNews = await getNews(symbol, 3);

    return {
      symbol,
      currentPrice,
      historicalPrices: history.slice(-30), // keep payload small
      technicals: {
        sma20,
        sma50,
        rsi14,
        priceToSMA20Ratio: sma20 ? (currentPrice / sma20) : null
      },
      recentNews
    };
  } catch (error) {
    console.error(`Error building comprehensive data for ${symbol}:`, error);
    return null;
  }
}

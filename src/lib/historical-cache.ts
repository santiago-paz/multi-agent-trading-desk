import fs from 'fs';
import path from 'path';
import { ComprehensiveAssetData, HistoricalRow } from './market-data';
import { IOLHistoricalEntry } from './iol/types';

const CACHE_PATH = path.join(process.cwd(), '.historical_cache.json');
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  symbol: string;
  data: ComprehensiveAssetData;
  fetchedAt: string;
}

interface CacheFile {
  entries: Record<string, CacheEntry>;
}

// ── Read / Write ──────────────────────────────────────────────────────────────

function readCache(): CacheFile {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    return JSON.parse(raw) as CacheFile;
  } catch {
    return { entries: {} };
  }
}

function writeCache(cache: CacheFile): void {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache), 'utf-8');
  } catch (e) {
    console.warn('[HIST CACHE] Failed to write cache:', e);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getCachedAssetData(symbol: string): ComprehensiveAssetData | null {
  const cache = readCache();
  const entry = cache.entries[symbol];
  if (!entry) return null;

  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  if (age > MAX_AGE_MS) return null;

  // Rehydrate Date objects (JSON serialization turns them into strings)
  entry.data.historicalPrices = entry.data.historicalPrices.map(h => ({
    ...h,
    date: new Date(h.date),
  }));

  return entry.data;
}

export function setCachedAssetData(symbol: string, data: ComprehensiveAssetData): void {
  const cache = readCache();
  cache.entries[symbol] = { symbol, data, fetchedAt: new Date().toISOString() };
  writeCache(cache);
}

export function bulkSetCachedAssetData(items: { symbol: string; data: ComprehensiveAssetData }[]): void {
  const cache = readCache();
  const now = new Date().toISOString();
  for (const item of items) {
    cache.entries[item.symbol] = { symbol: item.symbol, data: item.data, fetchedAt: now };
  }
  writeCache(cache);
}

// ── Helpers to build ComprehensiveAssetData from IOL series ───────────────────

function sma(arr: number[], n: number): number | null {
  if (arr.length < n) return null;
  return arr.slice(-n).reduce((s, v) => s + v, 0) / n;
}

function rsi(arr: number[], n = 14): number | null {
  if (arr.length <= n) return null;
  let gains = 0, losses = 0;
  for (let i = arr.length - n; i < arr.length; i++) {
    const d = arr[i] - arr[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  const avgLoss = losses / n;
  return avgLoss === 0 ? 100 : 100 - (100 / (1 + gains / n / avgLoss));
}

export function buildAssetDataFromIOLSeries(symbol: string, series: IOLHistoricalEntry[]): ComprehensiveAssetData | null {
  if (!series || series.length === 0) return null;

  const historicalPrices: HistoricalRow[] = series.map(e => ({
    date: new Date(e.fecha),
    open: e.apertura,
    high: e.maximo,
    low: e.minimo,
    close: e.ultimoPrecio,
    volume: e.volumen,
  }));

  const closes = historicalPrices.map(h => h.close);
  const currentPrice = closes[closes.length - 1];
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const rsi14 = rsi(closes);

  return {
    symbol,
    currentPrice,
    historicalPrices: historicalPrices.slice(-30),
    technicals: {
      sma20,
      sma50,
      rsi14,
      priceToSMA20Ratio: sma20 ? currentPrice / sma20 : null,
    },
    recentNews: [],
  };
}

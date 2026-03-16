import YahooFinance from 'yahoo-finance2';
import { processNewsBatch } from './news-processor';

const yahooFinance = new YahooFinance();

export interface HistoricalRow {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose?: number;
  volume: number;
}

export interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  providerPublishTime?: Date;
  relatedTickers?: string[];
  summary?: string;
  fullContent?: string;
}

// Emulating Comprehensive data that the AI Hedge Fund Python agents consume
export interface ComprehensiveAssetData {
  symbol: string;
  currentPrice: number;
  historicalPrices: HistoricalRow[];
  technicals: {
    sma20: number | null;
    sma50: number | null;
    rsi14: number | null;
    priceToSMA20Ratio: number | null;
  };
  recentNews: NewsItem[];
}

export async function getHistoricalData(symbol: string, days: number = 30): Promise<HistoricalRow[]> {
  try {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);

    // Format dates as YYYY-MM-DD
    const period1 = startDate.toISOString().split('T')[0];
    const period2 = today.toISOString().split('T')[0];

    const queryOptions = { period1, period2, interval: '1d' as const };

    // Use chart() instead of historical() as historical() is deprecated.
    // validateResult: false suppresses schema-validation noise for symbols Yahoo
    // partially supports (non-US exchanges, OTC, etc.); we handle missing data below.
    const result = await yahooFinance.chart(symbol, queryOptions, { validateResult: false });
    
    if (!result || !result.quotes) {
      throw new Error('No data returned from Yahoo Finance');
    }

    // Map the chart result to our HistoricalRow format
    return result.quotes
      .filter(quote => quote.date && quote.close !== null)
      .map(quote => ({
        date: quote.date,
        open: quote.open || 0,
        high: quote.high || 0,
        low: quote.low || 0,
        close: quote.close || 0,
        adjClose: quote.adjclose || undefined,
        volume: quote.volume || 0,
      }));
  } catch (error) {
    console.warn(`No Yahoo Finance data for ${symbol}:`, (error as Error).message);
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

export async function getNews(query: string, count: number = 5): Promise<NewsItem[]> {
  try {
    const result = await yahooFinance.search(query, { newsCount: count });
    if (!result.news || result.news.length === 0) {
      return [];
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.news.map((item: any) => ({
      title: item.title,
      link: item.link,
      publisher: item.publisher,
      providerPublishTime: item.providerPublishTime ? new Date(item.providerPublishTime) : undefined,
      relatedTickers: item.relatedTickers
    }));
  } catch (error) {
    console.error(`Error fetching news for ${query}:`, error);
    return [];
  }
}

export async function getGeneralMarketNews(count: number = 5): Promise<NewsItem[]> {
  // Use SPY (S&P 500 ETF) as a proxy for general market news
  return getNews('SPY', count);
}

// --- Technical Indicators Math ---

function calculateSMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(data.length - period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

function calculateRSI(data: number[], period: number = 14): number | null {
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

    // 3. Fetch News and Summarize
    const rawNews = await getNews(symbol, 3); // Get 3 most recent articles
    const processedNews = await processNewsBatch(rawNews);

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
      recentNews: processedNews
    };
  } catch (error) {
    console.error(`Error building comprehensive data for ${symbol}:`, error);
    return null;
  }
}

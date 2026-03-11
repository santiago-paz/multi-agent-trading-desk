import YahooFinance from 'yahoo-finance2';

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

export async function getHistoricalData(symbol: string, days: number = 30): Promise<HistoricalRow[]> {
  try {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);

    // Format dates as YYYY-MM-DD
    const period1 = startDate.toISOString().split('T')[0];
    const period2 = today.toISOString().split('T')[0];

    const queryOptions = { period1, period2, interval: '1d' as const };
    
    // Use chart() instead of historical() as historical() is deprecated
    const result = await yahooFinance.chart(symbol, queryOptions);
    
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
    console.error(`Error fetching data for ${symbol}:`, error);
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

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

export async function getHistoricalData(symbol: string, days: number = 30): Promise<HistoricalRow[]> {
  try {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);

    // Format dates as YYYY-MM-DD
    const period1 = startDate.toISOString().split('T')[0];
    const period2 = today.toISOString().split('T')[0];

    const queryOptions = { period1, period2, interval: '1d' as const };
    // Cast the result to unknown and then to our interface to avoid type inference issues
    const result = await yahooFinance.historical(symbol, queryOptions) as unknown as HistoricalRow[];
    
    return result;
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

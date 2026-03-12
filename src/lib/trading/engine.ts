import { iolClient } from '../iol/client';
import { OrderRequest } from '../iol/types';
import { IMarketDataClient } from './interfaces';

// CEDEAR Ratios: How many CEDEARs equal one underlying share
export const CEDEAR_RATIOS: Record<string, number> = {
  AAPL: 10,  // Apple
  AMZN: 144, // Amazon
  GOOGL: 58, // Alphabet
  MSFT: 10,  // Microsoft
  TSLA: 15,  // Tesla
  KO: 5,     // Coca-Cola
  // Add more as needed
};

export interface TargetAllocation {
  symbol: string;
  percentage: number; // 0 to 1
}

export class TradingEngine {
  private initialCapitalUSD = 1000;

  constructor(private client: IMarketDataClient) {}

  async calculatePortfolioValue(): Promise<number> {
    const portfolio = await this.client.getPortfolio();
    const ccl = await this.client.getCCL();

    let totalValueARS = 0;
    
    // Sum up the value of all assets in ARS
    const activos = portfolio?.activos;
    if (!activos || !Array.isArray(activos)) {
      console.warn('[Trading Engine] Portfolio activos is not available, returning 0');
      return 0;
    }
    for (const asset of activos) {
      totalValueARS += asset.valorizado;
    }

    // Convert to USD using CCL
    return totalValueARS / ccl;
  }

  async generateRebalancingOrders(targetAllocations: TargetAllocation[]): Promise<OrderRequest[]> {
    const portfolio = await this.client.getPortfolio();
    
    const activos = portfolio?.activos;
    if (!activos || !Array.isArray(activos)) {
      console.warn('[Trading Engine] Portfolio activos is not available, skipping rebalancing');
      return [];
    }

    // Calculate total portfolio value in ARS
    // We sum up all assets' current value.
    const totalPortfolioValueARS = activos.reduce((acc, asset) => acc + asset.valorizado, 0);

    const orders: OrderRequest[] = [];

    for (const target of targetAllocations) {
      const { symbol, percentage } = target;
      
      // Find current holding
      const asset = activos.find(a => a.titulo.simbolo === symbol);
      const currentValueARS = asset ? asset.valorizado : 0;
      
      const targetValueARS = totalPortfolioValueARS * percentage;
      const differenceARS = targetValueARS - currentValueARS;
      
      // Get current price of the asset (CEDEAR)
      // We need the local price in ARS
      const quote = await this.client.getQuote(symbol);
      const priceARS = quote.ultimoPrecio;

      if (!priceARS || priceARS === 0) {
        console.warn(`Could not get price for ${symbol}, skipping rebalance.`);
        continue;
      }

      // Calculate number of shares to buy or sell
      const sharesToTrade = Math.floor(Math.abs(differenceARS) / priceARS);

      if (sharesToTrade > 0) {
        const side = differenceARS > 0 ? 'buy' : 'sell';
        
        orders.push({
          simbolo: symbol,
          cantidad: sharesToTrade,
          tipo: 'market', // Market order for simplicity in rebalancing
          plazo: 't0', // Contado Inmediato
          side: side
        });
      }
    }

    return orders;
  }
}

export const tradingEngine = new TradingEngine(iolClient);

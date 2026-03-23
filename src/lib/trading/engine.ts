import { iolClient } from '../iol/client';
import { PortfolioResponse, EstadoCuenta } from '../iol/types';

interface IPortfolioClient {
  getPortfolio(): Promise<PortfolioResponse>;
  getEstadoCuenta(): Promise<EstadoCuenta>;
  getMEP(): Promise<number>;
}

export class TradingEngine {
  constructor(private client: IPortfolioClient) {}

  /** Pure calculation — use when data is already fetched to avoid duplicate API calls. */
  calculatePortfolioValueFromData(portfolio: PortfolioResponse, estadoCuenta: EstadoCuenta, mep: number): number {
    let totalValueARS = 0;

    const activos = portfolio?.activos;
    if (!activos || !Array.isArray(activos)) {
      console.warn('[Trading Engine] Portfolio activos is not available, returning 0');
      return 0;
    }
    for (const asset of activos) {
      totalValueARS += asset.valorizado;
    }

    let cashUSD = 0;
    for (const cuenta of estadoCuenta?.cuentas ?? []) {
      if (cuenta.moneda === 'peso_Argentino') {
        cashUSD += cuenta.disponible / mep;
      } else if (cuenta.moneda === 'dolar_Estadounidense') {
        cashUSD += cuenta.disponible;
      }
    }

    return totalValueARS / mep + cashUSD;
  }

  /** Convenience async wrapper — fetches data then calculates. */
  async calculatePortfolioValue(): Promise<number> {
    const [portfolio, estadoCuenta, mep] = await Promise.all([
      this.client.getPortfolio(),
      this.client.getEstadoCuenta(),
      this.client.getMEP(),
    ]);
    return this.calculatePortfolioValueFromData(portfolio, estadoCuenta, mep);
  }
}

export const tradingEngine = new TradingEngine(iolClient);

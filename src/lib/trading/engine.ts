import { iolClient } from '../iol/client';
import { PortfolioResponse, EstadoCuenta } from '../iol/types';

interface IPortfolioClient {
  getPortfolio(): Promise<PortfolioResponse>;
  getEstadoCuenta(): Promise<EstadoCuenta>;
  getMEP(): Promise<number>;
}

export class TradingEngine {
  constructor(private client: IPortfolioClient) {}

  async calculatePortfolioValue(): Promise<number> {
    const [portfolio, estadoCuenta, mep] = await Promise.all([
      this.client.getPortfolio(),
      this.client.getEstadoCuenta(),
      this.client.getMEP(),
    ]);

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

    // Add cash balances
    let cashUSD = 0;
    for (const cuenta of estadoCuenta?.cuentas ?? []) {
      if (cuenta.moneda === 'peso_Argentino') {
        cashUSD += cuenta.disponible / mep;
      } else if (cuenta.moneda === 'dolar_Estadounidense') {
        cashUSD += cuenta.disponible;
      }
    }

    // Convert to USD using MEP
    return totalValueARS / mep + cashUSD;
  }
}

export const tradingEngine = new TradingEngine(iolClient);

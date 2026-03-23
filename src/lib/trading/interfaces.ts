import { PortfolioResponse, Quote, OrderRequest, OrderResponse, Operation, EstadoCuenta } from '../iol/types';

export interface IMarketDataClient {
  getPortfolio(): Promise<PortfolioResponse>;
  getEstadoCuenta(): Promise<EstadoCuenta>;
  getMEP(): Promise<number>;
  getQuote(symbol: string, market?: string): Promise<Quote>;
}

export interface ITradingClient {
  placeOrder(order: OrderRequest): Promise<OrderResponse>;
  getOperations(daysToFetch?: number): Promise<Operation[]>;
}

export interface IBrokerClient extends IMarketDataClient, ITradingClient {}

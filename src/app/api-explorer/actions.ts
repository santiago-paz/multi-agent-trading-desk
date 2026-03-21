'use server';

import { iolClient } from '@/lib/iol/client';

export interface ApiResult {
  data: unknown;
  error?: string;
  timing: number;
}

async function timed<T>(fn: () => Promise<T>): Promise<ApiResult> {
  const start = Date.now();
  try {
    const data = await fn();
    return { data, timing: Date.now() - start };
  } catch (err: any) {
    return { data: null, error: err?.message ?? String(err), timing: Date.now() - start };
  }
}

export async function callGetPortfolio(): Promise<ApiResult> {
  return timed(() => iolClient.getPortfolio());
}

export async function callGetQuote(symbol: string, market: string = 'bcba'): Promise<ApiResult> {
  return timed(() => iolClient.getQuote(symbol, market));
}

export async function callGetPanelQuotes(instrumento: string, pais: string = 'argentina'): Promise<ApiResult> {
  return timed(() => iolClient.getPanelQuotes(instrumento, pais));
}

export async function callGetOperations(days: number = 30): Promise<ApiResult> {
  return timed(() => iolClient.getOperations(days));
}

export async function callGetEstadoCuenta(): Promise<ApiResult> {
  return timed(() => iolClient.getEstadoCuenta());
}

export async function callGetDatosPerfil(): Promise<ApiResult> {
  return timed(() => iolClient.getDatosPerfil());
}

export async function callGetHistoricalSeries(symbol: string, days: number = 60, market: string = 'BCBA'): Promise<ApiResult> {
  return timed(() => iolClient.getHistoricalSeries(symbol, days, market));
}

export async function callGetMEP(): Promise<ApiResult> {
  return timed(() => iolClient.getMEP());
}

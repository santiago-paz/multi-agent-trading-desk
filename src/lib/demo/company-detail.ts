import type {
  CompanyProfile, IncomeStatementRow, KeyMetricsRow, CashFlowRow,
  BalanceSheetRow, FinancialScores, DCFValue, NewsItem, SymbolSearchHit,
} from '@/lib/fmp/types';
import { hashString } from './seed';
import { DEMO_COMPANY_NAMES, DEMO_BASE_PRICES } from './data';
import { toFmpTicker, isEtf } from '@/lib/cedear-map';

interface CompanyDetailResult {
  fmpTicker: string | null;
  profile: CompanyProfile | null;
  isEtf: boolean;
  noUsEquivalent: boolean;
  priceHistory: { date: string; close: number; volume: number }[];
  incomeStatements: IncomeStatementRow[];
}
interface AdvancedDetailResult {
  keyMetrics: KeyMetricsRow[];
  cashFlow: CashFlowRow[];
  balanceSheet: BalanceSheetRow[];
  scores: FinancialScores | null;
  dcf: DCFValue | null;
}

function basePrice(sym: string): number {
  return DEMO_BASE_PRICES[sym] ?? 50 + (hashString(sym) % 400);
}
function name(sym: string): string {
  return DEMO_COMPANY_NAMES[sym] ?? `${sym} Corp.`;
}
function lastNYears(n: number): string[] {
  const y = 2025; // fixed anchor — keep deterministic (no Date.now in generated data)
  return Array.from({ length: n }, (_, i) => `${y - i}-12-31`);
}

function demoProfile(sym: string): CompanyProfile {
  const price = basePrice(sym);
  const cap = Math.round(price * (5e8 + (hashString(sym) % 2e9)));
  return {
    symbol: sym, companyName: name(sym),
    sector: 'Technology', industry: 'Consumer Electronics',
    description: `${name(sym)} es una compañía de demostración usada en el modo demo del dashboard.`,
    mktCap: cap, price, beta: 1 + ((hashString(sym) % 100) / 100),
    volAvg: 20_000_000 + (hashString(sym) % 30_000_000),
    website: 'https://example.com', country: 'US', exchange: 'NASDAQ',
    currency: 'USD', image: `https://images.financialmodelingprep.com/symbol/${sym}.png`,
    ipoDate: '1998-01-01', isEtf: false, isActivelyTrading: true,
  };
}

function demoIncome(sym: string): IncomeStatementRow[] {
  const rev0 = Math.round(basePrice(sym) * 1e9);
  return lastNYears(4).map((date, i) => {
    const rev = Math.round(rev0 * (1 - i * 0.08));
    return { date, revenue: rev, netIncome: Math.round(rev * 0.24), grossProfit: Math.round(rev * 0.44), operatingIncome: Math.round(rev * 0.30), eps: Math.round(basePrice(sym) * 0.03 * 100) / 100 };
  });
}

export function getDemoCompanyDetail(iolBaseSymbol: string): CompanyDetailResult {
  const fmpTicker = toFmpTicker(iolBaseSymbol);
  const etf = isEtf(iolBaseSymbol);
  if (!fmpTicker) {
    return { fmpTicker: null, profile: null, isEtf: etf, noUsEquivalent: true, priceHistory: [], incomeStatements: [] };
  }
  const price = basePrice(fmpTicker);
  const priceHistory = Array.from({ length: 90 }, (_, i) => {
    const seed = hashString(`${fmpTicker}:${i}`);
    const p = Math.round(price * (0.85 + (seed % 300) / 1000) * 100) / 100;
    // deterministic descending dates from a fixed anchor
    const day = String((i % 28) + 1).padStart(2, '0');
    const month = String((i % 12) + 1).padStart(2, '0');
    return { date: `2025-${month}-${day}`, close: p, volume: 10_000_000 + (seed % 40_000_000) };
  });
  return { fmpTicker, profile: demoProfile(fmpTicker), isEtf: etf, noUsEquivalent: false, priceHistory, incomeStatements: demoIncome(fmpTicker) };
}

export function getDemoCompanyAdvancedData(fmpTicker: string): AdvancedDetailResult {
  const price = basePrice(fmpTicker);
  const keyMetrics: KeyMetricsRow[] = lastNYears(4).map((date, i) => ({
    date, peRatio: 22 - i, pbRatio: 8 - i * 0.5, roe: 0.35 - i * 0.02, roa: 0.18 - i * 0.01,
    debtToEquity: 1.2 - i * 0.05, currentRatio: 1.1, dividendYield: 0.005,
    enterpriseValue: Math.round(price * 2.5e9), evToEbitda: 18 - i,
  }));
  const cashFlow: CashFlowRow[] = lastNYears(4).map((date, i) => ({
    date, operatingCashFlow: Math.round(price * 8e8 * (1 - i * 0.06)),
    capitalExpenditure: -Math.round(price * 1e8), freeCashFlow: Math.round(price * 7e8 * (1 - i * 0.06)),
    dividendsPaid: -Math.round(price * 5e7),
  }));
  const balanceSheet: BalanceSheetRow[] = lastNYears(4).map((date, i) => ({
    date, totalAssets: Math.round(price * 3e9 * (1 - i * 0.05)), totalLiabilities: Math.round(price * 2e9),
    totalStockholdersEquity: Math.round(price * 1e9), netDebt: Math.round(price * 3e8),
    totalDebt: Math.round(price * 6e8), cashAndShortTermInvestments: Math.round(price * 3e8),
  }));
  const scores: FinancialScores = { symbol: fmpTicker, altmanZScore: 6.2, piotroskiScore: 7 };
  const dcf: DCFValue = { symbol: fmpTicker, dcf: Math.round(price * 1.1 * 100) / 100, price };
  return { keyMetrics, cashFlow, balanceSheet, scores, dcf };
}

export function getDemoCompanyNews(fmpTicker: string): NewsItem[] {
  const n = name(fmpTicker);
  return [
    { title: `${n} supera expectativas en su último reporte trimestral`, link: '#', publisher: 'Demo Wire', text: `${n} reportó ingresos por encima del consenso.`, relatedTickers: [fmpTicker], image: `https://images.financialmodelingprep.com/symbol/${fmpTicker}.png` },
    { title: `Analistas elevan el precio objetivo de ${fmpTicker}`, link: '#', publisher: 'Demo Markets', text: `Varias casas de bolsa mejoraron su visión sobre ${fmpTicker}.`, relatedTickers: [fmpTicker] },
    { title: `${n} anuncia inversión en inteligencia artificial`, link: '#', publisher: 'Demo Tech', text: `La compañía destinará capital a nuevas capacidades de IA.`, relatedTickers: [fmpTicker] },
  ];
}

export function getDemoSymbolSearch(query: string): SymbolSearchHit[] {
  const q = query.trim().toUpperCase();
  return Object.keys(DEMO_COMPANY_NAMES)
    .filter((sym) => !q || sym.includes(q) || name(sym).toUpperCase().includes(q))
    .slice(0, 15)
    .map((sym) => ({ symbol: sym, name: name(sym), exchange: 'NASDAQ', currency: 'USD', exchangeFullName: 'NASDAQ Global Select' }));
}

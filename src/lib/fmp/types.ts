/** Single row from FMP `search-symbol` (used for ticker autocomplete). */
export interface SymbolSearchHit {
  symbol: string;
  name: string;
  exchange: string;
}

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  description: string;
  mktCap: number;
  price: number;
  beta: number;
  volAvg: number;
  website: string;
  country: string;
  exchange: string;
  currency: string;
  image: string;
  ipoDate: string;
  isEtf: boolean;
  isActivelyTrading: boolean;
}

export interface IncomeStatementRow {
  date: string;
  revenue: number;
  netIncome: number;
  grossProfit: number;
  operatingIncome: number;
  eps: number;
}

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
  text?: string;
  image?: string;
}

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

export interface KeyMetricsRow {
  date: string;
  peRatio: number;
  pbRatio: number;
  roe: number;
  roa: number;
  debtToEquity: number;
  currentRatio: number;
  dividendYield: number;
  enterpriseValue: number;
  evToEbitda: number;
}

export interface CashFlowRow {
  date: string;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  dividendsPaid: number;
}

export interface BalanceSheetRow {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  totalStockholdersEquity: number;
  netDebt: number;
  totalDebt: number;
  cashAndShortTermInvestments: number;
}

export interface FinancialScores {
  symbol: string;
  altmanZScore: number;
  piotroskiScore: number;
}

export interface DCFValue {
  symbol: string;
  dcf: number;
  price: number;
}

export type PortfolioSortKey = 'ticker' | 'qty' | 'price' | 'priceUsd' | 'valuation';

/** Pages of the Auto Trader property sheet, in tab order. */
export type AutoTraderTab = 'portfolio' | 'agents' | 'settings' | 'analysis' | 'plan' | 'history';

export interface Agent {
  key: string;
  display_name: string;
  description: string;
  investing_style: string;
  order: number;
}

export interface AgentSignal {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string;
}

export interface Decision {
  action: string;
  quantity: number;
  confidence: number;
  reasoning: string;
}

export type LogStatus = 'running' | 'ok' | 'warn' | 'error';
export interface LogEntry { id: string; text: string; status: LogStatus; agent?: string; ticker?: string; detail?: string; isAnalysis?: boolean; }

export type FetchResult = 'ok' | 'empty' | 'error';

export interface ProgressEventPayload {
  agent: string;
  ticker?: string;
  status: string;
  analysis?: string;
  timestamp?: string;
  result?: FetchResult;
}

export interface OrderResult {
  ticker: string;
  side: 'buy' | 'sell';
  quantity: number;
  success: boolean;
  message: string;
}

export type Phase = 'idle' | 'loading' | 'analyzing' | 'planned' | 'confirming' | 'executing' | 'done';

export interface HistoricalOrder {
  ticker: string;
  side: string;
  quantity: number;
  priceArs: number;
  volumeArs: number;
  estimatedCostArs: number;
  reasoning: string;
  confidence: number;
}

export interface HistoricalRun {
  id: string;
  timestamp: number;
  agentKeys: string[];
  tickers: string[];
  analystSignals: Record<string, Record<string, AgentSignal>>;
  decisions: Record<string, Decision>;
  plan: {
    sells: HistoricalOrder[];
    buys: HistoricalOrder[];
    totalSellVolume: number;
    totalBuyVolume: number;
    estimatedSellProceeds: number;
    warnings: string[];
  };
  executed: boolean;
  orderResults: OrderResult[];
  snapshot: {
    cashArs: number;
    holdings: Record<string, number>;
    dailyLimit: number;
  };
  /** IOL ticker → company name, captured at run time so historical runs stay readable. */
  companyNames?: Record<string, string>;
}

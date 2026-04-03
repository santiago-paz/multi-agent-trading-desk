export type PortfolioSortKey = 'ticker' | 'qty' | 'price' | 'priceUsd' | 'valuation';

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

export type LogStatus = 'running' | 'ok' | 'error';
export interface LogEntry { id: string; text: string; status: LogStatus; agent?: string; ticker?: string; detail?: string; }

export interface OrderResult {
  ticker: string;
  side: 'buy' | 'sell';
  quantity: number;
  success: boolean;
  message: string;
}

export type Phase = 'idle' | 'loading' | 'analyzing' | 'planned' | 'confirming' | 'executing' | 'done';

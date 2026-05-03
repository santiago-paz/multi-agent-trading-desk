export interface Agent {
  key: string;
  display_name: string;
  description: string;
  investing_style: string;
  order: number;
}

export interface BacktestDayResult {
  date: string;
  portfolio_value: number;
  cash: number;
  decisions: Record<string, { action: string; quantity: number; confidence: number; reasoning: string }>;
  executed_trades: Record<string, number>;
  analyst_signals: Record<string, unknown>;
  current_prices: Record<string, number>;
  long_exposure: number;
  short_exposure: number;
  gross_exposure: number;
  net_exposure: number;
  long_short_ratio?: number;
}

export interface PerformanceMetrics {
  sharpe_ratio?: number;
  sortino_ratio?: number;
  max_drawdown?: number;
  max_drawdown_date?: string;
  long_short_ratio?: number;
  gross_exposure?: number;
  net_exposure?: number;
}

export type LogStatus = 'running' | 'ok' | 'error';

export interface LogEntry {
  id: string;
  text: string;
  status: LogStatus;
  agent?: string;
  ticker?: string;
  detail?: string;
}

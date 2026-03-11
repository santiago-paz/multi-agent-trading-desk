export interface AnalystOutput {
  symbol: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  score: number; // 0-100
  reasoning: string;
}

export interface SentinelOutput {
  riskScore: number; // -1 to 1
  sentiment: 'positive' | 'negative' | 'neutral';
  topHeadlines: {
    title: string;
    link: string;
    publisher: string;
  }[];
  reasoning: string;
}

export interface StrategistOutput {
  allocations: {
    symbol: string;
    percentage: number;
    reasoning: string;
  }[];
  overallStrategy: string;
}

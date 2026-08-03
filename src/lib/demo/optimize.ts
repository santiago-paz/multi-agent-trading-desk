import { sharesToCedears } from '@/lib/cedear-ratios';

export interface DemoOptimizeBody {
  decisions?: Record<string, { action: string; quantity: number; confidence: number; reasoning: string }>;
  current_prices_usd?: Record<string, number>;
  sell_cap_usd?: number;
  buy_cap_usd?: number;
  fx_ars_per_usd?: number;
}

interface OptimizeTrade {
  ticker: string;
  action: 'buy' | 'sell';
  shares_underlying: number;
  shares_cedear: number;
  price_usd: number;
  gross_usd: number;
  commission_usd: number;
  net_usd: number;
  price_ars_display: number;
  gross_ars_display: number;
  confidence: number;
  reasoning: string;
  agent_signals: Record<string, Record<string, unknown>>;
  is_orphan: boolean;
}

const COMMISSION = 0.0065;

// Scripted /optimize response: turns the /run decisions into a rebalance
// plan without any AI-hedge-fund backend call. Mirrors the wire shape
// `fetchOptimizedPlan` (src/lib/trading/rebalance-engine.ts) parses.
export function demoOptimize(body: DemoOptimizeBody): { trades: OptimizeTrade[] } {
  const decisions = body.decisions ?? {};
  const prices = body.current_prices_usd ?? {};
  const fx = body.fx_ars_per_usd ?? 1347.5;
  const sellCap = body.sell_cap_usd ?? Infinity;
  const buyCap = body.buy_cap_usd ?? Infinity;

  let spentBuy = 0;
  let spentSell = 0;
  const trades: OptimizeTrade[] = [];

  for (const [ticker, dec] of Object.entries(decisions)) {
    if (dec.action !== 'buy' && dec.action !== 'sell') continue;
    const priceUsd = prices[ticker] ?? 100;
    let sharesUnderlying = Math.max(1, Math.round(dec.quantity || 1));
    let grossUsd = sharesUnderlying * priceUsd;

    // Respect the per-side cap by trimming underlying share count.
    const cap = dec.action === 'buy' ? buyCap - spentBuy : sellCap - spentSell;
    if (grossUsd > cap) {
      sharesUnderlying = Math.max(0, Math.floor(cap / priceUsd));
      grossUsd = sharesUnderlying * priceUsd;
    }
    if (sharesUnderlying <= 0) continue;

    const commissionUsd = Math.round(grossUsd * COMMISSION * 100) / 100;
    const netUsd = dec.action === 'buy' ? grossUsd + commissionUsd : grossUsd - commissionUsd;
    const priceArs = Math.round(priceUsd * fx * 100) / 100;
    const sharesCedear = Math.max(1, Math.round(sharesToCedears(sharesUnderlying, ticker)));

    if (dec.action === 'buy') spentBuy += grossUsd; else spentSell += grossUsd;

    trades.push({
      ticker,
      action: dec.action,
      shares_underlying: sharesUnderlying,
      shares_cedear: sharesCedear,
      price_usd: priceUsd,
      gross_usd: Math.round(grossUsd * 100) / 100,
      commission_usd: commissionUsd,
      net_usd: Math.round(netUsd * 100) / 100,
      price_ars_display: priceArs,
      gross_ars_display: Math.round(sharesCedear * priceArs * 100) / 100,
      confidence: dec.confidence,
      reasoning: dec.reasoning,
      agent_signals: {},
      is_orphan: false,
    });
  }

  return { trades };
}

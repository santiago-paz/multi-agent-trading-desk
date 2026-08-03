import { COMMISSION_RATE } from './quick-trade';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Decision {
  action: string;        // 'buy' | 'sell' | 'hold'
  quantity: number;
  confidence: number;
  reasoning: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Translator = (key: any, params?: Record<string, string | number>) => string;

export interface RebalanceOrder {
  ticker: string;            // IOL ticker (broker-facing)
  side: 'buy' | 'sell';
  quantity: number;          // CEDEAR shares — what the broker actually trades
  priceArs: number;          // per-CEDEAR ARS price
  volumeArs: number;         // quantity * priceArs (raw, no commission)
  estimatedCostArs: number;  // buys: volume + commission; sells: commission only
  reasoning: string;
  confidence: number;
  isOrphan?: boolean;        // true for fractional-CEDEAR cleanup sells
}

export interface RebalancePlan {
  sells: RebalanceOrder[];
  buys: RebalanceOrder[];
  totalSellVolume: number;
  totalBuyVolume: number;
  totalVolume: number;
  estimatedSellProceeds: number;
  newCashUsed: number;
  remainingLimit: number;
  warnings: string[];
}

// Wire shape returned by POST /api/hedge-fund/optimize.
interface OptimizePlannedTrade {
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

interface OptimizeResponse {
  trades: OptimizePlannedTrade[];
}

export interface FetchOptimizedPlanInput {
  decisions: Record<string, Decision>;             // FMP-tickered (as /run returns)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analystSignals: Record<string, Record<string, any>>;  // FMP-tickered
  currentPricesUsd: Record<string, number>;        // FMP-tickered
  fmpToIol: Record<string, string>;                // for response remap
  iolToFmp: Record<string, string>;                // for holdings remap
  holdingsByIol: Record<string, number>;           // IOL ticker → CEDEAR shares
  arsPrices: Record<string, number>;               // IOL ticker → ARS price (last quote)
  cashArs: number;
  dailyLimitArs: number;
  effectiveMep: number;                            // ARS per USD
  commissionRate?: number;
  minTradeUsd?: number;
  liquidateOrphans?: boolean;
  apiUrl?: string;                                 // override for tests
  signal?: AbortSignal;
}

const DEFAULT_API_URL = '/api/hedge-fund/optimize';

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Calls the Python optimizer (POST /api/hedge-fund/optimize) with the agent
 * decisions and converts the response into the RebalancePlan shape the rest
 * of the auto-trader UI consumes.
 *
 * The Python optimizer owns the CEDEAR-aware logic: lot rounding by BYMA
 * ratio, orphan-CEDEAR liquidation, dust filtering and independent buy/sell
 * caps. The frontend only handles I/O remap (FMP↔IOL) and the settlement
 * warning, which the backend doesn't emit.
 */
export async function fetchOptimizedPlan(
  input: FetchOptimizedPlanInput,
  t: Translator,
): Promise<RebalancePlan> {
  const {
    decisions,
    analystSignals,
    currentPricesUsd,
    fmpToIol,
    iolToFmp,
    holdingsByIol,
    arsPrices,
    cashArs,
    dailyLimitArs,
    effectiveMep,
    commissionRate = COMMISSION_RATE,
    minTradeUsd = 5.0,
    liquidateOrphans = false,
    apiUrl = DEFAULT_API_URL,
    signal,
  } = input;

  // Holdings → FMP-tickered for the optimizer (its CEDEAR table is keyed on
  // underlying/FMP symbols). Skip empty positions; backend filters them anyway
  // but sending them inflates the payload.
  const holdings = Object.entries(holdingsByIol)
    .filter(([, qty]) => qty > 0)
    .map(([iol, qty]) => ({
      ticker: iolToFmp[iol] ?? iol,
      cedear_shares: qty,
      avg_cost_ars: 0,
      last_price_ars: arsPrices[iol] ?? null,
    }));

  // Single daily cap is split equally across both sides. The Python optimizer
  // enforces them as independent caps (which is a tighter guarantee than the
  // old TS engine's "recycle proceeds" semantics — we accept that trade-off).
  const capUsd = effectiveMep > 0 ? dailyLimitArs / effectiveMep : 0;

  const body = {
    decisions,
    analyst_signals: analystSignals,
    current_prices_usd: currentPricesUsd,
    holdings,
    sell_cap_usd: capUsd,
    buy_cap_usd: capUsd,
    fx_ars_per_usd: effectiveMep,
    commission_pct: commissionRate,
    min_trade_usd: minTradeUsd,
    liquidate_orphans: liquidateOrphans,
    cash_usd: effectiveMep > 0 ? cashArs / effectiveMep : 0,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    let message = errText;
    try {
      const parsed = JSON.parse(errText) as { detail?: string };
      if (parsed.detail) message = parsed.detail;
    } catch {
      // not JSON — keep raw text
    }
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  const data = (await response.json()) as OptimizeResponse;
  return convertResponseToPlan(data, fmpToIol, commissionRate, dailyLimitArs, t);
}

// ─── Conversion ───────────────────────────────────────────────────────────────

function convertResponseToPlan(
  data: OptimizeResponse,
  fmpToIol: Record<string, string>,
  commissionRate: number,
  dailyLimitArs: number,
  t: Translator,
): RebalancePlan {
  const sells: RebalanceOrder[] = [];
  const buys: RebalanceOrder[] = [];
  let estimatedSellProceeds = 0;

  for (const trade of data.trades) {
    const iolTicker = fmpToIol[trade.ticker] ?? trade.ticker;
    // Re-derive ARS commission from the canonical gross_ars_display so any FX
    // rounding inconsistency between gross_usd and gross_ars stays internal.
    const commissionArs = trade.gross_ars_display * commissionRate;

    const order: RebalanceOrder = {
      ticker: iolTicker,
      side: trade.action,
      quantity: trade.shares_cedear,
      priceArs: trade.price_ars_display,
      volumeArs: trade.gross_ars_display,
      estimatedCostArs:
        trade.action === 'buy'
          ? trade.gross_ars_display + commissionArs
          : commissionArs,
      reasoning: trade.reasoning,
      confidence: trade.confidence,
      isOrphan: trade.is_orphan,
    };

    if (trade.action === 'sell') {
      sells.push(order);
      estimatedSellProceeds += trade.gross_ars_display - commissionArs;
    } else {
      buys.push(order);
    }
  }

  const totalSellVolume = sells.reduce((s, o) => s + o.volumeArs, 0);
  const totalBuyVolume = buys.reduce((s, o) => s + o.volumeArs, 0);
  const totalBuyCost = buys.reduce((s, o) => s + o.estimatedCostArs, 0);
  const newCashUsed = Math.max(0, totalBuyCost - estimatedSellProceeds);

  const warnings: string[] = [];
  if (sells.length > 0 && buys.length > 0) {
    warnings.push(t('engine.settlement'));
  }

  return {
    sells,
    buys,
    totalSellVolume,
    totalBuyVolume,
    totalVolume: totalSellVolume + totalBuyVolume,
    estimatedSellProceeds,
    newCashUsed,
    remainingLimit: Math.max(0, dailyLimitArs - newCashUsed),
    warnings,
  };
}

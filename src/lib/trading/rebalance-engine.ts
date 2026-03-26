import { COMMISSION_RATE } from './quick-trade';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Decision {
  action: string;        // 'buy' | 'sell' | 'hold'
  quantity: number;
  confidence: number;
  reasoning: string;
}

export interface RebalanceInput {
  decisions: Record<string, Decision>;  // IOL symbol → AI decision
  holdings: Record<string, number>;     // IOL symbol → quantity owned
  arsPrices: Record<string, number>;    // IOL symbol → current ARS price
  cashArs: number;                      // available cash
  dailyLimitArs: number;               // max volume to sell/rotate; also caps new cash for buys
  commissionRate?: number;              // defaults to COMMISSION_RATE
}

export interface RebalanceOrder {
  ticker: string;
  side: 'buy' | 'sell';
  quantity: number;
  priceArs: number;
  volumeArs: number;        // quantity * price (raw volume, no commission)
  estimatedCostArs: number; // volume including commission
  reasoning: string;
  confidence: number;
}

export interface RebalancePlan {
  sells: RebalanceOrder[];
  buys: RebalanceOrder[];
  totalSellVolume: number;
  totalBuyVolume: number;
  totalVolume: number;
  estimatedSellProceeds: number; // net after commission
  newCashUsed: number;           // how much of the daily limit was consumed
  remainingLimit: number;        // dailyLimit - newCashUsed
  warnings: string[];
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Computes a rebalance plan.
 *
 * Limit semantics:
 * - dailyLimitArs caps TOTAL SELL volume — the AI can't liquidate the whole portfolio.
 * - Sell proceeds are 100% recycled into buys (no free cash left over).
 * - New cash (beyond sell proceeds) is also capped by dailyLimitArs.
 * - Each buy respects the AI's recommended quantity as a maximum.
 */
export function computeRebalancePlan(input: RebalanceInput): RebalancePlan {
  const {
    decisions,
    holdings,
    arsPrices,
    cashArs,
    dailyLimitArs,
    commissionRate = COMMISSION_RATE,
  } = input;

  const sells: RebalanceOrder[] = [];
  const buys: RebalanceOrder[] = [];
  const warnings: string[] = [];

  let sellProceeds = 0;

  // ── 1. Partition decisions ──────────────────────────────────────────────────

  const sellDecisions: [string, Decision][] = [];
  const buyDecisions: [string, Decision][] = [];

  for (const [ticker, decision] of Object.entries(decisions)) {
    if (decision.action === 'sell') {
      sellDecisions.push([ticker, decision]);
    } else if (decision.action === 'buy') {
      buyDecisions.push([ticker, decision]);
    }
    // hold → skip
  }

  // Sort by confidence descending (highest confidence first)
  sellDecisions.sort(([, a], [, b]) => b.confidence - a.confidence);
  buyDecisions.sort(([, a], [, b]) => b.confidence - a.confidence);

  // ── 2. Process sells (capped at dailyLimitArs) ─────────────────────────────

  let remainingSellBudget = dailyLimitArs;

  for (const [ticker, decision] of sellDecisions) {
    const price = arsPrices[ticker];
    const owned = holdings[ticker] ?? 0;

    if (!price || price <= 0) {
      warnings.push(`${ticker}: sin precio ARS, no se puede vender`);
      continue;
    }
    if (owned <= 0) {
      warnings.push(`${ticker}: AI sugiere vender pero no tenés posición`);
      continue;
    }
    if (remainingSellBudget <= 0) {
      warnings.push(`${ticker}: límite de venta alcanzado, venta omitida`);
      continue;
    }

    // Cap sell quantity to stay within daily limit
    const maxByBudget = Math.floor(remainingSellBudget / price);
    const quantity = Math.min(owned, maxByBudget);

    if (quantity <= 0) {
      warnings.push(`${ticker}: límite restante insuficiente para 1 unidad (precio: ${fmtARS(price)}, restante: ${fmtARS(remainingSellBudget)})`);
      continue;
    }

    const volume = quantity * price;
    const commission = volume * commissionRate;
    const netProceeds = volume - commission;

    sells.push({
      ticker,
      side: 'sell',
      quantity,
      priceArs: price,
      volumeArs: volume,
      estimatedCostArs: commission,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
    });

    sellProceeds += netProceeds;
    remainingSellBudget -= volume;
  }

  // ── 3. Process buys ─────────────────────────────────────────────────────────

  // Buy budget = sell proceeds (recycled, all must be reinvested)
  //            + new cash capped at dailyLimitArs
  const maxNewCash = Math.min(cashArs, dailyLimitArs);
  let availableBudget = sellProceeds + maxNewCash;

  for (const [ticker, decision] of buyDecisions) {
    const price = arsPrices[ticker];

    if (!price || price <= 0) {
      warnings.push(`${ticker}: sin precio ARS, no se puede comprar`);
      continue;
    }
    if (availableBudget <= 0) {
      warnings.push(`${ticker}: presupuesto agotado, compra omitida`);
      continue;
    }

    const effectiveBudget = availableBudget / (1 + commissionRate);
    const maxByBudget = Math.floor(effectiveBudget / price);
    // Respect the AI's recommended quantity as a cap
    const quantity = decision.quantity > 0
      ? Math.min(decision.quantity, maxByBudget)
      : maxByBudget;

    if (quantity <= 0) {
      warnings.push(`${ticker}: saldo insuficiente (precio: ${fmtARS(price)}, disponible: ${fmtARS(availableBudget)})`);
      continue;
    }

    const volume = quantity * price;
    const commission = volume * commissionRate;
    const totalCost = volume + commission;

    buys.push({
      ticker,
      side: 'buy',
      quantity,
      priceArs: price,
      volumeArs: volume,
      estimatedCostArs: totalCost,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
    });

    availableBudget -= totalCost;
  }

  const totalBuyCost = buys.reduce((sum, o) => sum + o.estimatedCostArs, 0);
  const newCashUsed = Math.max(0, totalBuyCost - sellProceeds);

  // ── 4. Compute totals ──────────────────────────────────────────────────────

  const totalSellVolume = sells.reduce((sum, o) => sum + o.volumeArs, 0);
  const totalBuyVolume = buys.reduce((sum, o) => sum + o.volumeArs, 0);

  // Settlement warning
  if (sells.length > 0 && buys.length > 0) {
    warnings.push('Las ventas con plazo t1 (24hs) pueden no liberar el efectivo inmediatamente para compras del mismo día.');
  }

  return {
    sells,
    buys,
    totalSellVolume,
    totalBuyVolume,
    totalVolume: totalSellVolume + totalBuyVolume,
    estimatedSellProceeds: sellProceeds,
    newCashUsed,
    remainingLimit: Math.max(0, dailyLimitArs - newCashUsed),
    warnings,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtARS(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

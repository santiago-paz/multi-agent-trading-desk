import { describe, it, expect } from 'vitest';
import { computeRebalancePlan, Decision, RebalanceInput, Translator } from './rebalance-engine';
import { COMMISSION_RATE } from './quick-trade';

// Translator mock — concatenates key + params for easy assertions
const t: Translator = (key, params) => {
  if (!params) return String(key);
  const parts = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',');
  return `${String(key)}(${parts})`;
};

function decision(action: string, quantity: number, confidence = 0.8, reasoning = 'r'): Decision {
  return { action, quantity, confidence, reasoning };
}

function baseInput(overrides: Partial<RebalanceInput> = {}): RebalanceInput {
  return {
    decisions: {},
    holdings: {},
    arsPrices: {},
    cashArs: 0,
    dailyLimitArs: 1_000_000,
    ...overrides,
  };
}

describe('computeRebalancePlan', () => {
  it('returns empty plan when there are no decisions', () => {
    const plan = computeRebalancePlan(baseInput(), t);
    expect(plan.sells).toEqual([]);
    expect(plan.buys).toEqual([]);
    expect(plan.totalVolume).toBe(0);
    expect(plan.estimatedSellProceeds).toBe(0);
    expect(plan.newCashUsed).toBe(0);
    expect(plan.warnings).toEqual([]);
  });

  it('skips hold decisions silently', () => {
    const plan = computeRebalancePlan(
      baseInput({ decisions: { AAPL: decision('hold', 10) } }),
      t,
    );
    expect(plan.sells).toEqual([]);
    expect(plan.buys).toEqual([]);
    expect(plan.warnings).toEqual([]);
  });

  it('builds a sell order with correct volume, commission and net proceeds', () => {
    const plan = computeRebalancePlan(
      baseInput({
        decisions: { AAPL: decision('sell', 10) },
        holdings: { AAPL: 10 },
        arsPrices: { AAPL: 100 },
      }),
      t,
    );
    expect(plan.sells).toHaveLength(1);
    const order = plan.sells[0];
    expect(order.ticker).toBe('AAPL');
    expect(order.quantity).toBe(10);
    expect(order.volumeArs).toBe(1000);
    expect(order.estimatedCostArs).toBeCloseTo(1000 * COMMISSION_RATE, 6);
    // Net proceeds = volume - commission
    expect(plan.estimatedSellProceeds).toBeCloseTo(1000 * (1 - COMMISSION_RATE), 6);
  });

  it('caps sell quantity by remaining daily limit', () => {
    // dailyLimit = 600 → at price 100, max 6 units even though user owns 10
    const plan = computeRebalancePlan(
      baseInput({
        decisions: { AAPL: decision('sell', 10) },
        holdings: { AAPL: 10 },
        arsPrices: { AAPL: 100 },
        dailyLimitArs: 600,
      }),
      t,
    );
    expect(plan.sells[0].quantity).toBe(6);
    expect(plan.sells[0].volumeArs).toBe(600);
  });

  it('warns and skips when ticker has no price', () => {
    const plan = computeRebalancePlan(
      baseInput({
        decisions: { AAPL: decision('sell', 5) },
        holdings: { AAPL: 5 },
        arsPrices: {},
      }),
      t,
    );
    expect(plan.sells).toEqual([]);
    expect(plan.warnings.some(w => w.includes('engine.sell.noPrice'))).toBe(true);
    expect(plan.warnings[0]).toContain('ticker=AAPL');
  });

  it('warns and skips when user has no holdings to sell', () => {
    const plan = computeRebalancePlan(
      baseInput({
        decisions: { AAPL: decision('sell', 5) },
        arsPrices: { AAPL: 100 },
      }),
      t,
    );
    expect(plan.sells).toEqual([]);
    expect(plan.warnings[0]).toContain('engine.sell.noHolding');
  });

  it('warns when sell budget is exhausted before processing all sells', () => {
    // Highest-confidence sell uses the full daily limit; the second hits limitReached
    const plan = computeRebalancePlan(
      baseInput({
        decisions: {
          AAPL: decision('sell', 10, 0.9),
          KO: decision('sell', 10, 0.5),
        },
        holdings: { AAPL: 10, KO: 10 },
        arsPrices: { AAPL: 100, KO: 100 },
        dailyLimitArs: 1000,
      }),
      t,
    );
    expect(plan.sells).toHaveLength(1);
    expect(plan.sells[0].ticker).toBe('AAPL');
    expect(plan.warnings.some(w => w.includes('engine.sell.limitReached') && w.includes('ticker=KO'))).toBe(true);
  });

  it('processes higher-confidence sells first', () => {
    const plan = computeRebalancePlan(
      baseInput({
        decisions: {
          KO: decision('sell', 5, 0.4),
          AAPL: decision('sell', 5, 0.95),
          TSLA: decision('sell', 5, 0.7),
        },
        holdings: { AAPL: 5, KO: 5, TSLA: 5 },
        arsPrices: { AAPL: 100, KO: 100, TSLA: 100 },
      }),
      t,
    );
    expect(plan.sells.map(s => s.ticker)).toEqual(['AAPL', 'TSLA', 'KO']);
  });

  it('recycles sell proceeds into buys (no new cash needed)', () => {
    const plan = computeRebalancePlan(
      baseInput({
        decisions: {
          AAPL: decision('sell', 10),
          KO: decision('buy', 9),
        },
        holdings: { AAPL: 10 },
        arsPrices: { AAPL: 100, KO: 100 },
        cashArs: 0,
      }),
      t,
    );
    expect(plan.sells).toHaveLength(1);
    expect(plan.buys).toHaveLength(1);
    // Proceeds = 1000 * (1 - rate); buy budget = proceeds / (1 + rate)
    // → at price 100, max ~ floor(984.23 / 100) = 9
    expect(plan.buys[0].quantity).toBe(9);
    expect(plan.newCashUsed).toBe(0);
  });

  it('caps new cash for buys at dailyLimitArs', () => {
    // cashArs = 10_000_000 but dailyLimit caps it at 1000
    const plan = computeRebalancePlan(
      baseInput({
        decisions: { AAPL: decision('buy', 1000) },
        arsPrices: { AAPL: 100 },
        cashArs: 10_000_000,
        dailyLimitArs: 1000,
      }),
      t,
    );
    // Effective budget = 1000 / 1.015 = 985.22 → 9 units * 100 = 900
    expect(plan.buys[0].quantity).toBe(9);
    expect(plan.newCashUsed).toBeGreaterThan(0);
    expect(plan.newCashUsed).toBeLessThanOrEqual(1000);
  });

  it('respects AI quantity recommendation as a maximum', () => {
    // Plenty of budget but AI says only 3 units
    const plan = computeRebalancePlan(
      baseInput({
        decisions: { AAPL: decision('buy', 3) },
        arsPrices: { AAPL: 100 },
        cashArs: 1_000_000,
      }),
      t,
    );
    expect(plan.buys[0].quantity).toBe(3);
  });

  it('uses max-affordable when AI recommends quantity 0', () => {
    const plan = computeRebalancePlan(
      baseInput({
        decisions: { AAPL: decision('buy', 0) },
        arsPrices: { AAPL: 100 },
        cashArs: 500,
        dailyLimitArs: 1_000_000,
      }),
      t,
    );
    // 500 / 1.015 / 100 = 4.92 → floor = 4
    expect(plan.buys[0].quantity).toBe(4);
  });

  it('warns when buy has no price', () => {
    const plan = computeRebalancePlan(
      baseInput({
        decisions: { AAPL: decision('buy', 5) },
        cashArs: 10_000,
      }),
      t,
    );
    expect(plan.buys).toEqual([]);
    expect(plan.warnings[0]).toContain('engine.buy.noPrice');
  });

  it('warns with noLiquidity when budget is fully consumed before next buy', () => {
    // cashArs chosen so first buy spends 100% of budget (5 * 100 + 1.5% = 507.5)
    const cashArs = 100 * 5 * (1 + COMMISSION_RATE);
    const plan = computeRebalancePlan(
      baseInput({
        decisions: {
          AAPL: decision('buy', 5, 0.9),
          KO: decision('buy', 5, 0.5),
        },
        arsPrices: { AAPL: 100, KO: 100 },
        cashArs,
        dailyLimitArs: cashArs,
      }),
      t,
    );
    expect(plan.buys).toHaveLength(1);
    expect(plan.buys[0].ticker).toBe('AAPL');
    expect(plan.warnings.some(w => w.includes('engine.buy.noLiquidity') && w.includes('ticker=KO'))).toBe(true);
  });

  it('warns when budget is insufficient for even one unit', () => {
    const plan = computeRebalancePlan(
      baseInput({
        decisions: { AAPL: decision('buy', 5) },
        arsPrices: { AAPL: 10_000 },
        cashArs: 100, // can't afford a single share
        dailyLimitArs: 100,
      }),
      t,
    );
    expect(plan.buys).toEqual([]);
    expect(plan.warnings[0]).toContain('engine.buy.insufficientFunds');
  });

  it('emits settlement warning when both sells and buys exist', () => {
    const plan = computeRebalancePlan(
      baseInput({
        decisions: {
          AAPL: decision('sell', 5),
          KO: decision('buy', 5),
        },
        holdings: { AAPL: 5 },
        arsPrices: { AAPL: 100, KO: 100 },
      }),
      t,
    );
    expect(plan.warnings).toContain('engine.settlement');
  });

  it('does not emit settlement warning when only sells happen', () => {
    const plan = computeRebalancePlan(
      baseInput({
        decisions: { AAPL: decision('sell', 5) },
        holdings: { AAPL: 5 },
        arsPrices: { AAPL: 100 },
      }),
      t,
    );
    expect(plan.warnings).not.toContain('engine.settlement');
  });

  it('honors a custom commissionRate override', () => {
    const plan = computeRebalancePlan(
      baseInput({
        decisions: { AAPL: decision('sell', 10) },
        holdings: { AAPL: 10 },
        arsPrices: { AAPL: 100 },
        commissionRate: 0.05,
      }),
      t,
    );
    // commission = 1000 * 0.05 = 50, proceeds = 950
    expect(plan.sells[0].estimatedCostArs).toBeCloseTo(50, 6);
    expect(plan.estimatedSellProceeds).toBeCloseTo(950, 6);
  });

  it('computes totals and remainingLimit consistently', () => {
    const plan = computeRebalancePlan(
      baseInput({
        decisions: { AAPL: decision('buy', 5) },
        arsPrices: { AAPL: 100 },
        cashArs: 600,
        dailyLimitArs: 1000,
      }),
      t,
    );
    expect(plan.totalSellVolume).toBe(0);
    expect(plan.totalBuyVolume).toBe(plan.buys[0].volumeArs);
    expect(plan.totalVolume).toBe(plan.totalBuyVolume);
    expect(plan.newCashUsed).toBeCloseTo(plan.buys[0].estimatedCostArs, 6);
    expect(plan.remainingLimit).toBeCloseTo(1000 - plan.newCashUsed, 6);
  });
});

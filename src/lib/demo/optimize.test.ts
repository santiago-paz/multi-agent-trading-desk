import { describe, it, expect } from 'vitest';
import { demoOptimize } from './optimize';

describe('demo /optimize', () => {
  it('turns buy/sell decisions into trades within caps', () => {
    const { trades } = demoOptimize({
      decisions: {
        AAPL: { action: 'buy', quantity: 3, confidence: 80, reasoning: 'x' },
        KO:   { action: 'sell', quantity: 2, confidence: 70, reasoning: 'y' },
        NVDA: { action: 'hold', quantity: 0, confidence: 50, reasoning: 'z' },
      },
      current_prices_usd: { AAPL: 220, KO: 70, NVDA: 900 },
      sell_cap_usd: 5000,
      buy_cap_usd: 5000,
      fx_ars_per_usd: 1347.5,
    });
    const actions = trades.map(t => t.action).sort();
    expect(actions).toEqual(['buy', 'sell']);           // hold dropped
    for (const t of trades) {
      expect(t.shares_cedear).toBeGreaterThan(0);
      expect(t.price_ars_display).toBeGreaterThan(0);
      expect(t.is_orphan).toBe(false);
    }
  });

  it('trims underlying shares to fit a tight buy cap and keeps ARS totals ratio-invariant', () => {
    const { trades } = demoOptimize({
      decisions: {
        AAPL: { action: 'buy', quantity: 3, confidence: 80, reasoning: 'x' },
      },
      current_prices_usd: { AAPL: 220 },
      buy_cap_usd: 500,
      fx_ars_per_usd: 1347.5,
    });
    expect(trades).toHaveLength(1);
    const [trade] = trades;
    // floor(500 / 220) = 2 shares, not the requested 3.
    expect(trade.shares_underlying).toBe(2);
    // gross_ars_display must track the USD total (2 * 220 * fx), not be
    // inflated by the CEDEAR ratio (AAPL is 20 CEDEARs per share).
    const expectedGrossArs = 2 * 220 * 1347.5;
    expect(trade.gross_ars_display).toBeCloseTo(expectedGrossArs, 0);
  });
});

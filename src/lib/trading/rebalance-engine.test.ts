import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchOptimizedPlan, Translator } from './rebalance-engine';
import { COMMISSION_RATE } from './quick-trade';

// The optimizer logic itself (lot rounding, orphan handling, caps) lives in
// Python — see tests/test_app/test_optimize_route.py in the ai-hedge-fund
// repo. These tests cover only the TS-side concerns: payload shape and
// response → RebalancePlan conversion.

const t: Translator = (key, params) => {
  if (!params) return String(key);
  const parts = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',');
  return `${String(key)}(${parts})`;
};

const baseInput = {
  decisions: { AAPL: { action: 'buy', quantity: 1, confidence: 80, reasoning: 'r' } },
  analystSignals: {},
  currentPricesUsd: { AAPL: 200 },
  fmpToIol: { AAPL: 'AAPLC' } as Record<string, string>,
  iolToFmp: { AAPLC: 'AAPL' } as Record<string, string>,
  holdingsByIol: { AAPLC: 60 } as Record<string, number>,
  arsPrices: { AAPLC: 13000 } as Record<string, number>,
  cashArs: 100_000,
  dailyLimitArs: 1_300_000,
  effectiveMep: 1300,
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchOptimizedPlan — request payload', () => {
  it('POSTs to /api/hedge-fund/optimize with the right body shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ trades: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchOptimizedPlan(baseInput, t);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/hedge-fund/optimize');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(init.body);
    // dailyLimit is split equally across both caps (in USD, via MEP).
    expect(body.sell_cap_usd).toBe(1_300_000 / 1300);
    expect(body.buy_cap_usd).toBe(1_300_000 / 1300);
    expect(body.fx_ars_per_usd).toBe(1300);
    expect(body.commission_pct).toBe(COMMISSION_RATE);
    // Real free cash (not the daily limit) funds the reinvestment stage.
    expect(body.cash_usd).toBe(100_000 / 1300);
    expect(body.decisions.AAPL.quantity).toBe(1);
    // Holdings are remapped IOL→FMP and use FMP-tickered keys.
    expect(body.holdings).toEqual([
      { ticker: 'AAPL', cedear_shares: 60, avg_cost_ars: 0, last_price_ars: 13000 },
    ]);
  });

  it('drops zero-quantity holdings from the payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ trades: [] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await fetchOptimizedPlan(
      { ...baseInput, holdingsByIol: { AAPLC: 60, KOC: 0, MSFTC: -5 } },
      t,
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.holdings).toEqual([
      { ticker: 'AAPL', cedear_shares: 60, avg_cost_ars: 0, last_price_ars: 13000 },
    ]);
  });

  it('surfaces FastAPI detail messages on 4xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Ticker 'FAKE' is not a CEDEAR." }), { status: 400 }),
      ),
    );
    await expect(fetchOptimizedPlan(baseInput, t)).rejects.toThrow("Ticker 'FAKE' is not a CEDEAR.");
  });
});

describe('fetchOptimizedPlan — response → RebalancePlan conversion', () => {
  function trade(over: Partial<{
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
    is_orphan: boolean;
  }> = {}) {
    return {
      ticker: 'AAPL',
      action: 'buy' as const,
      shares_underlying: 1,
      shares_cedear: 20,
      price_usd: 200,
      gross_usd: 200,
      commission_usd: 3,
      net_usd: 203,
      price_ars_display: 13000,
      gross_ars_display: 260000,
      confidence: 80,
      reasoning: 'r',
      agent_signals: {},
      is_orphan: false,
      ...over,
    };
  }

  function stubResponse(trades: ReturnType<typeof trade>[]) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ trades }), { status: 200 })),
    );
  }

  it('remaps FMP tickers back to IOL on every order', async () => {
    stubResponse([trade({ ticker: 'AAPL' })]);
    const plan = await fetchOptimizedPlan(baseInput, t);
    expect(plan.buys[0].ticker).toBe('AAPLC');
  });

  it('uses shares_cedear as the broker-facing quantity', async () => {
    stubResponse([trade({ shares_underlying: 3, shares_cedear: 60 })]);
    const plan = await fetchOptimizedPlan(baseInput, t);
    expect(plan.buys[0].quantity).toBe(60);
  });

  it('computes estimatedCostArs as volume + commission for buys', async () => {
    stubResponse([trade({ action: 'buy', gross_ars_display: 260_000 })]);
    const plan = await fetchOptimizedPlan(baseInput, t);
    expect(plan.buys[0].estimatedCostArs).toBeCloseTo(260_000 * (1 + COMMISSION_RATE), 2);
  });

  it('computes estimatedCostArs as commission-only for sells, and tracks net proceeds', async () => {
    stubResponse([trade({ action: 'sell', gross_ars_display: 260_000 })]);
    const plan = await fetchOptimizedPlan(baseInput, t);
    expect(plan.sells[0].estimatedCostArs).toBeCloseTo(260_000 * COMMISSION_RATE, 2);
    expect(plan.estimatedSellProceeds).toBeCloseTo(260_000 * (1 - COMMISSION_RATE), 2);
  });

  it('emits the settlement warning only when both sells and buys exist', async () => {
    stubResponse([trade({ action: 'sell' }), trade({ ticker: 'AAPL', action: 'buy' })]);
    const plan = await fetchOptimizedPlan(baseInput, t);
    expect(plan.warnings).toContain('engine.settlement');
  });

  it('does not emit the settlement warning when there is only one side', async () => {
    stubResponse([trade({ action: 'buy' })]);
    const plan = await fetchOptimizedPlan(baseInput, t);
    expect(plan.warnings).toEqual([]);
  });

  it('flags orphan trades on the order so the UI can highlight them', async () => {
    stubResponse([trade({ action: 'sell', is_orphan: true })]);
    const plan = await fetchOptimizedPlan(baseInput, t);
    expect(plan.sells[0].isOrphan).toBe(true);
  });

  it('returns an empty plan when the optimizer returns no trades', async () => {
    stubResponse([]);
    const plan = await fetchOptimizedPlan(baseInput, t);
    expect(plan.sells).toEqual([]);
    expect(plan.buys).toEqual([]);
    expect(plan.totalVolume).toBe(0);
    expect(plan.estimatedSellProceeds).toBe(0);
    expect(plan.warnings).toEqual([]);
  });
});

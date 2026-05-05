// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const placeOrder = vi.fn();
const getOrderStatus = vi.fn();
const waitForOrderSettlement = vi.fn();
const computeRebalancePlan = vi.fn();

vi.mock('@/app/trading/actions', () => ({ placeOrder, getOrderStatus }));
vi.mock('@/lib/trading/order-polling', () => ({ waitForOrderSettlement }));
vi.mock('@/lib/trading/rebalance-engine', async (orig) => {
  const actual = await orig<typeof import('@/lib/trading/rebalance-engine')>();
  return { ...actual, computeRebalancePlan };
});

const { useTradingEngine } = await import('./useTradingEngine');
const { useHistoryStore } = await import('@/lib/store/history-store');

const baseProps = {
  cashArs: 100_000,
  effectiveMep: 1000,
  dailyLimit: 50_000,
  holdings: { AAPLC: 5 } as Record<string, number>,
  holdingTickers: ['AAPLC'],
  portfolioPositions: [{ ticker: 'AAPLC', quantity: 5, trade_price: 1000 }],
  arsPrices: { AAPLC: 1000, KOC: 500 } as Record<string, number>,
  fmpTickers: ['AAPL', 'KO'],
  fmpToIol: { AAPL: 'AAPLC', KO: 'KOC' } as Record<string, string>,
  panelSymbols: ['AAPLC', 'KOC'],
  selectedAgents: new Set<string>(['warren_buffett']),
  modelName: 'claude-opus-4-7',
  companyNames: { AAPLC: 'Apple Inc.', KOC: 'Coca-Cola Company' } as Record<string, string>,
};

function setActiveTab() { /* no-op */ }

beforeEach(() => {
  placeOrder.mockReset();
  getOrderStatus.mockReset();
  waitForOrderSettlement.mockReset();
  // Default: settlement resolves instantly as filled so existing tests don't
  // need to know about the polling step. Tests that care override this.
  waitForOrderSettlement.mockResolvedValue({ kind: 'filled', estado: 'terminada' });
  computeRebalancePlan.mockReset();
  localStorage.clear();
  useHistoryStore.setState({ runs: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useTradingEngine — initial state and guards', () => {
  it('starts in idle phase with empty data', () => {
    const { result } = renderHook(() => useTradingEngine(baseProps));
    expect(result.current.phase).toBe('idle');
    expect(result.current.logs).toEqual([]);
    expect(result.current.progress).toBe(0);
    expect(result.current.plan).toBeNull();
    expect(result.current.orderResults).toEqual([]);
    expect(result.current.analystSignals).toBeNull();
    expect(result.current.rawDecisions).toBeNull();
    expect(result.current.candidateDecisions).toBeNull();
  });

  it('handleAnalyze is a no-op when no agents are selected', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const props = { ...baseProps, selectedAgents: new Set<string>() };
    const { result } = renderHook(() => useTradingEngine(props));
    await act(async () => {
      await result.current.handleAnalyze(setActiveTab);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('idle');
  });

  it('handleAnalyze is a no-op when there are no FMP tickers', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const props = { ...baseProps, fmpTickers: [] };
    const { result } = renderHook(() => useTradingEngine(props));
    await act(async () => {
      await result.current.handleAnalyze(setActiveTab);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handleExecuteOrders is a no-op when there is no plan', async () => {
    const { result } = renderHook(() => useTradingEngine(baseProps));
    await act(async () => {
      await result.current.handleExecuteOrders();
    });
    expect(placeOrder).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('idle');
  });
});

describe('useTradingEngine — abortEngine', () => {
  it('sets phase to idle and pushes a cancel log entry', () => {
    const { result } = renderHook(() => useTradingEngine(baseProps));
    act(() => {
      result.current.abortEngine();
    });
    expect(result.current.phase).toBe('idle');
    const cancel = result.current.logs.find(l => l.id === 'cancel');
    expect(cancel).toBeDefined();
    expect(cancel?.status).toBe('error');
  });
});

describe('useTradingEngine — handleAnalyze HTTP errors', () => {
  it('logs an error when the run endpoint returns non-OK', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'boom',
      }),
    );
    const { result } = renderHook(() => useTradingEngine(baseProps));
    await act(async () => {
      await result.current.handleAnalyze(setActiveTab);
    });
    expect(result.current.phase).toBe('idle');
    expect(result.current.logs.some(l => l.id === 'error')).toBe(true);
  });

  it('returns silently when fetch is aborted (AbortError)', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr));
    const { result } = renderHook(() => useTradingEngine(baseProps));
    await act(async () => {
      await result.current.handleAnalyze(setActiveTab);
    });
    // No "error" log entry was added (early return on AbortError).
    expect(result.current.logs.some(l => l.id === 'error')).toBe(false);
  });
});

describe('useTradingEngine — handleAnalyze SSE complete event', () => {
  function makeSSEResponse(eventName: string, data: unknown): Response {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(payload));
        controller.close();
      },
    });
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  }

  it('processes a complete event: fills plan, signals, decisions and saves run to history', async () => {
    const fakePlan = {
      sells: [],
      buys: [{ ticker: 'KOC', quantity: 1, priceArs: 500, volumeArs: 500, estimatedCostArs: 502.5, reasoning: '', confidence: 80 }],
      totalSellVolume: 0,
      totalBuyVolume: 500,
      estimatedSellProceeds: 0,
      warnings: [],
    };
    computeRebalancePlan.mockReturnValue(fakePlan);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeSSEResponse('complete', {
          data: {
            analyst_signals: {
              warren_buffett: { KO: { signal: 'bullish', confidence: 80, reasoning: 'cheap' } },
            },
            decisions: {
              KO: { action: 'buy', quantity: 1, confidence: 80, reasoning: 'value' },
              AAPL: { action: 'hold', quantity: 0, confidence: 50, reasoning: 'wait' },
            },
          },
        }),
      ),
    );

    const { result } = renderHook(() => useTradingEngine(baseProps));
    await act(async () => {
      await result.current.handleAnalyze(setActiveTab);
    });

    await waitFor(() => expect(result.current.phase).toBe('planned'));

    // Signals & decisions remapped FMP→IOL.
    expect(result.current.analystSignals?.warren_buffett?.KOC?.signal).toBe('bullish');
    expect(result.current.rawDecisions?.KOC?.action).toBe('buy');
    expect(result.current.rawDecisions?.AAPLC?.action).toBe('hold');
    // Candidates exclude held tickers (AAPLC is in holdingTickers).
    expect(result.current.candidateDecisions).toBeDefined();
    expect(result.current.candidateDecisions?.AAPLC).toBeUndefined();
    expect(result.current.candidateDecisions?.KOC?.action).toBe('buy');

    // Plan came from the mocked engine.
    expect(result.current.plan).toBe(fakePlan);
    // computeRebalancePlan received remapped IOL decisions and CASH/limit.
    expect(computeRebalancePlan).toHaveBeenCalledTimes(1);
    const [planArgs] = computeRebalancePlan.mock.calls[0];
    expect(planArgs.holdings).toEqual({ AAPLC: 5 });
    expect(planArgs.cashArs).toBe(100_000);
    expect(planArgs.dailyLimitArs).toBe(50_000);
    expect(planArgs.decisions.KOC.action).toBe('buy');

    // Progress should hit 100 and a `complete` log was added.
    expect(result.current.progress).toBe(100);
    expect(result.current.logs.some(l => l.id === 'complete' && l.status === 'ok')).toBe(true);

    // History was updated with one run.
    const runs = useHistoryStore.getState().runs;
    expect(runs).toHaveLength(1);
    expect(runs[0].executed).toBe(false);
    expect(runs[0].agentKeys).toEqual(['warren_buffett']);
    expect(runs[0].tickers).toEqual(['AAPL', 'KO']);
    // Company names were captured into the run snapshot so the History tab
    // can render them later without re-fetching from FMP.
    expect(runs[0].companyNames).toEqual({ AAPLC: 'Apple Inc.', KOC: 'Coca-Cola Company' });
  });
});

describe('useTradingEngine — handleAnalyze request body', () => {
  function captureBody() {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'stop here',
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  function parseBody(fetchMock: ReturnType<typeof vi.fn>) {
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    return JSON.parse(init.body as string);
  }

  it('sends start_date and end_date in YYYY-MM-DD format', async () => {
    const fetchMock = captureBody();
    const { result } = renderHook(() => useTradingEngine(baseProps));
    await act(async () => {
      await result.current.handleAnalyze(setActiveTab);
    });
    const body = parseBody(fetchMock);
    expect(body.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('initial_cash carries only cash + dailyLimit in USD — never the holdings value', async () => {
    // The pre-fix bug folded portfolio holdings into initial_cash, which made
    // the backend's risk manager think the portfolio was ~13× larger than it
    // really was. Holdings travel via `portfolio_positions`; `initial_cash`
    // must stay scoped to free buying power.
    const fetchMock = captureBody();
    const props = {
      ...baseProps,
      cashArs: 1_000_000,
      dailyLimit: 1_000_000,
      effectiveMep: 1000,
      // Real CEDEAR holding worth ~1M ARS at the panel ARS price; if it
      // leaked into initial_cash, USD would be ~$3000 instead of $2000.
      portfolioPositions: [{ ticker: 'AAPL', quantity: 50, trade_price: 200 }],
      arsPrices: { AAPLC: 20_000 },
    };
    const { result } = renderHook(() => useTradingEngine(props));
    await act(async () => { await result.current.handleAnalyze(setActiveTab); });
    const body = parseBody(fetchMock);
    // (1M cash + 1M dailyLimit) / 1000 MEP = $2000 USD exactly
    expect(body.initial_cash).toBe(2000);
  });

  it('translates per-share LLM decisions back into CEDEARs before sizing the rebalance plan', async () => {
    // The LLM reasons in shares (FMP unit). `computeRebalancePlan` and IOL
    // both operate on CEDEARs, so we floor-convert via the BYMA ratio. This
    // is the path that prevents "sell 85 GOOGL shares" (≈4930 CEDEARs the
    // user does not own) from being passed downstream.
    const fakePlan = {
      sells: [], buys: [], totalSellVolume: 0, totalBuyVolume: 0,
      estimatedSellProceeds: 0, warnings: [],
    };
    computeRebalancePlan.mockReturnValue(fakePlan);

    const sseResponse = (() => {
      const payload = 'event: complete\ndata: ' + JSON.stringify({
        data: {
          analyst_signals: {},
          decisions: {
            // 2 shares of NVDA → 2 × 24 = 48 CEDEARs
            NVDA: { action: 'sell', quantity: 2, confidence: 90, reasoning: '' },
            // 1 share of ORLY → 1 × 222 = 222 CEDEARs
            ORLY: { action: 'buy', quantity: 1, confidence: 80, reasoning: '' },
            // hold passes through unchanged
            KO: { action: 'hold', quantity: 0, confidence: 50, reasoning: '' },
          },
        },
      }) + '\n\n';
      const stream = new ReadableStream({
        start(c) { c.enqueue(new TextEncoder().encode(payload)); c.close(); },
      });
      return new Response(stream, { status: 200 });
    })();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse));

    // fmpToIol must remap so the engine sees IOL keys, matching the BYMA
    // ratio table. NVDA, ORLY, KO are identity-mapped (IOL == FMP).
    const props = {
      ...baseProps,
      fmpToIol: { NVDA: 'NVDA', ORLY: 'ORLY', KO: 'KO' },
      holdingTickers: ['NVDA'],
      holdings: { NVDA: 100 },
    };
    const { result } = renderHook(() => useTradingEngine(props));
    await act(async () => { await result.current.handleAnalyze(setActiveTab); });
    await waitFor(() => expect(result.current.phase).toBe('planned'));

    expect(computeRebalancePlan).toHaveBeenCalledTimes(1);
    const [planArgs] = computeRebalancePlan.mock.calls[0];
    expect(planArgs.decisions.NVDA.quantity).toBe(48);   // 2 shares × ratio 24
    expect(planArgs.decisions.ORLY.quantity).toBe(222);  // 1 share × ratio 222
    expect(planArgs.decisions.KO.quantity).toBe(0);      // hold preserved
  });

  it('sets end_date to today and start_date to one year before', async () => {
    const fixedNow = new Date('2026-05-04T10:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    try {
      const fetchMock = captureBody();
      const { result } = renderHook(() => useTradingEngine(baseProps));
      await act(async () => {
        await result.current.handleAnalyze(setActiveTab);
      });
      const body = parseBody(fetchMock);
      expect(body.end_date).toBe('2026-05-04');
      expect(body.start_date).toBe('2025-05-04');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('useTradingEngine — handleExecuteOrders', () => {
  it('places sells then buys, updates orderResults and history.executed=true', async () => {
    const fakePlan = {
      sells: [{ ticker: 'AAPLC', quantity: 2, priceArs: 1000, volumeArs: 2000, estimatedCostArs: 0, reasoning: '', confidence: 90 }],
      buys: [{ ticker: 'KOC', quantity: 3, priceArs: 500, volumeArs: 1500, estimatedCostArs: 1507.5, reasoning: '', confidence: 80 }],
      totalSellVolume: 2000,
      totalBuyVolume: 1500,
      estimatedSellProceeds: 1990,
      warnings: [],
    };
    computeRebalancePlan.mockReturnValue(fakePlan);

    // First, run handleAnalyze to populate plan + currentRunIdRef.
    const sseResponse = (() => {
      const payload = 'event: complete\ndata: ' + JSON.stringify({
        data: { analyst_signals: {}, decisions: {} },
      }) + '\n\n';
      const stream = new ReadableStream({
        start(c) { c.enqueue(new TextEncoder().encode(payload)); c.close(); },
      });
      return new Response(stream, { status: 200 });
    })();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse));

    placeOrder
      .mockResolvedValueOnce({ success: true, data: { ok: true, numeroOperacion: 'OP-1' } }) // sell AAPLC
      .mockResolvedValueOnce({ success: false, error: 'rejected' }); // buy KOC

    const { result } = renderHook(() => useTradingEngine(baseProps));
    await act(async () => {
      await result.current.handleAnalyze(setActiveTab);
    });
    await waitFor(() => expect(result.current.phase).toBe('planned'));

    await act(async () => {
      await result.current.handleExecuteOrders();
    });

    expect(result.current.phase).toBe('done');
    expect(placeOrder).toHaveBeenCalledTimes(2);

    // First call = sell
    expect(placeOrder.mock.calls[0][0]).toMatchObject({ simbolo: 'AAPLC', side: 'sell', cantidad: 2 });
    // Second call = buy
    expect(placeOrder.mock.calls[1][0]).toMatchObject({ simbolo: 'KOC', side: 'buy', cantidad: 3 });

    expect(result.current.orderResults).toHaveLength(2);
    expect(result.current.orderResults[0]).toMatchObject({ ticker: 'AAPLC', side: 'sell', success: true });
    expect(result.current.orderResults[1]).toMatchObject({ ticker: 'KOC', side: 'buy', success: false, message: 'rejected' });

    // History was updated with executed=true and the order results.
    const runs = useHistoryStore.getState().runs;
    expect(runs[0].executed).toBe(true);
    expect(runs[0].orderResults).toHaveLength(2);
  });

  it('waits for each sell to settle before submitting any buys', async () => {
    const fakePlan = {
      sells: [{ ticker: 'AAPLC', quantity: 2, priceArs: 1000, volumeArs: 2000, estimatedCostArs: 0, reasoning: '', confidence: 90 }],
      buys: [{ ticker: 'KOC', quantity: 3, priceArs: 500, volumeArs: 1500, estimatedCostArs: 1507.5, reasoning: '', confidence: 80 }],
      totalSellVolume: 2000,
      totalBuyVolume: 1500,
      estimatedSellProceeds: 1990,
      warnings: [],
    };
    computeRebalancePlan.mockReturnValue(fakePlan);

    const sseResponse = (() => {
      const payload = 'event: complete\ndata: ' + JSON.stringify({
        data: { analyst_signals: {}, decisions: {} },
      }) + '\n\n';
      const stream = new ReadableStream({
        start(c) { c.enqueue(new TextEncoder().encode(payload)); c.close(); },
      });
      return new Response(stream, { status: 200 });
    })();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse));

    // Order of side effects across mocks — the buy must come strictly AFTER
    // waitForOrderSettlement resolves for the sell (i.e. the broker has
    // confirmed the sale is filled and proceeds are liberated).
    const callOrder: string[] = [];
    placeOrder.mockImplementation(async (args: { side: string; simbolo: string }) => {
      callOrder.push(`order:${args.side}:${args.simbolo}`);
      if (args.side === 'sell') return { success: true, data: { ok: true, numeroOperacion: 9001 } };
      return { success: true, data: { ok: true, numeroOperacion: 9002 } };
    });
    waitForOrderSettlement.mockImplementation(async (numero: number) => {
      callOrder.push(`wait:${numero}`);
      return { kind: 'filled', estado: 'terminada' };
    });

    const { result } = renderHook(() => useTradingEngine(baseProps));
    await act(async () => {
      await result.current.handleAnalyze(setActiveTab);
    });
    await waitFor(() => expect(result.current.phase).toBe('planned'));

    await act(async () => {
      await result.current.handleExecuteOrders();
    });

    expect(callOrder).toEqual([
      'order:sell:AAPLC',
      'wait:9001',
      'order:buy:KOC',
    ]);

    // waitForOrderSettlement was called with the production timeout/poll cadence.
    expect(waitForOrderSettlement).toHaveBeenCalledWith(
      9001,
      expect.objectContaining({ timeoutMs: 60_000, pollMs: 5_000, getStatus: getOrderStatus }),
    );

    // Surfaced to the user via a log entry.
    const sellPollLog = result.current.logs.find(l => l.id === 'sell-poll-9001');
    expect(sellPollLog?.status).toBe('ok');
    expect(sellPollLog?.text).toContain('AAPLC');
  });

  it('logs an error and still proceeds with buys when a sell is cancelled', async () => {
    const fakePlan = {
      sells: [{ ticker: 'AAPLC', quantity: 2, priceArs: 1000, volumeArs: 2000, estimatedCostArs: 0, reasoning: '', confidence: 90 }],
      buys: [{ ticker: 'KOC', quantity: 3, priceArs: 500, volumeArs: 1500, estimatedCostArs: 1507.5, reasoning: '', confidence: 80 }],
      totalSellVolume: 2000,
      totalBuyVolume: 1500,
      estimatedSellProceeds: 1990,
      warnings: [],
    };
    computeRebalancePlan.mockReturnValue(fakePlan);

    const sseResponse = (() => {
      const payload = 'event: complete\ndata: ' + JSON.stringify({
        data: { analyst_signals: {}, decisions: {} },
      }) + '\n\n';
      const stream = new ReadableStream({
        start(c) { c.enqueue(new TextEncoder().encode(payload)); c.close(); },
      });
      return new Response(stream, { status: 200 });
    })();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse));

    placeOrder
      .mockResolvedValueOnce({ success: true, data: { ok: true, numeroOperacion: 4242 } }) // sell
      .mockResolvedValueOnce({ success: true, data: { ok: true, numeroOperacion: 4243 } }); // buy
    waitForOrderSettlement.mockResolvedValueOnce({ kind: 'cancelled', estado: 'cancelada' });

    const { result } = renderHook(() => useTradingEngine(baseProps));
    await act(async () => {
      await result.current.handleAnalyze(setActiveTab);
    });
    await waitFor(() => expect(result.current.phase).toBe('planned'));
    await act(async () => {
      await result.current.handleExecuteOrders();
    });

    const log = result.current.logs.find(l => l.id === 'sell-poll-4242');
    expect(log?.status).toBe('error');
    // Buy still got attempted — the user is informed via the log but the
    // engine doesn't unilaterally skip planned buys.
    expect(placeOrder).toHaveBeenCalledTimes(2);
    expect(placeOrder.mock.calls[1][0]).toMatchObject({ side: 'buy', simbolo: 'KOC' });
  });
});

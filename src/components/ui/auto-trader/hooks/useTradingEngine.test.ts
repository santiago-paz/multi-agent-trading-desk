// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const placeOrder = vi.fn();
const computeRebalancePlan = vi.fn();

vi.mock('@/app/trading/actions', () => ({ placeOrder }));
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
});

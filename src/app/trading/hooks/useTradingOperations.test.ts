// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const getOperations = vi.fn();
const getCedearsForTrading = vi.fn();

vi.mock('@/app/trading/actions', () => ({ getOperations, getCedearsForTrading }));

const { useTradingOperations } = await import('./useTradingOperations');

const sampleOps = [{ numero: 1, simbolo: 'AAPLC', cantidad: 10 }];
const sampleQuickTrade = {
  cedears: [{ ticker: 'AAPLC', name: 'Apple', price: 1000 }],
  cash: 50000,
  comprometido: 0,
  effectiveCash: 50000,
  commissionRate: 0.005,
};

beforeEach(() => {
  getOperations.mockReset();
  getCedearsForTrading.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTradingOperations', () => {
  it('does not fetch when neither flag is needed', () => {
    renderHook(() => useTradingOperations(false, false));
    expect(getOperations).not.toHaveBeenCalled();
    expect(getCedearsForTrading).not.toHaveBeenCalled();
  });

  it('fetches operations when movementsNeeded becomes true', async () => {
    getOperations.mockResolvedValue({ success: true, data: sampleOps });
    const { result } = renderHook(() => useTradingOperations(true, false));
    await waitFor(() => expect(result.current.operations).toEqual(sampleOps));
    expect(result.current.isLoadingOperations).toBe(false);
    expect(getOperations).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite operations when action returns success=false', async () => {
    getOperations.mockResolvedValueOnce({ success: false, error: 'fail' });
    const { result } = renderHook(() => useTradingOperations(true, false));
    await waitFor(() => expect(result.current.isLoadingOperations).toBe(false));
    expect(result.current.operations).toEqual([]);
  });

  it('polls operations every 30 seconds', async () => {
    getOperations.mockResolvedValue({ success: true, data: sampleOps });
    vi.useFakeTimers();
    try {
      renderHook(() => useTradingOperations(true, false));
      // Flush the initial fetch microtask.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(getOperations).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(getOperations).toHaveBeenCalledTimes(2);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(getOperations).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the polling interval on unmount', async () => {
    getOperations.mockResolvedValue({ success: true, data: sampleOps });
    vi.useFakeTimers();
    try {
      const { unmount } = renderHook(() => useTradingOperations(true, false));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(getOperations).toHaveBeenCalledTimes(1);
      unmount();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(getOperations).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fetches quick-trade data once when marketDataNeeded becomes true', async () => {
    getCedearsForTrading.mockResolvedValueOnce({ success: true, data: sampleQuickTrade });
    const { result } = renderHook(() => useTradingOperations(false, true));
    await waitFor(() => expect(result.current.quickTradeData).toEqual(sampleQuickTrade));
    expect(result.current.isLoadingQuickTrade).toBe(false);
    expect(getCedearsForTrading).toHaveBeenCalledTimes(1);
  });

  it('does not refetch quick-trade data when marketDataNeeded toggles again', async () => {
    getCedearsForTrading.mockResolvedValue({ success: true, data: sampleQuickTrade });
    const { rerender } = renderHook(
      ({ md }: { md: boolean }) => useTradingOperations(false, md),
      { initialProps: { md: true } },
    );
    await waitFor(() => expect(getCedearsForTrading).toHaveBeenCalledTimes(1));
    rerender({ md: false });
    rerender({ md: true });
    expect(getCedearsForTrading).toHaveBeenCalledTimes(1);
  });

  it('keeps quickTradeData null when action returns success=false', async () => {
    getCedearsForTrading.mockResolvedValueOnce({ success: false });
    const { result } = renderHook(() => useTradingOperations(false, true));
    await waitFor(() => expect(result.current.isLoadingQuickTrade).toBe(false));
    expect(result.current.quickTradeData).toBeNull();
  });

  it('exposes fetch helpers and quickTradeFetched ref', async () => {
    getOperations.mockResolvedValue({ success: true, data: sampleOps });
    getCedearsForTrading.mockResolvedValue({ success: true, data: sampleQuickTrade });
    const { result } = renderHook(() => useTradingOperations(false, false));

    await act(async () => {
      await result.current.fetchOperationsData();
    });
    expect(result.current.operations).toEqual(sampleOps);

    await act(async () => {
      await result.current.fetchQuickTradeData();
    });
    expect(result.current.quickTradeData).toEqual(sampleQuickTrade);
    expect(result.current.quickTradeFetched).toBeDefined();
  });
});

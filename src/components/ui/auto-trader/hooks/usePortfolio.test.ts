// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const getFullPortfolioContext = vi.fn();

vi.mock('@/app/trading/actions', () => ({ getFullPortfolioContext }));

// Force the MEP store to a known fallback so effectiveMep math is deterministic.
vi.mock('@/lib/store/mep-store', () => ({
  useMepStore: (selector: (s: { mepRate: number }) => unknown) => selector({ mepRate: 1200 }),
}));

const { usePortfolio } = await import('./usePortfolio');

type SuccessShape = {
  success: true;
  holdings: Record<string, number>;
  holdingTickers: string[];
  allIolSymbols: string[];
  panelSymbols: string[];
  fmpTickers: string[];
  iolToFmp: Record<string, string>;
  fmpToIol: Record<string, string>;
  companyNames: Record<string, string>;
  cashArs: number;
  comprometidoArs: number;
  arsPrices: Record<string, number>;
  mepRate: number;
  portfolioPositions: Array<{ ticker: string; quantity: number; trade_price: number }>;
};

function makeContext(overrides: Partial<SuccessShape> = {}): SuccessShape {
  return {
    success: true,
    holdings: { AAPL: 10, KO: 5 },
    holdingTickers: ['AAPL', 'KO'],
    allIolSymbols: ['AAPLC', 'KOC'],
    panelSymbols: ['AAPLC', 'KOC'],
    fmpTickers: ['AAPL', 'KO'],
    iolToFmp: { AAPLC: 'AAPL', KOC: 'KO' },
    fmpToIol: { AAPL: 'AAPLC', KO: 'KOC' },
    companyNames: { AAPL: 'Apple Inc.', KO: 'The Coca-Cola Company' },
    cashArs: 100000,
    comprometidoArs: 5000,
    arsPrices: { AAPL: 200, KO: 50 },
    mepRate: 1300,
    portfolioPositions: [
      { ticker: 'AAPL', quantity: 10, trade_price: 200 },
      { ticker: 'KO', quantity: 5, trade_price: 50 },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  getFullPortfolioContext.mockReset();
});

describe('usePortfolio', () => {
  it('starts loading and exposes empty defaults', () => {
    getFullPortfolioContext.mockReturnValue(new Promise(() => {})); // pending
    const { result } = renderHook(() => usePortfolio());
    expect(result.current.isLoadingPortfolio).toBe(true);
    expect(result.current.holdings).toEqual({});
    expect(result.current.cashArs).toBe(0);
    expect(result.current.portfolioError).toBeNull();
    // Falls back to store mepRate (1200) since mepRateLocal is null.
    expect(result.current.effectiveMep).toBe(1200);
    expect(result.current.totalPortfolioArs).toBe(0);
  });

  it('populates holdings, prices and totals on success', async () => {
    getFullPortfolioContext.mockResolvedValueOnce(makeContext());
    const { result } = renderHook(() => usePortfolio());
    await waitFor(() => expect(result.current.isLoadingPortfolio).toBe(false));

    expect(result.current.holdings).toEqual({ AAPL: 10, KO: 5 });
    expect(result.current.holdingTickers).toEqual(['AAPL', 'KO']);
    expect(result.current.allIolSymbols).toEqual(['AAPLC', 'KOC']);
    expect(result.current.panelSymbols).toEqual(['AAPLC', 'KOC']);
    expect(result.current.fmpTickers).toEqual(['AAPL', 'KO']);
    expect(result.current.iolToFmp).toEqual({ AAPLC: 'AAPL', KOC: 'KO' });
    expect(result.current.companyNames).toEqual({ AAPL: 'Apple Inc.', KO: 'The Coca-Cola Company' });
    expect(result.current.cashArs).toBe(100000);
    expect(result.current.comprometidoArs).toBe(5000);
    expect(result.current.mepRateLocal).toBe(1300);
    // Server-supplied MEP wins over store fallback.
    expect(result.current.effectiveMep).toBe(1300);
    // 10*200 + 5*50 = 2250
    expect(result.current.totalPortfolioArs).toBe(2250);
    expect(result.current.portfolioError).toBeNull();
  });

  it('handles missing prices gracefully (treated as 0)', async () => {
    getFullPortfolioContext.mockResolvedValueOnce(
      makeContext({ holdings: { AAPL: 10, MISSING: 3 }, arsPrices: { AAPL: 200 } }),
    );
    const { result } = renderHook(() => usePortfolio());
    await waitFor(() => expect(result.current.isLoadingPortfolio).toBe(false));
    // 10*200 + 3*0 = 2000
    expect(result.current.totalPortfolioArs).toBe(2000);
  });

  it('falls back to store MEP when server returns no mepRate', async () => {
    // mepRate is null in this scenario
    getFullPortfolioContext.mockResolvedValueOnce(
      makeContext({ mepRate: null as unknown as number }),
    );
    const { result } = renderHook(() => usePortfolio());
    await waitFor(() => expect(result.current.isLoadingPortfolio).toBe(false));
    expect(result.current.mepRateLocal).toBeNull();
    expect(result.current.effectiveMep).toBe(1200); // from mock store
  });

  it('sets portfolioError when the action returns success=false', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getFullPortfolioContext.mockResolvedValueOnce({ success: false, error: 'IOL down' });
    const { result } = renderHook(() => usePortfolio());
    await waitFor(() => expect(result.current.isLoadingPortfolio).toBe(false));
    expect(result.current.portfolioError).toBe('IOL down');
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('uses default error message when success=false has no error string', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getFullPortfolioContext.mockResolvedValueOnce({ success: false });
    const { result } = renderHook(() => usePortfolio());
    await waitFor(() => expect(result.current.isLoadingPortfolio).toBe(false));
    expect(result.current.portfolioError).toBe('Error desconocido');
    errSpy.mockRestore();
  });

  it('catches thrown errors and prefixes with "Error de conexión"', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getFullPortfolioContext.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => usePortfolio());
    await waitFor(() => expect(result.current.isLoadingPortfolio).toBe(false));
    expect(result.current.portfolioError).toBe('Error de conexión: boom');
    errSpy.mockRestore();
  });

  it('loadPortfolio can be called manually to refresh', async () => {
    getFullPortfolioContext.mockResolvedValueOnce(makeContext({ cashArs: 1 }));
    const { result } = renderHook(() => usePortfolio());
    await waitFor(() => expect(result.current.isLoadingPortfolio).toBe(false));
    expect(result.current.cashArs).toBe(1);

    getFullPortfolioContext.mockResolvedValueOnce(makeContext({ cashArs: 999 }));
    await act(async () => {
      await result.current.loadPortfolio();
    });
    expect(result.current.cashArs).toBe(999);
    expect(getFullPortfolioContext).toHaveBeenCalledTimes(2);
  });
});

import { useState, useCallback, useEffect } from 'react';
import { getFullPortfolioContext } from '@/app/trading/actions';
import { useMepStore } from '@/lib/store/mep-store';

export function usePortfolio() {
  const mepRate = useMepStore(s => s.mepRate);

  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [holdingTickers, setHoldingTickers] = useState<string[]>([]);
  const [allIolSymbols, setAllIolSymbols] = useState<string[]>([]);
  const [panelSymbols, setPanelSymbols] = useState<string[]>([]);
  const [fmpTickers, setFmpTickers] = useState<string[]>([]);
  const [iolToFmp, setIolToFmp] = useState<Record<string, string>>({});
  const [fmpToIol, setFmpToIol] = useState<Record<string, string>>({});
  const [cashArs, setCashArs] = useState(0);
  const [comprometidoArs, setComprometidoArs] = useState(0);
  const [arsPrices, setArsPrices] = useState<Record<string, number>>({});
  const [mepRateLocal, setMepRateLocal] = useState<number | null>(null);
  const [portfolioPositions, setPortfolioPositions] = useState<Array<{ ticker: string; quantity: number; trade_price: number }>>([]);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    setIsLoadingPortfolio(true);
    setPortfolioError(null);
    try {
      const result = await getFullPortfolioContext();
      if (result.success) {
        setHoldings(result.holdings);
        setHoldingTickers(result.holdingTickers);
        setAllIolSymbols(result.allIolSymbols);
        setPanelSymbols(result.panelSymbols);
        setFmpTickers(result.fmpTickers);
        setIolToFmp(result.iolToFmp);
        setFmpToIol(result.fmpToIol);
        setCashArs(result.cashArs);
        setComprometidoArs(result.comprometidoArs);
        setArsPrices(result.arsPrices);
        setMepRateLocal(result.mepRate);
        setPortfolioPositions(result.portfolioPositions);
      } else {
        const errMsg = 'error' in result ? result.error : 'Error desconocido';
        setPortfolioError(errMsg ?? 'Error desconocido al obtener portfolio');
        console.error('[AutoTrader] getFullPortfolioContext returned error:', errMsg);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setPortfolioError(`Error de conexión: ${errMsg}`);
      console.error('[AutoTrader] Failed to load portfolio context:', err);
    } finally {
      setIsLoadingPortfolio(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const effectiveMep = mepRateLocal ?? mepRate ?? 1;
  const totalPortfolioArs = Object.entries(holdings).reduce((sum, [ticker, qty]) => {
    return sum + qty * (arsPrices[ticker] ?? 0);
  }, 0);

  return {
    holdings,
    holdingTickers,
    allIolSymbols,
    panelSymbols,
    fmpTickers,
    iolToFmp,
    fmpToIol,
    cashArs,
    comprometidoArs,
    arsPrices,
    mepRateLocal,
    portfolioPositions,
    isLoadingPortfolio,
    portfolioError,
    loadPortfolio,
    effectiveMep,
    totalPortfolioArs,
    mepRate,
  };
}

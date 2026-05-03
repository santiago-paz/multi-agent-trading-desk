import { useState, useCallback, useRef, useEffect } from 'react';
import { getMarketData } from '../actions';
import type { HistoricalRow } from '@/lib/fmp/types';

export function useMarketData(marketDataNeeded: boolean) {
  const [marketData, setMarketData] = useState<{
    marketData: { symbol: string; data: HistoricalRow[] }[];
    ownedSymbols: string[];
    companyNames: Record<string, string>;
  } | null>(null);
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);
  const marketDataFetched = useRef(false);

  const fetchMarketData = useCallback(async () => {
    setIsLoadingMarketData(true);
    const result = await getMarketData();
    if (result.success && result.data) {
      setMarketData(result.data as { marketData: { symbol: string; data: HistoricalRow[] }[]; ownedSymbols: string[]; companyNames: Record<string, string> });
    }
    setIsLoadingMarketData(false);
  }, []);

  useEffect(() => {
    if (marketDataNeeded && !marketDataFetched.current) {
      marketDataFetched.current = true;
      fetchMarketData(); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [marketDataNeeded, fetchMarketData]);

  return { marketData, isLoadingMarketData, fetchMarketData };
}

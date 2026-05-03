import { useState, useCallback, useRef, useEffect } from 'react';
import { getOperations, getCedearsForTrading } from '../actions';
import { Operation } from '@/lib/iol/types';
import { TradableCedear } from '@/components/ui/QuickTradePanel';

export function useTradingOperations(movementsNeeded: boolean, marketDataNeeded: boolean) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoadingOperations, setIsLoadingOperations] = useState(false);

  const [quickTradeData, setQuickTradeData] = useState<{
    cedears: TradableCedear[];
    cash: number;
    comprometido: number;
    effectiveCash: number;
    commissionRate: number;
  } | null>(null);
  const [isLoadingQuickTrade, setIsLoadingQuickTrade] = useState(false);

  const operationsFetched = useRef(false);
  const quickTradeFetched = useRef(false);

  const fetchOperationsData = useCallback(async () => {
    setIsLoadingOperations(true);
    const result = await getOperations();
    if (result.success && result.data) {
      setOperations(result.data as Operation[]);
    }
    setIsLoadingOperations(false);
  }, []);

  const fetchQuickTradeData = useCallback(async () => {
    setIsLoadingQuickTrade(true);
    const result = await getCedearsForTrading();
    if (result.success && result.data) {
      setQuickTradeData(result.data);
    }
    setIsLoadingQuickTrade(false);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (movementsNeeded) {
      if (!operationsFetched.current) {
        operationsFetched.current = true;
        fetchOperationsData(); // eslint-disable-line react-hooks/set-state-in-effect
      }

      intervalId = setInterval(() => {
        fetchOperationsData();
      }, 30 * 1000); // Actualiza cada 30 segundos
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [movementsNeeded, fetchOperationsData]);

  useEffect(() => {
    if (marketDataNeeded && !quickTradeFetched.current) {
      quickTradeFetched.current = true;
      fetchQuickTradeData(); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [marketDataNeeded, fetchQuickTradeData]);

  return {
    operations,
    isLoadingOperations,
    fetchOperationsData,
    quickTradeData,
    isLoadingQuickTrade,
    fetchQuickTradeData,
    quickTradeFetched
  };
}

import { useState, useCallback, useEffect } from 'react';
import { getPortfolioSummary } from '../actions';
import { PortfolioResponse, DatosPerfil, EstadoCuenta } from '@/lib/iol/types';

export function usePortfolioData() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [usdPrices, setUsdPrices] = useState<Record<string, { price: number; pct: number }>>({});
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [perfil, setPerfil] = useState<DatosPerfil | null>(null);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null);

  const fetchPortfolio = useCallback(async () => {
    setIsLoadingPortfolio(true);
    const result = await getPortfolioSummary();
    if (result.success && result.data) {
      setPortfolio(result.data.portfolio);
      setUsdPrices(result.data.usdPrices ?? {});
      if (result.data.estadoCuenta) setEstadoCuenta(result.data.estadoCuenta as EstadoCuenta);
      if (result.data.perfil) setPerfil(result.data.perfil as DatosPerfil);
    }
    setIsLoadingPortfolio(false);
  }, []);

  useEffect(() => {
    fetchPortfolio(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchPortfolio]);

  return { portfolio, usdPrices, isLoadingPortfolio, perfil, estadoCuenta, fetchPortfolio };
}

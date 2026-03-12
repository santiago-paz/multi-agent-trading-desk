import { useState, useMemo } from 'react';
import { PortfolioAsset, PortfolioResponse } from '@/lib/iol/types';

export type SortKey = 'simbolo' | 'descripcion' | 'cantidad' | 'ultimoPrecio' | 'valorizado' | 'variacionDiaria' | 'gananciaDinero';
export type SortDir = 'asc' | 'desc';

function getSortValue(asset: PortfolioAsset, key: SortKey): string | number {
  switch (key) {
    case 'simbolo':         return asset.titulo.simbolo;
    case 'descripcion':     return asset.titulo.descripcion;
    case 'cantidad':        return asset.cantidad;
    case 'ultimoPrecio':    return asset.ultimoPrecio;
    case 'valorizado':      return asset.valorizado;
    case 'variacionDiaria': return asset.variacionDiaria;
    case 'gananciaDinero':  return asset.gananciaDinero;
  }
}

export function usePortfolioSort(portfolio: PortfolioResponse | null, mepRate: number) {
  const [sortKey, setSortKey] = useState<SortKey>('simbolo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const activos = portfolio?.activos || [];

  const totalARS = activos.reduce((acc, asset) => acc + asset.valorizado, 0);
  const totalUSD = totalARS / mepRate;
  const totalGananciaARS = activos.reduce((acc, asset) => acc + asset.gananciaDinero, 0);
  const totalGananciaUSD = totalGananciaARS / mepRate;

  const sortedActivos = useMemo(() => {
    const copy = [...activos];
    copy.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      let cmp: number;
      if (typeof va === 'string' && typeof vb === 'string') {
        cmp = va.localeCompare(vb);
      } else {
        cmp = (va as number) - (vb as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [activos, sortKey, sortDir]);

  return {
    sortKey,
    sortDir,
    handleSort,
    sortedActivos,
    totalUSD,
    totalGananciaUSD,
    totalActivosEnCartera: activos.length,
  };
}

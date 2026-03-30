import { useState, useMemo } from 'react';
import { PortfolioAsset, PortfolioResponse, EstadoCuenta } from '@/lib/iol/types';

export type SortKey = 'simbolo' | 'descripcion' | 'cantidad' | 'ultimoPrecio' | 'valorizado' | 'variacionDiaria' | 'gananciaDinero' | 'gananciaPorcentaje';
export type SortDir = 'asc' | 'desc';

export interface UsdPriceEntry { price: number; pct: number }

export function getSortValue(asset: PortfolioAsset, key: SortKey): string | number {
  switch (key) {
    case 'simbolo':         return asset.titulo.simbolo;
    case 'descripcion':     return asset.titulo.descripcion;
    case 'cantidad':        return asset.cantidad;
    case 'ultimoPrecio':    return asset.ultimoPrecio;
    case 'valorizado':      return asset.valorizado;
    case 'variacionDiaria': return asset.variacionDiaria;
    case 'gananciaDinero':  return asset.gananciaDinero;
    case 'gananciaPorcentaje': return asset.gananciaPorcentaje;
  }
}

export function getCashUSD(estadoCuenta: EstadoCuenta | null, mepRate: number): number {
  if (!estadoCuenta?.cuentas) return 0;
  let total = 0;
  for (const cuenta of estadoCuenta.cuentas) {
    if (cuenta.moneda === 'peso_Argentino') {
      total += cuenta.disponible / mepRate;
    } else if (cuenta.moneda === 'dolar_Estadounidense') {
      total += cuenta.disponible;
    }
  }
  return total;
}

export function getComprometidoUSD(estadoCuenta: EstadoCuenta | null, mepRate: number): number {
  if (!estadoCuenta?.cuentas) return 0;
  let total = 0;
  for (const cuenta of estadoCuenta.cuentas) {
    if (cuenta.moneda === 'peso_Argentino') {
      total += (cuenta.comprometido || 0) / mepRate;
    } else if (cuenta.moneda === 'dolar_Estadounidense') {
      total += (cuenta.comprometido || 0);
    }
  }
  return total;
}

export function getCashARS(estadoCuenta: EstadoCuenta | null, mepRate: number): number {
  if (!estadoCuenta?.cuentas) return 0;
  let total = 0;
  for (const cuenta of estadoCuenta.cuentas) {
    if (cuenta.moneda === 'peso_Argentino') {
      total += cuenta.disponible;
    } else if (cuenta.moneda === 'dolar_Estadounidense') {
      total += cuenta.disponible * mepRate;
    }
  }
  return total;
}

export function getComprometidoARS(estadoCuenta: EstadoCuenta | null, mepRate: number): number {
  if (!estadoCuenta?.cuentas) return 0;
  let total = 0;
  for (const cuenta of estadoCuenta.cuentas) {
    if (cuenta.moneda === 'peso_Argentino') {
      total += (cuenta.comprometido || 0);
    } else if (cuenta.moneda === 'dolar_Estadounidense') {
      total += (cuenta.comprometido || 0) * mepRate;
    }
  }
  return total;
}

export function usePortfolioSort(
  portfolio: PortfolioResponse | null,
  mepRate: number,
  estadoCuenta?: EstadoCuenta | null,
  usdPrices?: Record<string, UsdPriceEntry>,
) {
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

  const activos = useMemo(() => portfolio?.activos || [], [portfolio?.activos]);

  // Use real USD prices (D-variant) when available, fallback to ARS/MEP
  let totalUSD = 0;
  let totalARS = 0;
  for (const asset of activos) {
    const sym = asset.titulo.simbolo;
    const dPrice = usdPrices?.[sym];
    if (dPrice) {
      totalUSD += dPrice.price * asset.cantidad;
      totalARS += dPrice.price * asset.cantidad * mepRate; // Approximate ARS using MEP
    } else {
      totalUSD += asset.valorizado / mepRate;
      totalARS += asset.valorizado;
    }
  }
  const cashUSD = getCashUSD(estadoCuenta ?? null, mepRate);
  const comprometidoUSD = getComprometidoUSD(estadoCuenta ?? null, mepRate);
  totalUSD += cashUSD;
  
  const cashARS = getCashARS(estadoCuenta ?? null, mepRate);
  const comprometidoARS = getComprometidoARS(estadoCuenta ?? null, mepRate);
  totalARS += cashARS;

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
    cashUSD,
    comprometidoUSD,
    totalGananciaUSD,
    totalARS,
    cashARS,
    comprometidoARS,
    totalGananciaARS,
    totalActivosEnCartera: activos.length,
  };
}

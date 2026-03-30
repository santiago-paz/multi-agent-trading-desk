import { PanelQuote, EstadoCuenta } from '@/lib/iol/types';
import { stripCurrencySuffix } from '@/lib/cedear-map';

export const COMMISSION_RATE = 0.015; // ~1.5% (0.5% fee + 21% IVA + buffer)

export interface TradableCedear {
  simbolo: string;       // IOL symbol for the order (e.g. "AAPLC")
  base: string;          // base symbol for display (e.g. "AAPL")
  descripcion: string;
  ultimoPrecio: number;
  variacionPorcentual: number;
  maxCantidad: number;
  volumen: number;
}

/**
 * Extract available ARS cash from an EstadoCuenta.
 * Prefers disponibleOperar from the 24hs settlement tier.
 */
export function extractCashArs(cuenta: EstadoCuenta): number {
  const cuentaArs = cuenta.cuentas?.find((c) => c.moneda === 'peso_Argentino');
  if (!cuentaArs) return 0;

  let cash = cuentaArs.disponible || 0;
  const hrs24 = cuentaArs.saldos?.find((s) => s.liquidacion === 'hrs24');
  if (hrs24) cash = hrs24.disponibleOperar;
  return cash;
}

/**
 * Extract committed ARS cash from an EstadoCuenta.
 */
export function extractComprometidoArs(cuenta: EstadoCuenta): number {
  const cuentaArs = cuenta.cuentas?.find((c) => c.moneda === 'peso_Argentino');
  if (!cuentaArs) return 0;
  return cuentaArs.comprometido || 0;
}

/**
 * Compute effective cash after applying the commission margin.
 */
export function effectiveCashAfterCommission(cash: number, commissionRate = COMMISSION_RATE): number {
  return cash / (1 + commissionRate);
}

/**
 * Filter a list of PanelQuotes to only the CEDEARs the user can afford,
 * deduplicated by base symbol (preferring peso/C variants over D variants),
 * sorted by volume descending.
 */
export function filterAffordableCedears(
  titulos: PanelQuote[],
  effectiveCash: number,
  includeAll: boolean = false,
): TradableCedear[] {
  const seen = new Set<string>();
  const affordable: TradableCedear[] = [];

  for (const t of titulos) {
    if (t.ultimoPrecio <= 0) continue;

    // Skip dollar-denominated instruments — we trade with peso balance
    if (t.moneda === '2') continue;

    const base = stripCurrencySuffix(t.simbolo);

    if (seen.has(base)) continue;
    seen.add(base);

    const maxQty = Math.floor(effectiveCash / t.ultimoPrecio);
    if (!includeAll && maxQty < 1) continue;

    affordable.push({
      simbolo: t.simbolo,
      base,
      descripcion: t.descripcion,
      ultimoPrecio: t.ultimoPrecio,
      variacionPorcentual: t.variacionPorcentual,
      maxCantidad: maxQty,
      volumen: t.volumen ?? t.cantidadOperaciones ?? 0,
    });
  }

  affordable.sort((a, b) => b.volumen - a.volumen);
  return affordable;
}

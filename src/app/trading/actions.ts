'use server';

import { tradingEngine } from '@/lib/trading/engine';
import { iolClient } from '@/lib/iol/client';
import { PanelQuote } from '@/lib/iol/types';
import { extractCashArs, effectiveCashAfterCommission, filterAffordableCedears, COMMISSION_RATE } from '@/lib/trading/quick-trade';

import { getHistoricalData, getAllNews, getCompanyNames, HistoricalRow } from '@/lib/market-data';
import { stripCurrencySuffix, toFmpTicker, deduplicateIolSymbols } from '@/lib/cedear-map';

export async function getMarketData() {
  try {
    // 1. Get portfolio to identify owned CEDEARs
    const portfolio = await iolClient.getPortfolio();
    if (!portfolio?.activos) {
      const msg = (portfolio as { message?: string })?.message;
      throw new Error(msg ?? 'Respuesta inesperada del servidor de IOL');
    }
    const ownedSymbols = portfolio.activos
      .filter(a => a.titulo.tipo === 'CEDEARS' || a.titulo.tipo === 'cedears')
      .map(a => a.titulo.simbolo);

    // 2. Get all CEDEARs from IOL panel
    const panelResponse = await iolClient.getPanelQuotes('cedears');
    // IOL returns currency variants with C (pesos) and D (dollars) suffixes (e.g. AAPLC, AAPLD).
    // Keep the first occurrence of each base symbol (strip suffix), preserving all CEDEARs.
    const iolPriceMap = new Map<string, { price: number; pct: number }>();
    for (const t of panelResponse.titulos || []) {
      const base = stripCurrencySuffix(t.simbolo);
      if (!iolPriceMap.has(base)) {
        iolPriceMap.set(base, { price: t.ultimoPrecio, pct: t.variacionPorcentual });
      }
    }
    const panelSymbols = Array.from(iolPriceMap.keys());

    // 3. Union of symbols (owned first), no cap
    const allSymbols = Array.from(new Set([...ownedSymbols, ...panelSymbols]));

    // 4. Fetch 7-day historical data in parallel, tolerating individual failures.
    //    Use toFmpTicker() to translate IOL symbols (e.g. XROX → XRX) for the FMP API.
    //    For symbols where FMP has no data, fall back to IOL price as a 2-point entry
    //    so the symbol still appears in the table with its current price and daily % change.
    const settled = await Promise.allSettled(
      allSymbols.map(async (symbol) => {
        const fmpTicker = toFmpTicker(symbol);
        if (!fmpTicker) return { symbol, data: [] as HistoricalRow[] };
        const data = await getHistoricalData(fmpTicker, 7);
        return { symbol, data };
      })
    );

    const marketData: { symbol: string; data: HistoricalRow[] }[] = [];
    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      const symbol = allSymbols[i];
      if (r.status === 'fulfilled' && r.value.data.length > 0) {
        // Always key by IOL symbol for display consistency
        marketData.push({ symbol, data: r.value.data });
      } else {
        // Fallback: construct a 2-point history from IOL data so sparkline shows direction
        const iol = iolPriceMap.get(symbol);
        if (iol) {
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const prevPrice = iol.pct !== 0 ? iol.price / (1 + iol.pct / 100) : iol.price;
          marketData.push({
            symbol,
            data: [
              { date: yesterday, open: prevPrice, high: prevPrice, low: prevPrice, close: prevPrice, volume: 0 },
              { date: today, open: iol.price, high: iol.price, low: iol.price, close: iol.price, volume: 0 },
            ],
          });
        }
      }
    }

    // 5. Fetch company names (cached — only calls FMP for new symbols)
    //    Use FMP tickers for the lookup, then map results back to IOL symbols.
    const fmpSymbols = allSymbols.map(s => toFmpTicker(s)).filter((s): s is string => s !== null);
    const fmpNames = await getCompanyNames(fmpSymbols);
    const companyNames: Record<string, string> = {};
    for (const sym of allSymbols) {
      const fmp = toFmpTicker(sym);
      if (fmp && fmpNames[fmp]) {
        companyNames[sym] = fmpNames[fmp];
      }
    }

    return { success: true, data: { marketData, ownedSymbols, companyNames } };
  } catch (error) {
    console.error('Failed to fetch market data:', error);
    return { success: false, error: 'Failed to fetch market data' };
  }
}

export async function getNewsMetadata() {
  try {
    const { general, specific } = await getAllNews();

    return { success: true, data: { general, specific } };
  } catch (error) {
    console.error('Failed to fetch news metadata:', error);
    return { success: false, error: 'Failed to fetch news metadata' };
  }
}


export async function getPortfolioSummary() {
    try {
        // Single batch — avoids duplicate calls to getPortfolio, getEstadoCuenta, getMEP
        const [portfolio, estadoCuenta, mepRate, cedearsPanel, perfil] = await Promise.all([
            iolClient.getPortfolio(),
            iolClient.getEstadoCuenta(),
            iolClient.getMEP(),
            iolClient.getPanelQuotes('cedears'),
            iolClient.getDatosPerfil(),
        ]);

        // Calculate portfolio value from already-fetched data (no extra API calls)
        const valueUSD = tradingEngine.calculatePortfolioValueFromData(portfolio, estadoCuenta, mepRate);

        // Build a map of D-suffix (dollar) prices keyed by base symbol.
        // e.g. AAPLD → AAPL, so the portfolio (which uses bare symbols) can look up USD prices.
        const usdPrices: Record<string, { price: number; pct: number }> = {};
        const rawSymbols = new Set((cedearsPanel.titulos || []).map(t => t.simbolo));
        for (const t of cedearsPanel.titulos || []) {
            const sym = t.simbolo;
            if (sym.length > 1 && sym.endsWith('D')) {
                const base = stripCurrencySuffix(sym);
                const cVariant = base + 'C';
                // Only treat as D-variant if the C-variant also exists
                if (rawSymbols.has(cVariant)) {
                    usdPrices[base] = { price: t.ultimoPrecio, pct: t.variacionPorcentual };
                }
            }
        }

        return { success: true, data: { portfolio, valueUSD, mepRate, usdPrices, estadoCuenta, perfil } };
    } catch (error) {
        console.error('Failed to fetch portfolio summary:', error);
        return { success: false, error: 'Failed to fetch portfolio summary' };
    }
}

export async function getMEPRate() {
    try {
        const mepRate = await iolClient.getMEP();
        return { success: true, data: mepRate };
    } catch (error) {
        console.error('Failed to fetch MEP rate alone:', error);
        return { success: false, error: 'Failed to fetch MEP rate' };
    }
}

export async function getOperations() {
    try {
        const operations = await iolClient.getOperations(30);
        return { success: true, data: operations };
    } catch (error) {
        console.error('Failed to fetch operations:', error);
        return { success: false, error: 'Failed to fetch operations' };
    }
}

export async function getAccountStatement() {
  try {
    const estadoCuenta = await iolClient.getEstadoCuenta();
    return { success: true, data: estadoCuenta };
  } catch (error) {
    console.error('Failed to fetch account statement:', error);
    return { success: false, error: 'Failed to fetch account statement' };
  }
}

export async function getProfileData() {
  try {
    const perfil = await iolClient.getDatosPerfil();
    return { success: true, data: perfil };
  } catch (error) {
    console.error('Failed to fetch profile data:', error);
    return { success: false, error: 'Failed to fetch profile data' };
  }
}


/**
 * Returns all CEDEARs the user can afford for the Quick Trade window.
 * Includes price, max affordable quantity, and applies a commission margin.
 */
export async function getAffordableCedearsForTrading() {
  try {
    const [cuenta, cedearsPanel] = await Promise.all([
      iolClient.getEstadoCuenta(),
      iolClient.getPanelQuotes('cedears'),
    ]);

    if (!cuenta?.cuentas) {
      return { success: false as const, error: 'No se pudo obtener el saldo de IOL' };
    }

    const cash = extractCashArs(cuenta);
    const effective = effectiveCashAfterCommission(cash);
    const cedears = filterAffordableCedears(cedearsPanel.titulos || [], effective);

    return {
      success: true as const,
      data: {
        cedears,
        cash,
        effectiveCash: effective,
        commissionRate: COMMISSION_RATE,
      },
    };
  } catch (error) {
    console.error('getAffordableCedearsForTrading failed:', error);
    return { success: false as const, error: 'No se pudieron obtener los CEDEARs disponibles' };
  }
}

/**
 * Places a buy order for a CEDEAR via IOL.
 */
export async function placeBuyOrder(params: {
  simbolo: string;
  cantidad: number;
  precio: number;
  plazo: 't0' | 't1' | 't2';
  tipoOrden: 'precioLimite' | 'precioMercado';
}) {
  return placeOrder({ ...params, side: 'buy' });
}

/**
 * Places a buy or sell order for a CEDEAR via IOL.
 */
export async function placeOrder(params: {
  simbolo: string;
  cantidad: number;
  precio: number;
  plazo: 't0' | 't1' | 't2';
  tipoOrden: 'precioLimite' | 'precioMercado';
  side: 'buy' | 'sell';
}) {
  try {
    // Validez = end of today (IOL expects ISO date-time)
    const today = new Date();
    today.setHours(23, 59, 59, 0);
    const validez = today.toISOString();

    const result = await iolClient.placeOrder({
      mercado: 'bCBA',
      simbolo: params.simbolo,
      cantidad: params.cantidad,
      precio: params.precio,
      plazo: params.plazo,
      validez,
      tipoOrden: params.tipoOrden,
      side: params.side,
    });

    // Normalize: IOL may return messages as empty or in unexpected shapes
    const data = {
      ok: result.ok ?? false,
      messages: Array.isArray(result.messages) ? result.messages : [],
    };

    if (!data.ok) {
      console.warn(`placeOrder(${params.side}): IOL rejected order:`, JSON.stringify(result));
    }

    return { success: true as const, data };
  } catch (error) {
    console.error(`placeOrder(${params.side}) failed:`, error);
    const msg = error instanceof Error ? error.message : 'Error al enviar la orden';
    return { success: false as const, error: msg };
  }
}

/**
 * Returns the CEDEAR symbols that the user can afford based on IOL balance.
 * Used by the AI Hedge Fund window to know which tickers to analyze.
 */
export async function getAffordableCedears() {
  try {
    // 1. Get cash
    const cuenta = await iolClient.getEstadoCuenta();
    if (!cuenta?.cuentas) {
      return { success: false as const, error: 'No se pudo obtener el saldo de IOL' };
    }
    const cuentaArs = cuenta.cuentas.find((c) => c.moneda === 'peso_Argentino');
    let cash = cuentaArs?.disponible || 0;
    const inmediato = cuentaArs?.saldos?.find((s) => s.liquidacion === 'inmediato');
    if (inmediato) cash = inmediato.disponibleOperar;

    // 2. Get CEDEARs panel, MEP rate, and current portfolio holdings
    const [cedearsPanel, mepRate, portfolio] = await Promise.all([
      iolClient.getPanelQuotes('cedears'),
      iolClient.getMEP(),
      iolClient.getPortfolio().catch(() => null),
    ]);
    const titulos = cedearsPanel.titulos || [];
    const priceInArs = (t: PanelQuote) => t.moneda === '2' ? t.ultimoPrecio * mepRate : t.ultimoPrecio;

    // 3. Filter affordable, score by liquidity, pick top 10
    const affordable = titulos.filter((t) => t.ultimoPrecio > 0 && priceInArs(t) <= cash);
    const hasVolume = affordable.some((t) => (t.volumen ?? 0) > 0);
    const metric = (t: PanelQuote) => hasVolume ? (t.volumen ?? 0) : (t.cantidadOperaciones ?? 0);
    const maxVal = Math.max(...affordable.map(metric), 1);
    const sorted = affordable
      .map((t) => ({ ...t, _score: metric(t) / maxVal }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 10);

    // Deduplicate: IOL lists peso (C) and dollar (D) variants.
    // Strip suffix to produce base IOL symbols, then map to FMP tickers.
    const rawSymbols: string[] = sorted.map((t) => t.simbolo);
    const iolSymbols = deduplicateIolSymbols(rawSymbols);

    // Build FMP ticker list (excludes symbols with no US equivalent like CSNA3)
    const fmpTickers: string[] = [];
    const iolToFmp: Record<string, string> = {};
    for (const sym of iolSymbols) {
      const fmp = toFmpTicker(sym);
      if (fmp) {
        fmpTickers.push(fmp);
        iolToFmp[sym] = fmp;
      }
    }

    const arsPrices: Record<string, number> = {};
    for (const t of sorted) {
      const key = stripCurrencySuffix(t.simbolo as string);
      // Keep the lowest ARS price for the base symbol (most affordable)
      const price = priceInArs(t);
      if (!(key in arsPrices) || price < arsPrices[key]) {
        arsPrices[key] = price;
      }
    }

    // 5. Map current IOL holdings to backend PortfolioPosition format (FMP tickers, USD prices)
    const portfolioPositions: Array<{ ticker: string; quantity: number; trade_price: number }> = [];
    if (portfolio?.activos) {
      for (const asset of portfolio.activos) {
        if (asset.titulo.tipo !== 'CEDEARS' && asset.titulo.tipo !== 'cedears') continue;
        if (asset.cantidad <= 0) continue;
        const base = stripCurrencySuffix(asset.titulo.simbolo);
        const fmp = toFmpTicker(base);
        if (!fmp) continue;
        const tradePriceArs = asset.ppc > 0 ? asset.ppc : asset.ultimoPrecio;
        if (tradePriceArs <= 0) continue;
        portfolioPositions.push({
          ticker: fmp,
          quantity: asset.cantidad,
          trade_price: Math.round((tradePriceArs / mepRate) * 100) / 100,
        });
      }
    }

    return { success: true as const, symbols: iolSymbols, fmpTickers, iolToFmp, cash, arsPrices, mepRate, portfolioPositions };
  } catch (error) {
    console.error('getAffordableCedears failed:', error);
    return { success: false as const, error: 'No se pudo obtener CEDEARs disponibles' };
  }
}



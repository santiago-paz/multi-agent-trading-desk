'use server';

import { tradingEngine } from '@/lib/trading/engine';
import { iolClient } from '@/lib/iol/client';
import { extractCashArs, extractComprometidoArs, effectiveCashAfterCommission, filterAffordableCedears, COMMISSION_RATE } from '@/lib/trading/quick-trade';

import type { HistoricalRow, CompanyProfile, IncomeStatementRow, KeyMetricsRow, CashFlowRow, BalanceSheetRow, FinancialScores, DCFValue, NewsItem, SymbolSearchHit } from '@/lib/fmp/types';
import { getHistoricalData, getAllNews, getCompanyNames, getCompanyProfile, getIncomeStatements, getKeyMetrics, getCashFlowStatements, getBalanceSheetStatements, getFinancialScores, getDCFValue, getTickerNews, searchSymbolHits } from '@/lib/fmp/market-data';
import { stripCurrencySuffix, toFmpTicker, isEtf } from '@/lib/cedear-map';
import { DEMO_MODE, DEMO_MEP_RATE, DEMO_PERFIL, DEMO_ESTADO_CUENTA, DEMO_PORTFOLIO, DEMO_USD_PRICES, DEMO_VALUE_USD, DEMO_OPERATIONS, DEMO_NEWS_GENERAL, DEMO_NEWS_SPECIFIC, getDemoMarketData, getDemoCedearsForTrading, getDemoFullPortfolioContext } from '@/lib/demo/data';

// Cap on simultaneous outbound FMP fetches. Without this, firing 200+ parallel
// requests saturates undici's socket pool and trips FMP rate-limiting, surfacing
// as opaque `fetch failed` errors on most of the batch.
const FMP_FETCH_CONCURRENCY = 8;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      try {
        results[idx] = { status: 'fulfilled', value: await worker(items[idx], idx) };
      } catch (reason) {
        results[idx] = { status: 'rejected', reason };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

export async function getMarketData() {
  if (DEMO_MODE) return { success: true, data: getDemoMarketData() };
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

    // 4. Fetch 7-day historical data with bounded concurrency, tolerating individual failures.
    //    Use toFmpTicker() to translate IOL symbols (e.g. XROX → XRX) for the FMP API.
    //    For symbols where FMP has no data, fall back to IOL price as a 2-point entry
    //    so the symbol still appears in the table with its current price and daily % change.
    const settled = await mapWithConcurrency(allSymbols, FMP_FETCH_CONCURRENCY, async (symbol) => {
      const fmpTicker = toFmpTicker(symbol);
      if (!fmpTicker) return { symbol, data: [] as HistoricalRow[] };
      const data = await getHistoricalData(fmpTicker, 7);
      return { symbol, data };
    });

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
  if (DEMO_MODE) return { success: true, data: { general: DEMO_NEWS_GENERAL, specific: DEMO_NEWS_SPECIFIC } };
  try {
    const { general, specific } = await getAllNews();

    return { success: true, data: { general, specific } };
  } catch (error) {
    console.error('Failed to fetch news metadata:', error);
    return { success: false, error: 'Failed to fetch news metadata' };
  }
}


export async function getPortfolioSummary() {
    if (DEMO_MODE) return { success: true, data: { portfolio: DEMO_PORTFOLIO, valueUSD: DEMO_VALUE_USD, mepRate: DEMO_MEP_RATE, usdPrices: DEMO_USD_PRICES, estadoCuenta: DEMO_ESTADO_CUENTA, perfil: DEMO_PERFIL } };
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
    if (DEMO_MODE) return { success: true, data: DEMO_MEP_RATE };
    try {
        const mepRate = await iolClient.getMEP();
        return { success: true, data: mepRate };
    } catch (error) {
        console.error('Failed to fetch MEP rate alone:', error);
        return { success: false, error: 'Failed to fetch MEP rate' };
    }
}

export async function getOperations() {
    if (DEMO_MODE) return { success: true, data: DEMO_OPERATIONS };
    try {
        const operations = await iolClient.getOperations(30);
        return { success: true, data: operations };
    } catch (error) {
        console.error('Failed to fetch operations:', error);
        return { success: false, error: 'Failed to fetch operations' };
    }
}


/**
 * Returns CEDEARs for the Quick Trade window.
 * Includes price, max affordable quantity, and applies a commission margin.
 */
export async function getCedearsForTrading() {
  if (DEMO_MODE) return { success: true as const, data: getDemoCedearsForTrading() };
  try {
    const [cuenta, cedearsPanel] = await Promise.all([
      iolClient.getEstadoCuenta(),
      iolClient.getPanelQuotes('cedears'),
    ]);

    if (!cuenta?.cuentas) {
      return { success: false as const, error: 'No se pudo obtener el saldo de IOL' };
    }

    const cash = extractCashArs(cuenta);
    const comprometido = extractComprometidoArs(cuenta);
    const effective = effectiveCashAfterCommission(cash);
    const cedears = filterAffordableCedears(cedearsPanel.titulos || [], effective, true);

    return {
      success: true as const,
      data: {
        cedears,
        cash,
        comprometido,
        effectiveCash: effective,
        commissionRate: COMMISSION_RATE,
      },
    };
  } catch (error) {
    console.error('getCedearsForTrading failed:', error);
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
  monto?: number;
}) {
  if (DEMO_MODE) return { success: true as const, data: { ok: true, numeroOperacion: Math.floor(100000 + Math.random() * 900000), messages: [] } };
  try {
    // Validez = end of today (IOL expects ISO date-time)
    const today = new Date();
    today.setHours(23, 59, 59, 0);
    const validez = today.toISOString();

    let cantidad: number | undefined = params.cantidad;
    let { monto } = params;

    // For market buys, IOL rejects bodies that include `cantidad` at all
    // ("Precio mercado no debe tener cantidad") — send only `monto`.
    if (params.side === 'buy' && params.tipoOrden === 'precioMercado') {
      monto = monto ?? cantidad * params.precio;
      cantidad = undefined;
    }

    const result = await iolClient.placeOrder({
      mercado: 'bCBA',
      simbolo: params.simbolo,
      cantidad,
      precio: params.precio,
      plazo: params.plazo,
      validez,
      tipoOrden: params.tipoOrden,
      side: params.side,
      monto,
    });

    // Normalize: IOL may return messages as empty or in unexpected shapes
    // A successful order usually returns { numeroOperacion: 123456 }
    const isSuccess = result.numeroOperacion !== undefined || result.ok === true;
    const data = {
      ok: isSuccess,
      numeroOperacion: result.numeroOperacion,
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
 * Returns full portfolio context for the Auto Trader window.
 * Unlike getAffordableCedears(), this does NOT filter by affordability.
 * Returns ALL CEDEARs in the panel + all current holdings.
 */
export async function getFullPortfolioContext() {
  if (DEMO_MODE) return getDemoFullPortfolioContext();
  try {
    const [portfolio, cuenta, mepRate, cedearsPanel] = await Promise.all([
      iolClient.getPortfolio(),
      iolClient.getEstadoCuenta(),
      iolClient.getMEP(),
      iolClient.getPanelQuotes('cedears'),
    ]);

    const cashArs = extractCashArs(cuenta);
    const comprometidoArs = extractComprometidoArs(cuenta);
    const titulos = cedearsPanel.titulos || [];

    // Build price map for ALL CEDEARs (deduplicated by base symbol, prefer peso/C variant)
    const arsPrices: Record<string, number> = {};
    const liquidityMap: Record<string, number> = {};
    const seen = new Set<string>();
    for (const t of titulos) {
      if (t.ultimoPrecio <= 0) continue;
      if (t.moneda === '2') continue; // skip dollar-denominated
      const base = stripCurrencySuffix(t.simbolo);
      if (seen.has(base)) continue;
      seen.add(base);
      arsPrices[base] = t.ultimoPrecio;
      // Use volume as primary liquidity metric; fall back to cantidadOperaciones
      liquidityMap[base] = (t.volumen ?? 0) || (t.cantidadOperaciones ?? 0);
    }

    // Current holdings from portfolio
    const holdings: Record<string, number> = {};
    const holdingTickers: string[] = [];
    const portfolioPositions: Array<{ ticker: string; quantity: number; trade_price: number }> = [];

    if (portfolio?.activos) {
      for (const asset of portfolio.activos) {
        if (asset.titulo.tipo !== 'CEDEARS' && asset.titulo.tipo !== 'cedears') continue;
        if (asset.cantidad <= 0) continue;
        const base = stripCurrencySuffix(asset.titulo.simbolo);
        holdings[base] = (holdings[base] || 0) + asset.cantidad;
        if (!holdingTickers.includes(base)) holdingTickers.push(base);

        // Also build backend-compatible positions
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

    // Top 10 most liquid CEDEARs (by volume/operations), excluding those already in portfolio
    const panelSymbols = Object.keys(liquidityMap)
      .filter(s => !holdingTickers.includes(s))
      .sort((a, b) => (liquidityMap[b] || 0) - (liquidityMap[a] || 0))
      .slice(0, 10);

    // Combined tickers: portfolio first, then top liquid
    const allIolSymbols = [...holdingTickers, ...panelSymbols];

    // Build IOL→FMP and FMP→IOL mappings (deduplicate FMP tickers)
    const fmpTickers: string[] = [];
    const fmpTickerSet = new Set<string>();
    const iolToFmp: Record<string, string> = {};
    const fmpToIol: Record<string, string> = {};
    for (const sym of allIolSymbols) {
      const fmp = toFmpTicker(sym);
      if (fmp) {
        iolToFmp[sym] = fmp;
        // Only add to fmpTickers once; prefer the first mapping (portfolio over candidates)
        if (!fmpTickerSet.has(fmp)) {
          fmpTickerSet.add(fmp);
          fmpTickers.push(fmp);
          fmpToIol[fmp] = sym;
        }
      }
    }

    // Resolve company names so the UI can show the underlying business
    // alongside the IOL ticker (lets the user verify the CEDEAR mapping).
    const companyNames: Record<string, string> = {};
    try {
      const fmpNames = (await getCompanyNames(fmpTickers)) ?? {};
      for (const [iol, fmp] of Object.entries(iolToFmp)) {
        const name = fmpNames[fmp];
        if (name && name !== fmp) companyNames[iol] = name;
      }
    } catch (err) {
      console.warn('[AutoTrader] getCompanyNames failed; continuing without names:', err);
    }

    // ── Verbose logging ────────────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║              AUTO TRADER — PORTFOLIO CONTEXT                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`  Cash ARS:      $${cashArs.toLocaleString('es-AR')} ARS`);
    console.log(`  MEP rate:      ${mepRate.toFixed(2)}`);
    console.log(`  Cash USD:      ~$${(cashArs / mepRate).toFixed(0)} USD`);
    console.log(`  Panel total:   ${titulos.length} instrumentos en panel CEDEARs`);
    console.log(`  Con precio >0: ${seen.size} símbolos base (dedup, solo pesos)`);
    console.log('');
    console.log('  ── Holdings (%d posiciones) ──', holdingTickers.length);
    if (holdingTickers.length > 0) {
      for (const t of holdingTickers) {
        const fmpT = toFmpTicker(t);
        const qty = holdings[t];
        const price = arsPrices[t] ?? 0;
        const val = qty * price;
        console.log(`    ${t.padEnd(8)} → FMP: ${(fmpT ?? '(null)').padEnd(8)} | ${qty} units @ $${price.toFixed(0)} = $${val.toLocaleString('es-AR')} ARS`);
      }
    } else {
      console.log('    (sin posiciones en CEDEARs)');
    }
    console.log('');
    console.log('  ── Candidatos líquidos (top 10, excl. portfolio) ──');
    for (const s of panelSymbols) {
      const fmpS = toFmpTicker(s);
      const liq = liquidityMap[s] ?? 0;
      const price = arsPrices[s] ?? 0;
      console.log(`    ${s.padEnd(8)} → FMP: ${(fmpS ?? '(null — skipped)').padEnd(8)} | vol/ops: ${liq.toLocaleString('es-AR').padStart(12)} | $${price.toFixed(0)} ARS`);
    }
    console.log('');
    console.log('  ── Tickers a enviar al AI (%d) ──', fmpTickers.length);
    console.log(`    ${fmpTickers.join(', ')}`);
    const mappedDiff = Object.entries(iolToFmp).filter(([iol, fmp]) => iol !== fmp);
    if (mappedDiff.length > 0) {
      console.log('  ── Mappings IOL→FMP (solo diferencias) ──');
      for (const [iol, fmp] of mappedDiff) {
        console.log(`    ${iol} → ${fmp}`);
      }
    }
    const skippedNull = allIolSymbols.filter(s => toFmpTicker(s) === null);
    if (skippedNull.length > 0) {
      console.log('  ── Skipped (no FMP equivalent) ──');
      console.log(`    ${skippedNull.join(', ')}`);
    }
    console.log('──────────────────────────────────────────────────────────────\n');

    return {
      success: true as const,
      holdings,
      holdingTickers,
      panelSymbols,
      allIolSymbols,
      fmpTickers,
      iolToFmp,
      fmpToIol,
      companyNames,
      cashArs,
      comprometidoArs,
      arsPrices,
      mepRate,
      portfolioPositions,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('\n[AutoTrader] ❌ getFullPortfolioContext FAILED:', msg);
    console.error('[AutoTrader] Stack:', error instanceof Error ? error.stack : '(no stack)');
    return { success: false as const, error: `Error IOL: ${msg}` };
  }
}

interface CompanyDetailResult {
  fmpTicker: string | null;
  profile: CompanyProfile | null;
  isEtf: boolean;
  noUsEquivalent: boolean;
  priceHistory: { date: string; close: number; volume: number }[];
  incomeStatements: IncomeStatementRow[];
}

export async function searchTickerSymbols(
  query: string,
): Promise<{ success: true; data: SymbolSearchHit[] } | { success: false; error: string }> {
  try {
    const data = await searchSymbolHits(query, 15);
    return { success: true, data };
  } catch (error) {
    console.error('searchTickerSymbols:', error);
    return { success: false, error: 'No se pudo buscar símbolos' };
  }
}

export async function getCompanyDetail(iolBaseSymbol: string): Promise<{ success: true; data: CompanyDetailResult } | { success: false; error: string }> {
  try {
    const etf = isEtf(iolBaseSymbol);
    const fmpTicker = toFmpTicker(iolBaseSymbol);

    if (!fmpTicker) {
      return { success: true, data: { fmpTicker: null, profile: null, isEtf: etf, noUsEquivalent: true, priceHistory: [], incomeStatements: [] } };
    }

    const [profile, history, income] = await Promise.allSettled([
      getCompanyProfile(fmpTicker),
      getHistoricalData(fmpTicker, 365),
      getIncomeStatements(fmpTicker, 'annual'),
    ]);

    const profileData = profile.status === 'fulfilled' ? profile.value : null;
    const historyData = history.status === 'fulfilled' ? history.value : [];
    const incomeData = income.status === 'fulfilled' ? income.value : [];

    return {
      success: true,
      data: {
        fmpTicker,
        profile: profileData,
        isEtf: etf || (profileData?.isEtf ?? false),
        noUsEquivalent: false,
        priceHistory: historyData.map(r => ({
          date: r.date.toISOString().split('T')[0],
          close: r.close,
          volume: r.volume,
        })),
        incomeStatements: incomeData,
      },
    };
  } catch (error) {
    console.error('getCompanyDetail failed:', error);
    return { success: false, error: 'No se pudo obtener información de la compañía' };
  }
}

export interface AdvancedDetailResult {
  keyMetrics: KeyMetricsRow[];
  cashFlow: CashFlowRow[];
  balanceSheet: BalanceSheetRow[];
  scores: FinancialScores | null;
  dcf: DCFValue | null;
}

export async function getCompanyAdvancedData(fmpTicker: string): Promise<{ success: true; data: AdvancedDetailResult } | { success: false; error: string }> {
  try {
    const [metrics, cashFlow, balanceSheet, scores, dcf] = await Promise.allSettled([
      getKeyMetrics(fmpTicker, 'annual'),
      getCashFlowStatements(fmpTicker, 'annual'),
      getBalanceSheetStatements(fmpTicker, 'annual'),
      getFinancialScores(fmpTicker),
      getDCFValue(fmpTicker),
    ]);

    return {
      success: true,
      data: {
        keyMetrics: metrics.status === 'fulfilled' ? metrics.value : [],
        cashFlow: cashFlow.status === 'fulfilled' ? cashFlow.value : [],
        balanceSheet: balanceSheet.status === 'fulfilled' ? balanceSheet.value : [],
        scores: scores.status === 'fulfilled' ? scores.value : null,
        dcf: dcf.status === 'fulfilled' ? dcf.value : null,
      },
    };
  } catch (error) {
    console.error('getCompanyAdvancedData failed:', error);
    return { success: false, error: 'No se pudo obtener datos avanzados' };
  }
}

export async function getCompanyNews(fmpTicker: string): Promise<{ success: true; data: NewsItem[] } | { success: false; error: string }> {
  try {
    const news = await getTickerNews(fmpTicker, 20);
    return { success: true, data: news };
  } catch (error) {
    console.error('getCompanyNews failed:', error);
    return { success: false, error: 'No se pudieron obtener noticias' };
  }
}

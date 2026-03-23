'use server';

import { tradingEngine } from '@/lib/trading/engine';
import { iolClient } from '@/lib/iol/client';

import { getHistoricalData, getAllNews, getCompanyNames, HistoricalRow } from '@/lib/market-data';

export async function getMarketData() {
  try {
    // 1. Get portfolio to identify owned CEDEARs
    const portfolio = await iolClient.getPortfolio();
    if (!portfolio?.activos) {
      const msg = (portfolio as any)?.message;
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
      const base = t.simbolo.replace(/[CD]$/, '');
      if (!iolPriceMap.has(base)) {
        iolPriceMap.set(base, { price: t.ultimoPrecio, pct: t.variacionPorcentual });
      }
    }
    const panelSymbols = Array.from(iolPriceMap.keys());

    // 3. Union of symbols (owned first), no cap
    const allSymbols = Array.from(new Set([...ownedSymbols, ...panelSymbols]));

    // 4. Fetch 7-day historical data in parallel, tolerating individual failures.
    //    For symbols where FMP has no data, fall back to IOL price as a 2-point entry
    //    so the symbol still appears in the table with its current price and daily % change.
    const settled = await Promise.allSettled(
      allSymbols.map(async (symbol) => {
        const data = await getHistoricalData(symbol, 7);
        return { symbol, data };
      })
    );

    const marketData: { symbol: string; data: HistoricalRow[] }[] = [];
    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      const symbol = allSymbols[i];
      if (r.status === 'fulfilled' && r.value.data.length > 0) {
        marketData.push(r.value);
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
    const companyNames = await getCompanyNames(allSymbols);

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
                const base = sym.slice(0, -1);
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
    const cuentaArs = cuenta.cuentas.find((c: any) => c.moneda === 'peso_Argentino');
    let cash = cuentaArs?.disponible || 0;
    const inmediato = cuentaArs?.saldos?.find((s: any) => s.liquidacion === 'inmediato');
    if (inmediato) cash = inmediato.disponibleOperar;

    // 2. Get CEDEARs panel and MEP rate
    const [cedearsPanel, mepRate] = await Promise.all([
      iolClient.getPanelQuotes('cedears'),
      iolClient.getMEP(),
    ]);
    const titulos = cedearsPanel.titulos || [];
    const priceInArs = (t: any) => t.moneda === '2' ? t.ultimoPrecio * mepRate : t.ultimoPrecio;

    // 3. Filter affordable, score by liquidity, pick top 10
    const affordable = titulos.filter((t: any) => t.ultimoPrecio > 0 && priceInArs(t) <= cash);
    const hasVolume = affordable.some((t: any) => (t.volumen ?? 0) > 0);
    const metric = (t: any) => hasVolume ? (t.volumen ?? 0) : (t.cantidadOperaciones ?? 0);
    const maxVal = Math.max(...affordable.map(metric), 1);
    const sorted = affordable
      .map((t: any) => ({ ...t, _score: metric(t) / maxVal }))
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, 10);

    // Deduplicate: IOL lists peso (C) and dollar (D) variants.
    // Strip suffix when BOTH variants exist; also filter out D-suffix tickers
    // that won't resolve on FMP (e.g. BIOXD → not a real US symbol).
    const rawSymbols: string[] = sorted.map((t: any) => t.simbolo as string);
    const rawSet = new Set(rawSymbols);
    const symbols: string[] = [];
    const seen = new Set<string>();
    for (const sym of rawSymbols) {
      if (sym.length > 1 && /[CD]$/.test(sym)) {
        const base = sym.slice(0, -1);
        const otherSuffix = sym.endsWith('C') ? 'D' : 'C';
        // Skip if both C+D variants exist (use base) or if base already in panel
        if (rawSet.has(base + otherSuffix) || rawSet.has(base)) {
          if (seen.has(base)) continue;
          seen.add(base);
          symbols.push(base);
          continue;
        }
      }
      if (!seen.has(sym)) {
        seen.add(sym);
        symbols.push(sym);
      }
    }

    const arsPrices: Record<string, number> = {};
    for (const t of sorted) {
      const sym = t.simbolo as string;
      // Map C/D variants to their base symbol for price lookup
      let key = sym;
      if (sym.length > 1 && /[CD]$/.test(sym)) {
        const base = sym.slice(0, -1);
        const otherSuffix = sym.endsWith('C') ? 'D' : 'C';
        if (rawSet.has(base + otherSuffix)) key = base;
      }
      // Keep the lowest ARS price for the base symbol (most affordable)
      const price = priceInArs(t);
      if (!(key in arsPrices) || price < arsPrices[key]) {
        arsPrices[key] = price;
      }
    }

    return { success: true as const, symbols, cash, arsPrices };
  } catch (error) {
    console.error('getAffordableCedears failed:', error);
    return { success: false as const, error: 'No se pudo obtener CEDEARs disponibles' };
  }
}



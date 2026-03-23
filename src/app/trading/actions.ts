'use server';

import { analystAgent } from '@/lib/agents/analyst';
import { sentinelAgent } from '@/lib/agents/sentinel';
import { strategistAgent } from '@/lib/agents/strategist';
import { tradingEngine } from '@/lib/trading/engine';
import { ComprehensiveAssetData } from '@/lib/market-data';
import { iolClient } from '@/lib/iol/client';
import { OrderRequest, OrderResponse } from '@/lib/iol/types';
import { bulkSetCachedAssetData, buildAssetDataFromIOLSeries } from '@/lib/historical-cache';

// ─── Prefetch historical data for all instruments ────────────────────────────

export async function prefetchHistoricalData() {
  try {
    const [cedearsPanel, bonosPanel] = await Promise.all([
      iolClient.getPanelQuotes('cedears'),
      iolClient.getPanelQuotes('titulosPublicos'),
    ]);

    // Deduplicate CEDEARs: IOL lists both peso (C) and dollar (D) variants.
    // Only strip the suffix when BOTH variants exist (e.g. AAPLC+AAPLD → AAPL).
    // This avoids mangling tickers that naturally end in C/D (INTC, MCD, JD, GILD…).
    const cedearsRaw = (cedearsPanel.titulos || []).map(t => t.simbolo);
    const cedearsRawSet = new Set(cedearsRaw);
    const cedearsSet = new Set<string>();
    for (const sym of cedearsRaw) {
      if (sym.length > 1 && /[CD]$/.test(sym)) {
        const base = sym.slice(0, -1);
        const otherSuffix = sym.endsWith('C') ? 'D' : 'C';
        if (cedearsRawSet.has(base + otherSuffix)) {
          cedearsSet.add(base);
          continue;
        }
      }
      cedearsSet.add(sym);
    }
    const bonosSymbols = (bonosPanel.titulos || []).map(t => t.simbolo);
    const allSymbols = [...Array.from(cedearsSet), ...bonosSymbols];

    console.log(`[PREFETCH] Starting historical data download for ${allSymbols.length} symbols...`);

    const BATCH_SIZE = 5;
    const results: { symbol: string; data: ComprehensiveAssetData }[] = [];
    let ok = 0;
    let fail = 0;

    for (let i = 0; i < allSymbols.length; i += BATCH_SIZE) {
      const batch = allSymbols.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (symbol) => {
          const series = await iolClient.getHistoricalSeries(symbol, 120);
          const data = buildAssetDataFromIOLSeries(symbol, series);
          return data ? { symbol, data } : null;
        })
      );

      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
          ok++;
        } else {
          fail++;
        }
      }
    }

    // Write all to cache at once
    bulkSetCachedAssetData(results);

    console.log(`[PREFETCH] Done: ${ok} cached, ${fail} failed, ${allSymbols.length} total`);
    return { success: true, cached: ok, failed: fail, total: allSymbols.length };
  } catch (error) {
    console.error('[PREFETCH] Failed:', error);
    return { success: false, error: 'Prefetch failed' };
  }
}

export async function runAnalysis() {
  try {
    // 1. Run Analyst for each symbol
    const symbols = ['AAPL', 'KO', 'TSLA'];
    const analystPromises = symbols.map(symbol => analystAgent.analyze(symbol));
    const analystResults = await Promise.all(analystPromises);

    // 2. Run Sentinel
    const sentinelResult = await sentinelAgent.analyzeRisk(symbols);

    // 3. Run Strategist
    const strategyResult = await strategistAgent.decide(analystResults, sentinelResult);

    // 4. Generate Rebalancing Orders
    // Map strategist output to target allocations
    const targetAllocations = strategyResult.allocations.map(a => ({
      symbol: a.symbol === 'CASH' ? 'PESOS' : a.symbol, // Map CASH to PESOS or appropriate symbol
      percentage: a.percentage
    })).filter(a => a.symbol !== 'PESOS'); // Filter out cash for rebalancing orders (we don't buy cash)

    const proposedOrders = await tradingEngine.generateRebalancingOrders(targetAllocations);

    return {
      success: true,
      data: {
        analystResults,
        sentinelResult,
        strategyResult,
        proposedOrders
      }
    };
  } catch (error) {
    console.error('Analysis failed:', error);
    return { success: false, error: 'Analysis failed' };
  }
}

export async function executeOrders(orders: OrderRequest[]) {
  try {
    const results: OrderResponse[] = [];
    for (const order of orders) {
      const result = await iolClient.placeOrder(order);
      results.push(result);
    }
    return { success: true, data: results };
  } catch (error) {
    console.error('Order execution failed:', error);
    return { success: false, error: 'Order execution failed' };
  }
}

import { getHistoricalData, getNews, getGeneralMarketNews, getCompanyNames, NewsItem, HistoricalRow } from '@/lib/market-data';
import { processNewsItem } from '@/lib/news-processor';

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
    //    For symbols where Yahoo Finance has no data, fall back to IOL price as a 2-point entry
    //    so the symbol still appears in the table with its current price and daily % change.
    //
    //    Skip symbols that are known to have no Yahoo Finance equivalent:
    //    - Brazilian stocks trade on B3 and end in a digit (e.g. VALE3, PETR3)
    //    - Symbols with dots or special chars (e.g. C.)
    const hasYahooData = (sym: string) => !/\d$/.test(sym) && !/[.]/.test(sym);

    const settled = await Promise.allSettled(
      allSymbols.map(async (symbol) => {
        if (!hasYahooData(symbol)) throw new Error('No Yahoo equivalent');
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

    // 5. Fetch company names (cached — only calls Yahoo for new symbols)
    const symbolsWithYahoo = allSymbols.filter(hasYahooData);
    const companyNames = await getCompanyNames(symbolsWithYahoo);

    return { success: true, data: { marketData, ownedSymbols, companyNames } };
  } catch (error) {
    console.error('Failed to fetch market data:', error);
    return { success: false, error: 'Failed to fetch market data' };
  }
}

// 1. Fetch Metadata Only (Fast)
export async function getNewsMetadata() {
  try {
    const symbols = ['AAPL', 'KO', 'TSLA'];
    
    // Fetch general market news
    const generalNews = await getGeneralMarketNews(10);
    
    // Fetch specific news for each symbol
    const specificNewsPromises = symbols.map(async (symbol) => {
      const news = await getNews(symbol, 6);
      return { symbol, news };
    });
    
    const specificNewsResults = await Promise.all(specificNewsPromises);
    
    // Transform array to object map
    const specificNews: Record<string, NewsItem[]> = {};
    specificNewsResults.forEach(item => {
      specificNews[item.symbol] = item.news;
    });

    return { 
      success: true, 
      data: {
        general: generalNews,
        specific: specificNews
      } 
    };
  } catch (error) {
    console.error('Failed to fetch news metadata:', error);
    return { success: false, error: 'Failed to fetch news metadata' };
  }
}

// 2. Enrich Single Item (Slow)
export async function enrichNewsItem(item: NewsItem) {
  try {
    const enriched = await processNewsItem(item);
    return { success: true, data: enriched };
  } catch (error) {
    console.error('Failed to enrich news item:', error);
    return { success: false, error: 'Failed to enrich item' };
  }
}

export async function getPortfolioSummary() {
    try {
        const [portfolio, valueUSD, mepRate] = await Promise.all([
            iolClient.getPortfolio(),
            tradingEngine.calculatePortfolioValue(),
            iolClient.getMEP(),
        ]);
        return { success: true, data: { portfolio, valueUSD, mepRate } };
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
    // that won't resolve on Yahoo Finance / FMP (e.g. BIOXD → not a real US symbol).
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



'use server';

import { analystAgent } from '@/lib/agents/analyst';
import { sentinelAgent } from '@/lib/agents/sentinel';
import { strategistAgent } from '@/lib/agents/strategist';
import { advisorAgent } from '@/lib/agents/advisor';
import { tradingEngine } from '@/lib/trading/engine';
import { ComprehensiveAssetData } from '@/lib/market-data';
import { iolClient } from '@/lib/iol/client';
import { OrderRequest, OrderResponse } from '@/lib/iol/types';

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

export async function getAdvisorRecommendation(strategy: 'Conservadora' | 'Media' | 'Arriesgada') {
  try {
    // 1. Fetch available cash
    const cuenta = await iolClient.getEstadoCuenta();
    const cuentaArs = cuenta?.cuentas?.find(c => c.moneda === 'peso_Argentino');
    let cash = cuentaArs?.disponible || 0;

    // Try to get more accurate disponibleOperar immediately if available
    const inmediato = cuentaArs?.saldos?.find(s => s.liquidacion === 'inmediato');
    if (inmediato) {
       cash = inmediato.disponibleOperar;
    }

    // Fetch both CEDEARs and Public Bonds to ensure we have cheap options
    const [cedearsPanel, bonosPanel] = await Promise.all([
      iolClient.getPanelQuotes('cedears'),
      iolClient.getPanelQuotes('titulosPublicos')
    ]);

    // IOL returns bond prices in ARS per unit, but the app displays paridad (price/100).
    // Divide bond ultimoPrecio by 100 to match the real market price shown in the IOL app.
    const bonosTitulosNormalized = (bonosPanel.titulos || []).map(t => ({ ...t, ultimoPrecio: t.ultimoPrecio / 100 }));
    const combinedTitulos = [...(cedearsPanel.titulos || []), ...bonosTitulosNormalized];

    // 2. We don't want to fetch 30-day Yahoo data for 100+ assets since it takes too long
    //    We will tell the LLM to pre-filter to max 10 affordable assets.
    const preFilterPrompt = `
      You are a filtering agent. The user has ${cash} ARS.
      You need to pick the top 8 to 10 best assets from this list that they can afford.
      If the user has very little money (< 10,000 ARS), prioritize cheap bonds or letters.
      Return ONLY a JSON array of strings with the symbols. Example: ["AAPL", "TX24"]
      List of assets: ${JSON.stringify(combinedTitulos.map(t => ({ symbol: t.simbolo, price: t.ultimoPrecio })))}
    `;

    const { generateText: textGen } = await import('ai');
    const { text: filteredSymbolsText } = await textGen({
      model: 'meta/llama-3.1-8b',
      system: 'Return ONLY a JSON array of strings.',
      prompt: preFilterPrompt,
    });

    let topSymbols: string[] = [];
    try {
      topSymbols = JSON.parse(filteredSymbolsText);
    } catch {
      // Fallback
      topSymbols = combinedTitulos.slice(0, 8).map(t => t.simbolo);
    }

    // 3. Fetch comprehensive data (Technicals + News) for the top candidates
    const { getComprehensiveAssetData } = await import('@/lib/market-data');
    const comprehensiveDataPromises = topSymbols.map(sym => getComprehensiveAssetData(sym));
    const comprehensiveDataResults = await Promise.all(comprehensiveDataPromises);
    const validComprehensiveData = comprehensiveDataResults.filter((data): data is NonNullable<typeof data> => data !== null);

    // 4. Pass enriched data to the Hedge Fund Advisor Agent
    const recommendation = await advisorAgent.generateRecommendation(cash, validComprehensiveData, strategy);

    return { success: true, data: recommendation };
  } catch (error) {
    console.error('Advisor Action failed:', error);
    return { success: false, error: 'Advisor Action failed' };
  }
}

// ─── Granular Advisor Steps (for progressive UI) ─────────────────────────────

export async function getAdvisorStep_Cash() {
  try {
    const cuenta = await iolClient.getEstadoCuenta();
    if (!cuenta?.cuentas) {
      const msg = (cuenta as any)?.message;
      return { success: false as const, error: msg ?? 'Respuesta inesperada del servidor de IOL' };
    }
    const cuentaArs = cuenta.cuentas.find((c: any) => c.moneda === 'peso_Argentino');
    let cash = cuentaArs?.disponible || 0;
    const inmediato = cuentaArs?.saldos?.find((s: any) => s.liquidacion === 'inmediato');
    if (inmediato) cash = inmediato.disponibleOperar;
    return { success: true as const, cash };
  } catch (error) {
    console.error('Advisor Step Cash failed:', error);
    return { success: false as const, error: 'No se pudo obtener el saldo' };
  }
}

export async function getAdvisorStep_Candidates(cash: number) {
  try {
    const [cedearsPanel, bonosPanel] = await Promise.all([
      iolClient.getPanelQuotes('cedears'),
      iolClient.getPanelQuotes('titulosPublicos'),
    ]);
    // IOL returns bond prices in ARS per unit, but the app displays paridad (price/100).
    // Divide bond ultimoPrecio by 100 to match the real market price shown in the IOL app.
    const bonosTitulosNormalized = (bonosPanel.titulos || []).map(t => ({ ...t, ultimoPrecio: t.ultimoPrecio / 100 }));
    const combinedTitulos = [...(cedearsPanel.titulos || []), ...bonosTitulosNormalized];
    const totalInstruments = combinedTitulos.length;

    // ── Server-side pre-filter (deterministic, no LLM needed here) ────────────
    // 1. Only instruments the user can afford (at least 1 unit)
    const affordable = combinedTitulos.filter(
      (t: any) => t.ultimoPrecio > 0 && t.ultimoPrecio <= cash
    );

    // 2. Sort by volume descending (most liquid / actively traded first)
    //    then take top 30 to give the LLM a manageable, high-quality set
    const top30 = affordable
      .sort((a: any, b: any) => (b.volumen ?? 0) - (a.volumen ?? 0))
      .slice(0, 30);

    // 3. If the user can't afford anything meaningful, fall back to cheapest 10
    const shortlist = top30.length >= 3 ? top30 : affordable
      .sort((a: any, b: any) => a.ultimoPrecio - b.ultimoPrecio)
      .slice(0, 10);

    // ── Deterministic scoring (no LLM = no positional bias, no latency) ───────
    // Score each candidate: volume (liquidity), affordability (diversification potential), momentum
    const maxVolume = Math.max(...shortlist.map((t: any) => t.volumen ?? 0), 1);
    const scored = shortlist.map((t: any) => {
      const volumeScore = (t.volumen ?? 0) / maxVolume;
      const affordScore = Math.min(1, cash / (t.ultimoPrecio * 3)); // can buy ≥3 units → score 1
      const momentumScore = Math.min(1, Math.max(0, (Math.abs(t.variacionPorcentual ?? 0)) / 5)); // |change| up to 5%
      const score = volumeScore * 0.4 + affordScore * 0.3 + momentumScore * 0.3;
      return { ...t, _score: score };
    });
    scored.sort((a: any, b: any) => b._score - a._score);
    const symbols: string[] = scored.slice(0, 10).map((t: any) => t.simbolo);

    // Also return price and type maps so the UI can display asset info and pass IOL prices as fallback
    const priceMap: Record<string, number> = {};
    const typeMap: Record<string, 'CEDEAR' | 'Bono'> = {};
    const cedearsSymbols = new Set((cedearsPanel.titulos || []).map((t: any) => t.simbolo));
    for (const t of shortlist) {
      const sym = (t as any).simbolo;
      priceMap[sym] = (t as any).ultimoPrecio;
      typeMap[sym] = cedearsSymbols.has(sym) ? 'CEDEAR' : 'Bono';
    }

    return { success: true as const, symbols, totalInstruments, priceMap, typeMap };
  } catch (error) {
    console.error('Advisor Step Candidates failed:', error);
    return { success: false as const, error: 'No se pudo obtener los candidatos' };
  }
}

export async function getAdvisorStep_AssetData(symbol: string, iolPrice?: number, type?: 'CEDEAR' | 'Bono') {
  try {
    // Skip Yahoo Finance entirely for bonds — they're not listed there
    if (type !== 'Bono') {
      const { getComprehensiveAssetData } = await import('@/lib/market-data');
      const data = await getComprehensiveAssetData(symbol);
      if (data) return { success: true as const, data };
    }

    // Bonds: try Yahoo Finance with .BA suffix (BYMA-listed Argentine securities).
    // e.g. TX28 → TX28.BA, TZX26 → TZX26.BA
    if (type === 'Bono') {
      try {
        const { getHistoricalData } = await import('@/lib/market-data');
        const history = await getHistoricalData(`${symbol}.BA`, 120);
        if (history && history.length > 0) {
          const closes = history.map(h => h.close / 100); // .BA prices are in lote scale
          const currentPrice = closes[closes.length - 1];
          const historicalPrices = history.map((h, i) => ({
            date: h.date,
            open: h.open / 100,
            high: h.high / 100,
            low: h.low / 100,
            close: closes[i],
            volume: h.volume,
          }));

          const sma = (arr: number[], n: number) => arr.length >= n ? arr.slice(-n).reduce((s, v) => s + v, 0) / n : null;
          const rsiCalc = (arr: number[], n = 14): number | null => {
            if (arr.length <= n) return null;
            let gains = 0, losses = 0;
            for (let i = arr.length - n; i < arr.length; i++) {
              const d = arr[i] - arr[i - 1];
              if (d > 0) gains += d; else losses -= d;
            }
            const avgLoss = losses / n;
            return avgLoss === 0 ? 100 : 100 - (100 / (1 + gains / n / avgLoss));
          };
          const sma20 = sma(closes, 20);
          const sma50 = sma(closes, 50);
          const rsi14 = rsiCalc(closes);

          return {
            success: true as const,
            data: {
              symbol,
              currentPrice,
              historicalPrices: historicalPrices.slice(-30),
              technicals: { sma20, sma50, rsi14, priceToSMA20Ratio: sma20 ? currentPrice / sma20 : null },
              recentNews: [],
            } satisfies ComprehensiveAssetData,
          };
        }
      } catch {
        // .BA suffix not available for this bond — fall through
      }
    }

    // CEDEARs that Yahoo missed: try IOL historical series.
    // Bonds are excluded — the IOL public API v2 seriehistorica endpoint consistently
    // returns 400 for all government bond types. The mobile app uses a private API.
    if (type !== 'Bono') {
      try {
        const series = await iolClient.getHistoricalSeries(symbol, 120);
        if (series && series.length > 0) {
          const historicalPrices = series.map(e => ({
            date: new Date(e.fecha),
            open: e.apertura,
            high: e.maximo,
            low: e.minimo,
            close: e.ultimoPrecio,
            volume: e.volumen,
          }));
          const closes = historicalPrices.map(h => h.close);
          const currentPrice = closes[closes.length - 1];

          const sma = (arr: number[], n: number) => arr.length >= n ? arr.slice(-n).reduce((s, v) => s + v, 0) / n : null;
          const rsiCalc = (arr: number[], n = 14): number | null => {
            if (arr.length <= n) return null;
            let gains = 0, losses = 0;
            for (let i = arr.length - n; i < arr.length; i++) {
              const d = arr[i] - arr[i - 1];
              if (d > 0) gains += d; else losses -= d;
            }
            const avgLoss = losses / n;
            return avgLoss === 0 ? 100 : 100 - (100 / (1 + gains / n / avgLoss));
          };
          const sma20 = sma(closes, 20);
          const sma50 = sma(closes, 50);
          const rsi14 = rsiCalc(closes);

          const iolData: ComprehensiveAssetData = {
            symbol,
            currentPrice,
            historicalPrices: historicalPrices.slice(-30),
            technicals: { sma20, sma50, rsi14, priceToSMA20Ratio: sma20 ? currentPrice / sma20 : null },
            recentNews: [],
          };
          return { success: true as const, data: iolData };
        }
      } catch {
        // IOL historical also unavailable — fall through to static price
      }
    }

    // Last resort: static IOL price fallback
    if (iolPrice != null && iolPrice > 0) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const fallback: ComprehensiveAssetData = {
        symbol,
        currentPrice: iolPrice,
        historicalPrices: [
          { date: yesterday, open: iolPrice, high: iolPrice, low: iolPrice, close: iolPrice, volume: 0 },
          { date: today,     open: iolPrice, high: iolPrice, low: iolPrice, close: iolPrice, volume: 0 },
        ],
        technicals: { sma20: null, sma50: null, rsi14: null, priceToSMA20Ratio: null },
        recentNews: [],
      };
      return { success: true as const, data: fallback };
    }

    return { success: false as const, error: `Sin datos para ${symbol}` };
  } catch (error) {
    console.error(`Advisor Step AssetData failed for ${symbol}:`, error);
    return { success: false as const, error: `Error analizando ${symbol}` };
  }
}

export async function getAdvisorStep_Recommend(
  cash: number,
  assets: ComprehensiveAssetData[],
  strategy: 'Conservadora' | 'Media' | 'Arriesgada',
) {
  try {
    const recommendation = await advisorAgent.generateRecommendation(cash, assets, strategy);
    return { success: true as const, data: recommendation };
  } catch (error) {
    console.error('Advisor Step Recommend failed:', error);
    return { success: false as const, error: 'Error generando la recomendación' };
  }
}


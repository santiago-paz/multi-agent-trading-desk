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

import { getHistoricalData, getNews, getGeneralMarketNews, NewsItem } from '@/lib/market-data';
import { processNewsItem } from '@/lib/news-processor';

export async function getMarketData() {
  try {
    const symbols = ['AAPL', 'KO', 'TSLA'];
    const promises = symbols.map(async (symbol) => {
      const data = await getHistoricalData(symbol, 7); // Get last 7 days for verification
      return { symbol, data };
    });
    
    const results = await Promise.all(promises);
    return { success: true, data: results };
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
    const cuentaArs = cuenta.cuentas.find(c => c.moneda === 'peso_Argentino');
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
    
    // Combine 
    const combinedTitulos = [...(cedearsPanel.titulos || []), ...(bonosPanel.titulos || [])];

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


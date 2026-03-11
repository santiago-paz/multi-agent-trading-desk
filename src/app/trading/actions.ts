'use server';

import { analystAgent } from '@/lib/agents/analyst';
import { sentinelAgent } from '@/lib/agents/sentinel';
import { strategistAgent } from '@/lib/agents/strategist';
import { tradingEngine } from '@/lib/trading/engine';
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
        const portfolio = await iolClient.getPortfolio();
        const valueUSD = await tradingEngine.calculatePortfolioValue();
        return { success: true, data: { portfolio, valueUSD } };
    } catch (error) {
        console.error('Failed to fetch portfolio summary:', error);
        return { success: false, error: 'Failed to fetch portfolio summary' };
    }
}

export async function getOperations() {
    try {
        const operations = await iolClient.getOperations();
        return { success: true, data: operations };
    } catch (error) {
        console.error('Failed to fetch operations:', error);
        return { success: false, error: 'Failed to fetch operations' };
    }
}


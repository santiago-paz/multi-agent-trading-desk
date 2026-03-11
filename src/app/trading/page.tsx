'use client';

import React, { useState, useEffect } from 'react';
import { PortfolioSummary } from '@/components/ui/PortfolioSummary';
import { AgentLog } from '@/components/ui/AgentLog';
import { RiskGauge } from '@/components/ui/RiskGauge';
import { OrderReview } from '@/components/ui/OrderReview';
import { NewsFeed } from '@/components/ui/NewsFeed';
import { Sparkline } from '@/components/ui/Sparkline';
import { useNewsStore } from '@/lib/store/news-store';
import { runAnalysis, executeOrders, getPortfolioSummary, getMarketData } from './actions';
import { OrderRequest, PortfolioResponse } from '@/lib/iol/types';
import { AnalystOutput, SentinelOutput, StrategistOutput } from '@/lib/agents/types';
import { HistoricalRow } from '@/lib/market-data';

export default function TradingDashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [portfolioValueUSD, setPortfolioValueUSD] = useState<number>(0);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  
  const [marketData, setMarketData] = useState<{ symbol: string; data: HistoricalRow[] }[] | null>(null);
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(true);

  // Use Zustand store for news
  const { generalNews, specificNews, isLoading: isLoadingNews, fetchNews, lastUpdated, progress } = useNewsStore();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    analystResults: AnalystOutput[];
    sentinelResult: SentinelOutput;
    strategyResult: StrategistOutput;
    proposedOrders: OrderRequest[];
  } | null>(null);

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  useEffect(() => {
    fetchPortfolio();
    fetchMarketData();
    // Fetch news on mount (store handles caching logic)
    fetchNews();
  }, []);

  const fetchPortfolio = async () => {
    setIsLoadingPortfolio(true);
    const result = await getPortfolioSummary();
    if (result.success && result.data) {
      setPortfolio(result.data.portfolio);
      setPortfolioValueUSD(result.data.valueUSD);
    }
    setIsLoadingPortfolio(false);
  };

  const fetchMarketData = async () => {
    setIsLoadingMarketData(true);
    const result = await getMarketData();
    if (result.success && result.data) {
      setMarketData(result.data);
    }
    setIsLoadingMarketData(false);
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setExecutionResult(null);
    
    const result = await runAnalysis();
    
    if (result.success && result.data) {
      setAnalysisResult(result.data);
    } else {
      console.error('Analysis failed:', result.error);
    }
    
    setIsAnalyzing(false);
  };

  const handleExecuteOrders = async () => {
    if (!analysisResult?.proposedOrders) return;
    
    setIsExecuting(true);
    const result = await executeOrders(analysisResult.proposedOrders);
    
    if (result.success) {
      setExecutionResult(result.data);
      // Refresh portfolio after execution
      await fetchPortfolio();
      // Clear proposed orders
      setAnalysisResult(prev => prev ? { ...prev, proposedOrders: [] } : null);
    } else {
      console.error('Execution failed:', result.error);
    }
    
    setIsExecuting(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono selection:bg-neon-green selection:text-black">
      <header className="mb-8 border-b-4 border-white pb-4">
        <h1 className="text-4xl font-bold uppercase tracking-tighter">
          CEDEAR<span className="text-neon-green">.AI</span> TRADING SYSTEM
        </h1>
        <p className="text-gray-400 mt-2">Automated Portfolio Management // v1.0.0</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column: Portfolio & Controls */}
        <div className="lg:col-span-1 space-y-8">
          {isLoadingPortfolio ? (
            <div className="animate-pulse h-40 bg-gray-900 border-4 border-gray-800"></div>
          ) : portfolio ? (
            <PortfolioSummary portfolio={portfolio} valueUSD={portfolioValueUSD} />
          ) : (
            <div className="border-4 border-red-500 p-4 text-red-500">Failed to load portfolio.</div>
          )}

          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || isExecuting}
            className={`w-full py-4 text-xl font-bold uppercase tracking-widest border-4 border-white transition-all transform hover:translate-x-1 hover:-translate-y-1
              ${isAnalyzing ? 'bg-gray-800 text-gray-500 cursor-wait' : 'bg-neon-green text-black hover:bg-white'}
            `}
          >
            {isAnalyzing ? 'ANALYZING MARKET DATA...' : 'INITIATE ANALYSIS SEQUENCE'}
          </button>

          {analysisResult && (
            <RiskGauge score={analysisResult.sentinelResult.riskScore} />
          )}
        </div>

        {/* Middle Column: Agent Monologue */}
        <div className="lg:col-span-1">
          {analysisResult ? (
            <AgentLog 
              analystResults={analysisResult.analystResults}
              sentinelResult={analysisResult.sentinelResult}
              strategyResult={analysisResult.strategyResult}
            />
          ) : (
            <div className="border-4 border-gray-800 p-8 h-96 flex items-center justify-center text-gray-600">
              AWAITING AGENT INPUT...
            </div>
          )}
        </div>

        {/* Right Column: Execution */}
        <div className="lg:col-span-1">
          {analysisResult && analysisResult.proposedOrders.length > 0 && (
            <OrderReview 
              orders={analysisResult.proposedOrders}
              onExecute={handleExecuteOrders}
              isLoading={isExecuting}
            />
          )}
          
          {executionResult && (
            <div className="border-4 border-green-500 p-4 bg-green-900/20 text-green-400 mt-4">
              <h3 className="font-bold uppercase mb-2">Execution Successful</h3>
              <p className="text-sm">Orders processed: {executionResult.length}</p>
            </div>
          )}
        </div>
      </div>

      {/* News Feed Section */}
      <div className="mb-8 h-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold uppercase">Market Intelligence Feed</h2>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => fetchNews(true)}
              disabled={isLoadingNews}
              className={`px-4 py-2 text-xs font-bold uppercase border-2 border-white hover:bg-white hover:text-black transition-colors
                ${isLoadingNews ? 'opacity-50 cursor-wait' : ''}
              `}
            >
              {isLoadingNews ? 'REFRESHING...' : 'REFRESH NEWS'}
            </button>
          </div>
        </div>
        
        {isLoadingNews ? (
          <div className="h-full flex flex-col items-center justify-center border-4 border-gray-800 bg-gray-900/50">
            {progress ? (
              <div className="w-64">
                <div className="flex justify-between text-xs text-gray-400 mb-2 uppercase">
                  <span>Processing Intelligence</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-neon-green transition-all duration-300 ease-out"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-center text-xs text-gray-500 mt-4 animate-pulse">
                  Analyzing market sentiment...
                </p>
              </div>
            ) : (
              <div className="animate-pulse text-gray-500">Initializing...</div>
            )}
          </div>
        ) : (
          <NewsFeed generalNews={generalNews} specificNews={specificNews} />
        )}
      </div>
      
      <div className="mt-8 border-t-4 border-white pt-8">
        <h2 className="text-2xl font-bold uppercase mb-4">Market Data Verification</h2>
        {isLoadingMarketData ? (
          <div className="animate-pulse h-20 bg-gray-900 border-4 border-gray-800"></div>
        ) : marketData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {marketData.map((item) => (
              <div key={item.symbol} className="border-2 border-gray-700 p-4">
                <h3 className="font-bold text-neon-green mb-2">{item.symbol}</h3>
                <div className="text-xs overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="py-1">Date</th>
                        <th className="py-1 text-right">Close</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.data.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-gray-900">
                          <td className="py-1">{new Date(row.date).toLocaleDateString()}</td>
                          <td className="py-1 text-right">${row.close.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-gray-500 mt-2 italic">Showing last 5 days</p>
                </div>
                
                <div className="mt-4 border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">7-Day Trend</p>
                  <Sparkline 
                    data={item.data.map(d => d.close)} 
                    height={100} 
                    color={item.data[item.data.length - 1].close >= item.data[0].close ? '#ccff00' : '#ef4444'} 
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-red-500">Failed to load market data.</div>
        )}
      </div>
      
      <style jsx global>{`
        .bg-neon-green { background-color: #ccff00; }
        .text-neon-green { color: #ccff00; }
        .selection\:bg-neon-green::selection { background-color: #ccff00; color: black; }
      `}</style>
    </div>
  );
}

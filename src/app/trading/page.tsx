'use client';

import React, { useState, useEffect } from 'react';
import { PortfolioSummary } from '@/components/ui/PortfolioSummary';
import { AgentLog } from '@/components/ui/AgentLog';
import { RiskGauge } from '@/components/ui/RiskGauge';
import { OrderReview } from '@/components/ui/OrderReview';
import { runAnalysis, executeOrders, getPortfolioSummary } from './actions';
import { OrderRequest, PortfolioResponse } from '@/lib/iol/types';
import { AnalystOutput, SentinelOutput, StrategistOutput } from '@/lib/agents/types';

export default function TradingDashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [portfolioValueUSD, setPortfolioValueUSD] = useState<number>(0);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
      
      <style jsx global>{`
        .bg-neon-green { background-color: #ccff00; }
        .text-neon-green { color: #ccff00; }
        .selection\:bg-neon-green::selection { background-color: #ccff00; color: black; }
      `}</style>
    </div>
  );
}

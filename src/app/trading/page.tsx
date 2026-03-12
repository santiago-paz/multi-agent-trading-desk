'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PortfolioSummary } from '@/components/ui/PortfolioSummary';
import { PortfolioWindow } from '@/components/ui/PortfolioWindow';
import { AgentLog } from '@/components/ui/AgentLog';
import { RiskGauge } from '@/components/ui/RiskGauge';
import { OrderReview } from '@/components/ui/OrderReview';
import { NewsFeed } from '@/components/ui/NewsFeed';
import { OperationsFeed } from '@/components/ui/OperationsFeed';
import { AccountData } from '@/components/ui/AccountData';
import { Sparkline } from '@/components/ui/Sparkline';
import { DesktopIcon } from '@/components/ui/DesktopIcon';
import {
  DraggableResizableWindow,
  WindowState,
} from '@/components/ui/DraggableResizableWindow';
import { useNewsStore } from '@/lib/store/news-store';
import { runAnalysis, executeOrders, getPortfolioSummary, getMarketData, getOperations, getProfileData, getAccountStatement } from './actions';
import { OrderRequest, PortfolioResponse, Operation, DatosPerfil, EstadoCuenta } from '@/lib/iol/types';
import { AnalystOutput, SentinelOutput, StrategistOutput } from '@/lib/agents/types';
import { HistoricalRow } from '@/lib/market-data';
import { DESKTOP_APP_ICONS } from '@/lib/win98se-icons';
import { useWindowManager, AppId, APP_LABELS } from '@/hooks/useWindowManager';

const ICON_IDS = [
  'portfolio',
  'analysis',
  'agent',
  'orders',
  'news',
  'marketdata',
  'movements',
] as const;
type IconId = (typeof ICON_IDS)[number];

const DEFAULT_ICON_POSITIONS: Record<IconId, { x: number; y: number }> = {
  portfolio: { x: 8, y: 8 },
  analysis: { x: 8, y: 72 },
  agent: { x: 8, y: 136 },
  orders: { x: 8, y: 200 },
  news: { x: 8, y: 264 },
  marketdata: { x: 8, y: 328 },
  movements: { x: 8, y: 392 },
};

export default function TradingDashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [portfolioValueUSD, setPortfolioValueUSD] = useState<number>(0);
  const [cclRate, setCclRate] = useState<number>(1200);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);

  const [marketData, setMarketData] = useState<{
    symbol: string;
    data: HistoricalRow[];
  }[] | null>(null);
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(true);

  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoadingOperations, setIsLoadingOperations] = useState(false);

  const [perfil, setPerfil] = useState<DatosPerfil | null>(null);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(false);

  const {
    generalNews,
    specificNews,
    isLoading: isLoadingNews,
    fetchNews,
    lastUpdated,
    progress,
  } = useNewsStore();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    analystResults: AnalystOutput[];
    sentinelResult: SentinelOutput;
    strategyResult: StrategistOutput;
    proposedOrders: OrderRequest[];
  } | null>(null);

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<unknown[] | null>(null);

  const { 
    windows, 
    focusedId, 
    allOpenWindows, 
    openOrFocusWindow, 
    updateWindow, 
    closeWindow, 
    minimizeWindow, 
    focusWindow,
    toggleMinimize
  } = useWindowManager();

  const [iconPositions, setIconPositions] = useState<Record<IconId, { x: number; y: number }>>(DEFAULT_ICON_POSITIONS);

  useEffect(() => {
    const savedPositions = localStorage.getItem('desktop-icon-positions');
    if (savedPositions) {
      try {
        const parsed = JSON.parse(savedPositions);
        if (typeof parsed === 'object' && parsed !== null) {
          setIconPositions((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.error('Failed to parse saved icon positions', e);
      }
    }
  }, []);

  // Use a separate effect for saving to localStorage
  useEffect(() => {
    if (JSON.stringify(iconPositions) !== JSON.stringify(DEFAULT_ICON_POSITIONS)) {
      localStorage.setItem('desktop-icon-positions', JSON.stringify(iconPositions));
    }
  }, [iconPositions]);

  const handleIconMove = useCallback((id: string, x: number, y: number) => {
    // Cast id to IconId to satisfy TS if needed, but since it comes from our map it's safe
    setIconPositions((prev) => ({ ...prev, [id]: { x, y } }));
  }, []);

  const fetchOperationsData = async () => {
    setIsLoadingOperations(true);
    const result = await getOperations();
    if (result.success && result.data) {
      setOperations(result.data as Operation[]);
    }
    setIsLoadingOperations(false);
  };

  const fetchAccountData = async () => {
    setIsLoadingAccount(true);
    const [perfilResult, estadoResult] = await Promise.all([
      getProfileData(),
      getAccountStatement(),
    ]);

    if (perfilResult.success && perfilResult.data) {
      setPerfil(perfilResult.data as DatosPerfil);
    }
    if (estadoResult.success && estadoResult.data) {
      setEstadoCuenta(estadoResult.data as EstadoCuenta);
    }
    setIsLoadingAccount(false);
  };

  const fetchPortfolio = async () => {
    setIsLoadingPortfolio(true);
    const result = await getPortfolioSummary();
    if (result.success && result.data) {
      setPortfolio(result.data.portfolio);
      setPortfolioValueUSD(result.data.valueUSD);
      setCclRate(result.data.cclRate);
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

  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    fetchPortfolio();
    fetchMarketData();
    fetchOperationsData();
    fetchAccountData();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

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
      setExecutionResult(result.data ?? null);
      await fetchPortfolio();
      setAnalysisResult((prev) => (prev ? { ...prev, proposedOrders: [] } : null));
    } else {
      console.error('Execution failed:', result.error);
    }
    setIsExecuting(false);
  };



  return (
    <div className="desktop relative w-full h-full overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0">
        <DesktopIcon
          id="portfolio"
          label="Portfolio"
          iconSrc={DESKTOP_APP_ICONS.portfolio}
          icon="📊"
          onClick={() => openOrFocusWindow('portfolio')}
          x={iconPositions.portfolio.x}
          y={iconPositions.portfolio.y}
          onMove={handleIconMove}
        />
        <DesktopIcon
          id="analysis"
          label="Analysis"
          iconSrc={DESKTOP_APP_ICONS.analysis}
          icon="⚙️"
          onClick={() => openOrFocusWindow('analysis')}
          x={iconPositions.analysis.x}
          y={iconPositions.analysis.y}
          onMove={handleIconMove}
        />
        <DesktopIcon
          id="agent"
          label="Agent Log"
          iconSrc={DESKTOP_APP_ICONS.agent}
          icon="📋"
          onClick={() => openOrFocusWindow('agent')}
          x={iconPositions.agent.x}
          y={iconPositions.agent.y}
          onMove={handleIconMove}
        />
        <DesktopIcon
          id="orders"
          label="Orders"
          iconSrc={DESKTOP_APP_ICONS.orders}
          icon="📝"
          onClick={() => openOrFocusWindow('orders')}
          x={iconPositions.orders.x}
          y={iconPositions.orders.y}
          onMove={handleIconMove}
        />
        <DesktopIcon
          id="news"
          label="News"
          iconSrc={DESKTOP_APP_ICONS.news}
          icon="📰"
          onClick={() => openOrFocusWindow('news')}
          x={iconPositions.news.x}
          y={iconPositions.news.y}
          onMove={handleIconMove}
        />
        <DesktopIcon
          id="marketdata"
          label="Market Data"
          iconSrc={DESKTOP_APP_ICONS.marketdata}
          icon="📈"
          onClick={() => openOrFocusWindow('marketdata')}
          x={iconPositions.marketdata.x}
          y={iconPositions.marketdata.y}
          onMove={handleIconMove}
        />
        <DesktopIcon
          id="movements"
          label="Movimientos"
          iconSrc={DESKTOP_APP_ICONS.orders}
          icon="💸"
          onClick={() => openOrFocusWindow('movements')}
          x={iconPositions.movements.x}
          y={iconPositions.movements.y}
          onMove={handleIconMove}
        />
      </div>

      {Object.entries(windows).map(([id, state]) => {
        if (state.minimized) return null;
        const appId = id as AppId;
        return (
          <DraggableResizableWindow
            key={id}
            state={state}
            title={APP_LABELS[appId]}
            onMove={(x, y) => updateWindow(id, { x, y })}
            onResize={(width, height) => updateWindow(id, { width, height })}
            onMinimize={() => minimizeWindow(id)}
            onClose={() => closeWindow(id)}
            onFocus={() => focusWindow(id)}
          >
            {appId === 'portfolio' && (
              <PortfolioWindow
                portfolio={portfolio}
                portfolioValueUSD={portfolioValueUSD}
                cclRate={cclRate}
                isLoadingPortfolio={isLoadingPortfolio}
                onRefreshPortfolio={fetchPortfolio}
                perfil={perfil}
                estadoCuenta={estadoCuenta}
                isLoadingAccount={isLoadingAccount}
                onRefreshAccount={fetchAccountData}
              />
            )}
            {appId === 'analysis' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing || isExecuting}
                  className="w-full default"
                >
                  {isAnalyzing
                    ? 'Analyzing Market Data...'
                    : 'Initiate Analysis Sequence'}
                </button>
                {analysisResult && (
                  <RiskGauge
                    score={analysisResult.sentinelResult.riskScore}
                  />
                )}
              </div>
            )}
            {appId === 'agent' && (
              <>
                {analysisResult ? (
                  <AgentLog
                    analystResults={analysisResult.analystResults}
                    sentinelResult={analysisResult.sentinelResult}
                    strategyResult={analysisResult.strategyResult}
                  />
                ) : (
                  <p className="m-0 opacity-75">Run Analysis first.</p>
                )}
              </>
            )}
            {appId === 'orders' && (
              <div className="space-y-3">
                {analysisResult && analysisResult.proposedOrders.length > 0 && (
                  <OrderReview
                    orders={analysisResult.proposedOrders}
                    onExecute={handleExecuteOrders}
                    isLoading={isExecuting}
                  />
                )}
                {executionResult && (
                  <div className="window-body p-2 border border-gray-400">
                    <p className="font-bold m-0 mb-1">Execution Successful</p>
                    <p className="m-0 text-sm">
                      Orders processed: {executionResult?.length ?? 0}
                    </p>
                  </div>
                )}
                {(!analysisResult?.proposedOrders?.length && !executionResult) && (
                  <p className="m-0 opacity-75">No orders. Run analysis first.</p>
                )}
              </div>
            )}
            {appId === 'news' && (
              <NewsFeed
                generalNews={generalNews}
                specificNews={specificNews}
                lastUpdated={lastUpdated}
                onRefresh={() => fetchNews(true)}
                isLoading={isLoadingNews}
                progress={progress}
              />
            )}
            {appId === 'marketdata' && (
              <>
                {isLoadingMarketData ? (
                  <p className="m-0">Loading...</p>
                ) : marketData ? (
                  <div className="space-y-3 overflow-auto">
                    {marketData.map((item) => (
                      <div
                        key={item.symbol}
                        className="sunken-panel p-2"
                      >
                        <p className="font-bold m-0 mb-2">{item.symbol}</p>
                        <div className="overflow-x-auto mb-2">
                          <table>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th style={{ textAlign: 'right' }}>Close</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.data.slice(0, 5).map((row, i) => (
                                <tr key={i}>
                                  <td>
                                    {new Date(row.date).toLocaleDateString()}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    ${row.close.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs italic m-0 mb-2">
                          Showing last 5 days
                        </p>
                        <div className="mt-2 pt-2 border-t border-gray-300">
                          <p className="text-xs m-0 mb-1">7-Day Trend</p>
                          <Sparkline
                            data={item.data.map((d) => d.close)}
                            height={60}
                            color={
                              item.data[item.data.length - 1].close >=
                              item.data[0].close
                                ? '#008000'
                                : '#800000'
                            }
                            strokeWidth={1}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="m-0 text-red-600">Failed to load market data.</p>
                )}
              </>
            )}
            {appId === 'movements' && (
              <OperationsFeed
                operations={operations}
                cclRate={cclRate}
                isLoading={isLoadingOperations}
                onRefresh={fetchOperationsData}
              />
            )}
          </DraggableResizableWindow>
        );
      })}

      <div className="taskbar">
        <button
          type="button"
          className="taskbar-button"
          style={{ cursor: 'default' }}
        >
          Start
        </button>
        {allOpenWindows.map(([id]) => (
          <button
            key={id}
            type="button"
            className={`taskbar-button ${focusedId === id ? 'active' : ''}`}
            onClick={() => toggleMinimize(id)}
          >
            {APP_LABELS[id as AppId]}
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PortfolioWindow } from '@/components/ui/PortfolioWindow';
import { AdvisorWindow } from '@/components/ui/AdvisorWindow';
import { NewsFeed } from '@/components/ui/NewsFeed';
import { MarketDataWindow } from '@/components/ui/MarketDataWindow';
import { OperationsFeed } from '@/components/ui/OperationsFeed';
import { DesktopIcon } from '@/components/ui/DesktopIcon';
import {
  DraggableResizableWindow,
  WindowState,
} from '@/components/ui/DraggableResizableWindow';
import { useNewsStore } from '@/lib/store/news-store';
import { getPortfolioSummary, getMarketData, getOperations, getProfileData, getAccountStatement } from './actions';
import { PortfolioResponse, Operation, DatosPerfil, EstadoCuenta } from '@/lib/iol/types';
import { HistoricalRow } from '@/lib/market-data';
import { DESKTOP_APP_ICONS } from '@/lib/win98se-icons';
import { useWindowManager, AppId, APP_LABELS } from '@/hooks/useWindowManager';

const ICON_IDS = [
  'portfolio',
  'news',
  'marketdata',
  'movements',
  'advisor',
] as const;
type IconId = (typeof ICON_IDS)[number];

const DEFAULT_ICON_POSITIONS: Record<IconId, { x: number; y: number }> = {
  portfolio: { x: 8, y: 8 },
  news: { x: 8, y: 72 },
  marketdata: { x: 8, y: 136 },
  movements: { x: 8, y: 200 },
  advisor: { x: 8, y: 264 },
};

const DESKTOP_ICON_CONFIG: { id: IconId; label: string; emoji: string; iconKey: keyof typeof DESKTOP_APP_ICONS }[] = [
  { id: 'portfolio',  label: 'Portfolio',    emoji: '📊', iconKey: 'portfolio'  },
  { id: 'news',       label: 'News',         emoji: '📰', iconKey: 'news'       },
  { id: 'marketdata', label: 'Market Data',  emoji: '📈', iconKey: 'marketdata' },
  { id: 'movements',  label: 'Movimientos',  emoji: '💸', iconKey: 'orders'     },
  { id: 'advisor',    label: 'Asesor IA',    emoji: '🧠', iconKey: 'advisor'    },
];

import { useMepStore } from '@/lib/store/mep-store';

export default function TradingDashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);

  const [marketData, setMarketData] = useState<{
    marketData: { symbol: string; data: HistoricalRow[] }[];
    ownedSymbols: string[];
  } | null>(null);
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

  const { fetchMepRate } = useMepStore();

  const fetchPortfolio = async () => {
    setIsLoadingPortfolio(true);
    const result = await getPortfolioSummary();
    if (result.success && result.data) {
      setPortfolio(result.data.portfolio);
    }
    setIsLoadingPortfolio(false);
  };

  const fetchMarketData = async () => {
    setIsLoadingMarketData(true);
    const result = await getMarketData();
    if (result.success && result.data) {
      setMarketData(result.data as { marketData: { symbol: string; data: HistoricalRow[] }[]; ownedSymbols: string[] });
    }
    setIsLoadingMarketData(false);
  };

  useEffect(() => {
    fetchNews();
    
    // Initial MEP fetch
    fetchMepRate();
    // 10 minute polling
    const interval = setInterval(() => {
      fetchMepRate();
    }, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchPortfolio();
    fetchMarketData();
    fetchOperationsData();
    fetchAccountData();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  return (
    <div className="desktop relative w-full h-full overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0">
        {DESKTOP_ICON_CONFIG.map(({ id, label, emoji, iconKey }) => (
          <DesktopIcon
            key={id}
            id={id}
            label={label}
            iconSrc={DESKTOP_APP_ICONS[iconKey]}
            icon={emoji}
            onClick={() => openOrFocusWindow(id)}
            x={iconPositions[id].x}
            y={iconPositions[id].y}
            onMove={handleIconMove}
          />
        ))}
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
                isLoadingPortfolio={isLoadingPortfolio}
                onRefreshPortfolio={fetchPortfolio}
                perfil={perfil}
                estadoCuenta={estadoCuenta}
                isLoadingAccount={isLoadingAccount}
                onRefreshAccount={fetchAccountData}
              />
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
              <MarketDataWindow
                marketData={marketData?.marketData ?? null}
                ownedSymbols={marketData?.ownedSymbols ?? []}
                isLoading={isLoadingMarketData}
                onRefresh={fetchMarketData}
              />
            )}
            {appId === 'movements' && (
              <OperationsFeed
                operations={operations}
                isLoading={isLoadingOperations}
                onRefresh={fetchOperationsData}
              />
            )}
            {appId === 'advisor' && (
              <AdvisorWindow />
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

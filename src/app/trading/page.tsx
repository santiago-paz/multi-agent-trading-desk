'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PortfolioWindow } from '@/components/ui/PortfolioWindow';
import { NewsFeed } from '@/components/ui/NewsFeed';
import { MarketDataWindow } from '@/components/ui/MarketDataWindow';
import { OperationsFeed } from '@/components/ui/OperationsFeed';

import { BacktestingWindow } from '@/components/ui/BacktestingWindow';
import { QuickTradeWindow, TradableCedear } from '@/components/ui/QuickTradeWindow';
import { AutoTraderWindow } from '@/components/ui/AutoTraderWindow';
import { CompanyDetailWindow, CompanyDetailData } from '@/components/ui/CompanyDetailWindow';
import { DisplayPropertiesWindow } from '@/components/ui/DisplayPropertiesWindow';
import { useDisplayStore } from '@/lib/store/display-store';
import { DesktopIcon } from '@/components/ui/DesktopIcon';
import {
  DraggableResizableWindow,
} from '@/components/ui/DraggableResizableWindow';
import { useNewsStore } from '@/lib/store/news-store';
import { getPortfolioSummary, getMarketData, getOperations, getCedearsForTrading, placeBuyOrder, getCompanyDetail } from './actions';
import { PortfolioResponse, Operation, DatosPerfil, EstadoCuenta } from '@/lib/iol/types';
import type { HistoricalRow } from '@/lib/fmp/types';
import { DESKTOP_APP_ICONS } from '@/lib/win98se-icons';
import { useWindowManager, AppId, APP_LABELS, COMPANY_DETAIL_DEFAULTS } from '@/hooks/useWindowManager';

interface CompanyDetailInstance {
  symbol: string;
  data: CompanyDetailData | null;
  isLoading: boolean;
  error: string | null;
}

const COMPANY_DETAIL_PREFIX = 'companydetail-';

const ICON_IDS = [
  'portfolio',
  'news',
  'marketdata',
  'movements',

  'backtesting',
  'quicktrade',
  'autotrader',
  'displayproperties',
] as const;
type IconId = (typeof ICON_IDS)[number];

const DEFAULT_ICON_POSITIONS: Record<IconId, { x: number; y: number }> = {
  portfolio: { x: 8, y: 8 },
  news: { x: 8, y: 72 },
  marketdata: { x: 8, y: 136 },
  movements: { x: 8, y: 200 },

  backtesting: { x: 8, y: 264 },
  quicktrade: { x: 8, y: 328 },
  autotrader: { x: 8, y: 392 },
  displayproperties: { x: 8, y: 456 },
};

const DESKTOP_ICON_CONFIG: { id: IconId; label: string; emoji: string; iconKey: keyof typeof DESKTOP_APP_ICONS }[] = [
  { id: 'portfolio',  label: 'Portfolio',    emoji: '📊', iconKey: 'portfolio'  },
  { id: 'news',       label: 'News',         emoji: '📰', iconKey: 'news'       },
  { id: 'marketdata', label: 'Market Data',  emoji: '📈', iconKey: 'marketdata' },
  { id: 'movements',  label: 'Movimientos',  emoji: '💸', iconKey: 'movements'  },

  { id: 'backtesting', label: 'Backtesting', emoji: '📉', iconKey: 'backtesting' },
  { id: 'quicktrade', label: 'Comprar CEDEARs', emoji: '💰', iconKey: 'quicktrade' },
  { id: 'autotrader', label: 'Auto Trader', emoji: '🤖', iconKey: 'autotrader' },
  { id: 'displayproperties', label: 'Display', emoji: '🖥', iconKey: 'displayproperties' },
];

// Grid cell size for "Alinear Iconos" — slightly larger than icon width (64px) for breathing room
const GRID_SIZE = 75;
const ICON_WIDTH = 64;
const ICON_HEIGHT = 64;

import { useMepStore } from '@/lib/store/mep-store';

export default function TradingDashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [usdPrices, setUsdPrices] = useState<Record<string, { price: number; pct: number }>>({});
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);

  const [marketData, setMarketData] = useState<{
    marketData: { symbol: string; data: HistoricalRow[] }[];
    ownedSymbols: string[];
    companyNames: Record<string, string>;
  } | null>(null);
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);

  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoadingOperations, setIsLoadingOperations] = useState(false);

  const [quickTradeData, setQuickTradeData] = useState<{
    cedears: TradableCedear[];
    cash: number;
    comprometido: number;
    effectiveCash: number;
    commissionRate: number;
  } | null>(null);
  const [isLoadingQuickTrade, setIsLoadingQuickTrade] = useState(false);

  const [companyDetailInstances, setCompanyDetailInstances] = useState<Record<string, CompanyDetailInstance>>({});
  /** Counter for staggering new window positions */
  const companyDetailCountRef = useRef(0);

  const [perfil, setPerfil] = useState<DatosPerfil | null>(null);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null);

  const generalNews = useNewsStore((s) => s.generalNews);
  const specificNews = useNewsStore((s) => s.specificNews);
  const isLoadingNews = useNewsStore((s) => s.isLoading);
  const fetchNews = useNewsStore((s) => s.fetchNews);
  const lastUpdated = useNewsStore((s) => s.lastUpdated);

  const displayWallpaper = useDisplayStore((s) => s.wallpaper);
  const displayBgColor = useDisplayStore((s) => s.backgroundColor);
  const displayMode = useDisplayStore((s) => s.displayMode);

  const {
    windows,
    focusedId,
    allOpenWindows,
    openOrFocusWindow,
    openDynamicWindow,
    updateWindow,
    closeWindow: rawCloseWindow,
    minimizeWindow,
    focusWindow,
    toggleMinimize
  } = useWindowManager();

  const closeWindow = useCallback((id: string) => {
    rawCloseWindow(id);
    if (id.startsWith(COMPANY_DETAIL_PREFIX)) {
      setCompanyDetailInstances((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [rawCloseWindow]);

  const [iconPositions, setIconPositions] = useState<Record<IconId, { x: number; y: number }>>(DEFAULT_ICON_POSITIONS);
  const [selectedIconIds, setSelectedIconIds] = useState<Set<string>>(new Set());
  const [rubberBandRect, setRubberBandRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Mutable refs to avoid stale closures in event handlers
  const desktopRef = useRef<HTMLDivElement>(null);
  const rubberBandStartRef = useRef<{ x: number; y: number } | null>(null);
  const iconPositionsRef = useRef(iconPositions);
  const multiDragBaseRef = useRef<Record<string, { x: number; y: number }> | null>(null);
  // Keep ref in sync with state
  useEffect(() => { iconPositionsRef.current = iconPositions; });

  useEffect(() => {
    const savedPositions = localStorage.getItem('desktop-icon-positions');
    if (savedPositions) {
      try {
        const parsed = JSON.parse(savedPositions);
        if (typeof parsed === 'object' && parsed !== null) {
          setIconPositions((prev) => ({ ...prev, ...parsed })); // eslint-disable-line react-hooks/set-state-in-effect
        }
      } catch (e) {
        console.error('Failed to parse saved icon positions', e);
      }
    }
  }, []);

  useEffect(() => {
    if (JSON.stringify(iconPositions) !== JSON.stringify(DEFAULT_ICON_POSITIONS)) {
      localStorage.setItem('desktop-icon-positions', JSON.stringify(iconPositions));
    }
  }, [iconPositions]);

  // ── Rubber-band selection: global mousemove/mouseup (runs once) ──────────────
  const liveSelectionRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!rubberBandStartRef.current || !desktopRef.current) return;
      const rect = desktopRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const { x: startX, y: startY } = rubberBandStartRef.current;
      setRubberBandRect({
        left: Math.min(startX, currentX),
        top: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
      });
    };

    const handleMouseUp = () => {
      if (rubberBandStartRef.current) {
        // Persist whatever the live selection computed during render
        setSelectedIconIds(liveSelectionRef.current);
      }
      rubberBandStartRef.current = null;
      setRubberBandRect(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ── Derive live selection from rubberBandRect during render (no stale closures) ──
  const effectiveSelectedIds = useMemo(() => {
    if (!rubberBandRect || (rubberBandRect.width <= 5 && rubberBandRect.height <= 5)) {
      return selectedIconIds;
    }
    const selLeft   = rubberBandRect.left;
    const selTop    = rubberBandRect.top;
    const selRight  = rubberBandRect.left + rubberBandRect.width;
    const selBottom = rubberBandRect.top + rubberBandRect.height;
    const live = new Set<string>();
    ICON_IDS.forEach((id) => {
      const pos = iconPositions[id];
      if (
        pos.x < selRight &&
        pos.x + ICON_WIDTH > selLeft &&
        pos.y < selBottom &&
        pos.y + ICON_HEIGHT > selTop
      ) {
        live.add(id);
      }
    });
    return live;
  }, [rubberBandRect, iconPositions, selectedIconIds]);

  useEffect(() => { liveSelectionRef.current = effectiveSelectedIds; });

  // ── ESC clears selection / context menu ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIconIds(new Set());
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Close context menu on any global mousedown ───────────────────────────────
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [contextMenu]);

  const handleDesktopMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    rubberBandStartRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    liveSelectionRef.current = new Set();
    setSelectedIconIds(new Set());
    setContextMenu(null);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // ── Multi-icon drag: called when an icon starts dragging ─────────────────────
  const effectiveSelectedRef = useRef(effectiveSelectedIds);
  useEffect(() => { effectiveSelectedRef.current = effectiveSelectedIds; });

  const handleIconDragStart = useCallback((id: string) => {
    const selected = effectiveSelectedRef.current;
    if (selected.has(id) && selected.size > 1) {
      multiDragBaseRef.current = {};
      selected.forEach((sid) => {
        multiDragBaseRef.current![sid] = { ...iconPositionsRef.current[sid as IconId] };
      });
    } else {
      multiDragBaseRef.current = null;
    }
  }, []);

  const handleIconMove = useCallback((id: string, x: number, y: number) => {
    if (multiDragBaseRef.current?.[id]) {
      const base = multiDragBaseRef.current[id];
      const dx = x - base.x;
      const dy = y - base.y;
      setIconPositions((prev) => {
        const next = { ...prev };
        Object.entries(multiDragBaseRef.current!).forEach(([sid, sBase]) => {
          next[sid as IconId] = { x: sBase.x + dx, y: sBase.y + dy };
        });
        return next;
      });
    } else {
      setIconPositions((prev) => ({ ...prev, [id]: { x, y } }));
    }
  }, []);

  // ── Align icons to nearest grid cell (no overlaps) ───────────────────────────
  const alignIcons = useCallback(() => {
    const snapToGrid = (v: number) => Math.max(0, Math.round(v / GRID_SIZE) * GRID_SIZE);

    const items = ICON_IDS.map((id) => {
      const pos = iconPositionsRef.current[id];
      const px = snapToGrid(pos.x);
      const py = snapToGrid(pos.y);
      return { id, preferred: { x: px, y: py }, dist: Math.hypot(pos.x - px, pos.y - py) };
    }).sort((a, b) => a.dist - b.dist); // closest-to-snap snaps first → gets ideal cell

    const occupied = new Set<string>();

    const findFreeCell = (preferred: { x: number; y: number }) => {
      // BFS from preferred cell
      type Cell = { x: number; y: number };
      const queue: Cell[] = [preferred];
      const seen = new Set<string>();
      while (queue.length > 0) {
        const cell = queue.shift()!;
        const key = `${cell.x},${cell.y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!occupied.has(key)) return cell;
        ([
          { x: cell.x + GRID_SIZE, y: cell.y },
          { x: cell.x,             y: cell.y + GRID_SIZE },
          { x: cell.x - GRID_SIZE, y: cell.y },
          { x: cell.x,             y: cell.y - GRID_SIZE },
        ] as Cell[]).forEach((n) => {
          if (n.x >= 0 && n.y >= 0) queue.push(n);
        });
      }
      return preferred;
    };

    const result: Partial<Record<IconId, { x: number; y: number }>> = {};
    items.forEach(({ id, preferred }) => {
      const cell = findFreeCell(preferred);
      occupied.add(`${cell.x},${cell.y}`);
      result[id] = cell;
    });

    setIconPositions((prev) => ({ ...prev, ...result }));
    setContextMenu(null);
  }, []);

  const fetchOperationsData = useCallback(async () => {
    setIsLoadingOperations(true);
    const result = await getOperations();
    if (result.success && result.data) {
      setOperations(result.data as Operation[]);
    }
    setIsLoadingOperations(false);
  }, []);

  const fetchQuickTradeData = useCallback(async () => {
    setIsLoadingQuickTrade(true);
    const result = await getCedearsForTrading();
    if (result.success && result.data) {
      setQuickTradeData(result.data);
    }
    setIsLoadingQuickTrade(false);
  }, []);

  const navigateCompanyDetail = useCallback(async (currentWindowId: string, newSymbol: string) => {
    // 1. Fetch new data
    setCompanyDetailInstances((prev) => ({
      ...prev,
      [currentWindowId]: { ...prev[currentWindowId], isLoading: true, error: null },
    }));

    const result = await getCompanyDetail(newSymbol);

    // 2. Update instance with new symbol and data
    setCompanyDetailInstances((prev) => {
      if (!prev[currentWindowId]) return prev; // window closed
      if (result.success) {
        return {
          ...prev,
          [currentWindowId]: {
            symbol: newSymbol,
            data: result.data,
            isLoading: false,
            error: null,
          }
        };
      }
      return {
        ...prev,
        [currentWindowId]: {
          symbol: newSymbol,
          data: null,
          isLoading: false,
          error: result.error,
        }
      };
    });
  }, []);

  const openCompanyDetail = useCallback(async (symbol: string) => {
    const windowId = `${COMPANY_DETAIL_PREFIX}${symbol}`;

    // If already open, just focus it
    if (companyDetailInstances[windowId]) {
      openDynamicWindow(windowId, COMPANY_DETAIL_DEFAULTS);
      return;
    }

    // Stagger position so overlapping windows are offset
    const offset = (companyDetailCountRef.current % 6) * 28;
    companyDetailCountRef.current++;
    openDynamicWindow(windowId, {
      ...COMPANY_DETAIL_DEFAULTS,
      x: COMPANY_DETAIL_DEFAULTS.x + offset,
      y: COMPANY_DETAIL_DEFAULTS.y + offset,
    });

    setCompanyDetailInstances((prev) => ({
      ...prev,
      [windowId]: { symbol, data: null, isLoading: true, error: null },
    }));

    const result = await getCompanyDetail(symbol);
    setCompanyDetailInstances((prev) => {
      if (!prev[windowId]) return prev; // window was closed while loading
      if (result.success) {
        return { ...prev, [windowId]: { ...prev[windowId], data: result.data, isLoading: false } };
      }
      return { ...prev, [windowId]: { ...prev[windowId], error: result.error, isLoading: false } };
    });
  }, [openDynamicWindow, companyDetailInstances]);

  const marketDataFetched = useRef(false);
  const operationsFetched = useRef(false);
  const quickTradeFetched = useRef(false);

  const fetchMepRate = useMepStore((s) => s.fetchMepRate);

  const fetchPortfolio = useCallback(async () => {
    setIsLoadingPortfolio(true);
    const result = await getPortfolioSummary();
    if (result.success && result.data) {
      setPortfolio(result.data.portfolio);
      setUsdPrices(result.data.usdPrices ?? {});
      if (result.data.estadoCuenta) setEstadoCuenta(result.data.estadoCuenta as EstadoCuenta);
      if (result.data.perfil) setPerfil(result.data.perfil as DatosPerfil);
    }
    setIsLoadingPortfolio(false);
  }, []);

  const fetchMarketData = useCallback(async () => {
    setIsLoadingMarketData(true);
    const result = await getMarketData();
    if (result.success && result.data) {
      setMarketData(result.data as { marketData: { symbol: string; data: HistoricalRow[] }[]; ownedSymbols: string[]; companyNames: Record<string, string> });
    }
    setIsLoadingMarketData(false);
  }, []);

  useEffect(() => {
    fetchNews();

    fetchMepRate();
    const interval = setInterval(() => {
      fetchMepRate();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchNews, fetchMepRate]);

  useEffect(() => {
    fetchPortfolio(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchPortfolio]);

  // Lazy-load market data, operations, and quick trade only when their windows first open
  const marketDataOpen = !!windows['marketdata'] && !windows['marketdata'].minimized;
  const movementsOpen = !!windows['movements'] && !windows['movements'].minimized;
  const quickTradeOpen = !!windows['quicktrade'] && !windows['quicktrade'].minimized;

  useEffect(() => {
    if (marketDataOpen && !marketDataFetched.current) {
      marketDataFetched.current = true;
      fetchMarketData(); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [marketDataOpen, fetchMarketData]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (movementsOpen) {
      if (!operationsFetched.current) {
        operationsFetched.current = true;
        fetchOperationsData(); // eslint-disable-line react-hooks/set-state-in-effect
      }

      intervalId = setInterval(() => {
        fetchOperationsData();
      }, 30 * 1000); // Actualiza cada 30 segundos
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [movementsOpen, fetchOperationsData]);

  useEffect(() => {
    if (quickTradeOpen && !quickTradeFetched.current) {
      quickTradeFetched.current = true;
      fetchQuickTradeData(); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [quickTradeOpen, fetchQuickTradeData]);

  return (
    <div ref={desktopRef} className="desktop relative w-full h-full overflow-hidden" style={{
      backgroundColor: displayBgColor,
      backgroundImage: displayWallpaper ? `url(${displayWallpaper})` : 'none',
      backgroundSize: displayMode === 'stretch' ? 'cover' : displayMode === 'tile' ? 'auto' : 'auto',
      backgroundRepeat: displayMode === 'tile' ? 'repeat' : 'no-repeat',
      backgroundPosition: 'center',
    }}>
      {/* Desktop background — catches rubber-band and context-menu events (z-0, behind icons) */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 0 }}
        onMouseDown={handleDesktopMouseDown}
        onContextMenu={handleContextMenu}
      />

      {/* Rubber-band selection rectangle — Win98 dotted outline, no fill */}
      {rubberBandRect && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: rubberBandRect.left,
            top: rubberBandRect.top,
            width: rubberBandRect.width,
            height: rubberBandRect.height,
            border: '1px dotted #000000',
            zIndex: 9999,
          }}
        />
      )}

      {/* Desktop icons */}
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
            onDragStart={handleIconDragStart}
            selected={effectiveSelectedIds.has(id)}
          />
        ))}
      </div>

      {Object.entries(windows).map(([id, state]) => {
        const isCompanyDetail = id.startsWith(COMPANY_DETAIL_PREFIX);
        const appId = isCompanyDetail ? null : (id as AppId);
        const cdInstance = isCompanyDetail ? companyDetailInstances[id] : null;
        const title = isCompanyDetail && cdInstance
          ? `${cdInstance.symbol} — Company Detail`
          : appId ? APP_LABELS[appId] : id;
        return (
          <DraggableResizableWindow
            key={id}
            state={state}
            title={title}
            onMove={(x, y) => updateWindow(id, { x, y })}
            onResize={(width, height) => updateWindow(id, { width, height })}
            onMinimize={() => minimizeWindow(id)}
            onClose={() => closeWindow(id)}
            onFocus={() => focusWindow(id)}
          >
            {appId === 'portfolio' && (
              <PortfolioWindow
                portfolio={portfolio}
                usdPrices={usdPrices}
                isLoading={isLoadingPortfolio}
                onRefresh={fetchPortfolio}
                perfil={perfil}
                estadoCuenta={estadoCuenta}
                onCompanyDetail={openCompanyDetail}
              />
            )}
            {appId === 'news' && (
              <NewsFeed
                generalNews={generalNews}
                specificNews={specificNews}
                lastUpdated={lastUpdated}
                onRefresh={() => fetchNews(true)}
                isLoading={isLoadingNews}
              />
            )}
            {appId === 'marketdata' && (
              <MarketDataWindow
                marketData={marketData?.marketData ?? null}
                ownedSymbols={marketData?.ownedSymbols ?? []}
                companyNames={marketData?.companyNames ?? {}}
                isLoading={isLoadingMarketData}
                onRefresh={fetchMarketData}
                onCompanyDetail={openCompanyDetail}
              />
            )}
            {appId === 'movements' && (
              <OperationsFeed
                operations={operations}
                isLoading={isLoadingOperations}
                onRefresh={fetchOperationsData}
              />
            )}

            {appId === 'backtesting' && (
              <BacktestingWindow />
            )}
            {appId === 'quicktrade' && (
              <QuickTradeWindow
                cedears={quickTradeData?.cedears ?? []}
                cash={quickTradeData?.cash ?? 0}
                comprometido={quickTradeData?.comprometido ?? 0}
                effectiveCash={quickTradeData?.effectiveCash ?? 0}
                commissionRate={quickTradeData?.commissionRate ?? 0.015}
                isLoading={isLoadingQuickTrade}
                onRefresh={() => { quickTradeFetched.current = false; fetchQuickTradeData(); }}
                onBuy={placeBuyOrder}
                onCompanyDetail={openCompanyDetail}
              />
            )}
            {isCompanyDetail && cdInstance && (
              <CompanyDetailWindow
                iolSymbol={cdInstance.symbol}
                isLoading={cdInstance.isLoading}
                error={cdInstance.error}
                data={cdInstance.data}
                onSearch={(sym) => navigateCompanyDetail(id, sym)}
              />
            )}
            {appId === 'autotrader' && (
              <AutoTraderWindow />
            )}
            {appId === 'displayproperties' && (
              <DisplayPropertiesWindow onClose={() => closeWindow('displayproperties')} />
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
        {allOpenWindows.map(([id]) => {
          const isCd = id.startsWith(COMPANY_DETAIL_PREFIX);
          const label = isCd
            ? `${id.slice(COMPANY_DETAIL_PREFIX.length)} — Detail`
            : APP_LABELS[id as AppId];
          return (
            <button
              key={id}
              type="button"
              className={`taskbar-button ${focusedId === id ? 'active' : ''}`}
              onClick={() => toggleMinimize(id)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Win98-style desktop context menu */}
      {contextMenu && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 10000,
            backgroundColor: '#c0c0c0',
            border: '2px solid',
            borderColor: '#ffffff #808080 #808080 #ffffff',
            padding: '2px',
            boxShadow: '2px 2px 0 #000000',
            fontFamily: '"Pixelated MS Sans Serif", "MS Sans Serif", Arial, sans-serif',
            fontSize: '11px',
            minWidth: '160px',
          }}
        >
          <button
            type="button"
            onClick={alignIcons}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '3px 24px 3px 6px',
              background: 'transparent',
              border: 'none',
              cursor: 'default',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              color: '#000000',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#000080';
              (e.currentTarget as HTMLElement).style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#000000';
            }}
          >
            Alinear Iconos
          </button>
        </div>
      )}
    </div>
  );
}

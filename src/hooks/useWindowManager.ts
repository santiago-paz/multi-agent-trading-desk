import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { WindowState } from '@/components/ui/DraggableResizableWindow';

export const APP_IDS = ['portfolio', 'news', 'marketdata', 'movements', 'backtesting', 'autotrader', 'displayproperties'] as const;
export type AppId = (typeof APP_IDS)[number];

export const DEFAULT_WINDOWS: Record<AppId, { width: number; height: number; x: number; y: number }> = {
  portfolio: { x: 24, y: 24, width: 752, height: 613 },
  news: { x: 380, y: 24, width: 500, height: 440 },
  marketdata: { x: 400, y: 80, width: 540, height: 400 },
  movements: { x: 120, y: 120, width: 750, height: 420 },

  backtesting: { x: 80, y: 40, width: 850, height: 620 },
  autotrader: { x: 80, y: 40, width: 760, height: 620 },
  displayproperties: { x: 200, y: 100, width: 420, height: 520 },
};

export const APP_LABELS: Record<AppId, string> = {
  portfolio: 'Portafolio y Cuenta',
  news: 'Market Intelligence Feed',
  marketdata: 'Market Data & Trade',
  movements: 'Movimientos',

  backtesting: 'Backtesting Engine',
  autotrader: 'Auto Trader',
  displayproperties: 'Display Properties',
};

export const COMPANY_DETAIL_DEFAULTS = { x: 200, y: 60, width: 560, height: 600 };

function createWindowState(id: AppId, zIndex: number, minimized = false): WindowState {
  const def = DEFAULT_WINDOWS[id];
  return {
    id,
    x: def.x,
    y: def.y,
    width: def.width,
    height: def.height,
    zIndex,
    minimized,
  };
}

export function useWindowManager() {
  const [windows, setWindows] = useState<Record<string, WindowState>>({});
  const zIndexRef = useRef(100);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const nextZ = useCallback(() => ++zIndexRef.current, []);

  const openOrFocusWindow = useCallback((id: AppId) => {
    const newZ = nextZ();
    setFocusedId(id);
    setWindows((prev) => {
      const current = prev[id];
      if (current) {
        return { ...prev, [id]: { ...current, minimized: false, zIndex: newZ } };
      }
      return { ...prev, [id]: createWindowState(id, newZ, false) };
    });
  }, [nextZ]);

  /** Open a dynamic window (not in APP_IDS) with custom defaults. If it already exists, focus it. */
  const openDynamicWindow = useCallback((id: string, defaults: { x: number; y: number; width: number; height: number }) => {
    const newZ = nextZ();
    setFocusedId(id);
    setWindows((prev) => {
      const current = prev[id];
      if (current) {
        return { ...prev, [id]: { ...current, minimized: false, zIndex: newZ } };
      }
      return { ...prev, [id]: { id, ...defaults, zIndex: newZ, minimized: false } };
    });
  }, [nextZ]);

  const updateWindow = useCallback((id: string, updates: Partial<WindowState>) => {
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      return { ...prev, [id]: { ...w, ...updates } };
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFocusedId((prevFocused) => (prevFocused === id ? null : prevFocused));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      return { ...prev, [id]: { ...w, minimized: true } };
    });
    setFocusedId((prevFocused) => (prevFocused === id ? null : prevFocused));
  }, []);

  const focusWindow = useCallback((id: string) => {
    const newZ = nextZ();
    setFocusedId(id);
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      return { ...prev, [id]: { ...w, zIndex: newZ, minimized: false } };
    });
  }, [nextZ]);

  const toggleMinimize = useCallback((id: string) => {
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;

      if (!w.minimized) {
        setFocusedId((prevFocused) => (prevFocused === id ? null : prevFocused));
        return { ...prev, [id]: { ...w, minimized: true } };
      }

      const newZ = nextZ();
      setFocusedId(id);
      return { ...prev, [id]: { ...w, minimized: false, zIndex: newZ } };
    });
  }, [nextZ]);

  // IDs where Escape should minimize instead of close (long-running processes)
  const minimizeOnEscapeIds = useMemo(() => new Set(['autotrader', 'backtesting']), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusedId) {
        if (minimizeOnEscapeIds.has(focusedId)) {
          minimizeWindow(focusedId);
        } else {
          closeWindow(focusedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusedId, closeWindow, minimizeWindow, minimizeOnEscapeIds]);

  const allOpenWindows = useMemo(() => Object.entries(windows), [windows]);

  return {
    windows,
    focusedId,
    allOpenWindows,
    openOrFocusWindow,
    openDynamicWindow,
    updateWindow,
    closeWindow,
    minimizeWindow,
    focusWindow,
    toggleMinimize
  };
}

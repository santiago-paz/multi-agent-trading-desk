import { useState, useCallback } from 'react';
import { WindowState } from '@/components/ui/DraggableResizableWindow';

export const APP_IDS = ['portfolio', 'analysis', 'agent', 'orders', 'news', 'marketdata', 'movements', 'account'] as const;
export type AppId = (typeof APP_IDS)[number];

export const DEFAULT_WINDOWS: Record<AppId, { width: number; height: number; x: number; y: number }> = {
  portfolio: { x: 24, y: 24, width: 340, height: 380 },
  analysis: { x: 56, y: 56, width: 320, height: 260 },
  agent: { x: 88, y: 88, width: 420, height: 440 },
  orders: { x: 24, y: 220, width: 340, height: 320 },
  news: { x: 380, y: 24, width: 500, height: 440 },
  marketdata: { x: 400, y: 80, width: 540, height: 400 },
  movements: { x: 120, y: 120, width: 440, height: 320 },
  account: { x: 200, y: 150, width: 380, height: 480 },
};

export const APP_LABELS: Record<AppId, string> = {
  portfolio: 'Portfolio',
  analysis: 'Analysis',
  agent: 'Agent Log',
  orders: 'Orders',
  news: 'Market Intelligence Feed',
  marketdata: 'Market Data',
  movements: 'Movimientos',
  account: 'Mi Cuenta',
};

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
  const [, setNextZIndex] = useState(100);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const openOrFocusWindow = useCallback((id: AppId) => {
    setFocusedId(id);
    setNextZIndex((z) => {
      const newZ = z + 1;
      setWindows((prev) => {
        const current = prev[id];
        if (current) {
          return {
            ...prev,
            [id]: { ...current, minimized: false, zIndex: newZ },
          };
        }
        return {
          ...prev,
          [id]: { ...createWindowState(id, newZ, false), zIndex: newZ },
        };
      });
      return newZ;
    });
  }, []);

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
    setFocusedId(id);
    setNextZIndex((z) => {
      const newZ = z + 1;
      setWindows((prev) => {
        const w = prev[id];
        if (!w) return prev;
        return { ...prev, [id]: { ...w, zIndex: newZ, minimized: false } };
      });
      return newZ;
    });
  }, []);

  const toggleMinimize = useCallback((id: string) => {
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      
      const newMinimized = !w.minimized;
      
      if (!newMinimized) {
        setFocusedId(id);
        setNextZIndex((z) => {
          const newZ = z + 1;
          setTimeout(() => { // slight delay to avoid state batching conflict if any
              setWindows(p => {
                  const curr = p[id];
                  return curr ? { ...p, [id]: { ...curr, zIndex: newZ } } : p;
              })
          }, 0)
          return newZ;
        });
      } else {
        setFocusedId((prevFocused) => (prevFocused === id ? null : prevFocused));
      }

      return { ...prev, [id]: { ...w, minimized: newMinimized } };
    });
  }, []);


  const allOpenWindows = Object.entries(windows);

  return {
    windows,
    focusedId,
    allOpenWindows,
    openOrFocusWindow,
    updateWindow,
    closeWindow,
    minimizeWindow,
    focusWindow,
    toggleMinimize
  };
}

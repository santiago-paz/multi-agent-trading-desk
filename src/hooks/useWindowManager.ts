import { useState, useCallback, useEffect } from 'react';
import { WindowState } from '@/components/ui/DraggableResizableWindow';

export const APP_IDS = ['portfolio', 'news', 'marketdata', 'movements', 'advisor'] as const;
export type AppId = (typeof APP_IDS)[number];

export const DEFAULT_WINDOWS: Record<AppId, { width: number; height: number; x: number; y: number }> = {
  portfolio: { x: 24, y: 24, width: 580, height: 440 },
  news: { x: 380, y: 24, width: 500, height: 440 },
  marketdata: { x: 400, y: 80, width: 540, height: 400 },
  movements: { x: 120, y: 120, width: 440, height: 320 },
  advisor: { x: 150, y: 150, width: 420, height: 500 },
};

export const APP_LABELS: Record<AppId, string> = {
  portfolio: 'Portafolio y Cuenta',
  news: 'Market Intelligence Feed',
  marketdata: 'Market Data',
  movements: 'Movimientos',
  advisor: 'Asesor IA',
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusedId) {
        closeWindow(focusedId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusedId, closeWindow]);


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

import { create } from 'zustand';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ZoomAnim {
  id: number;
  from: Rect;
  to: Rect;
  startedAt: number;
  duration: number;
}

interface AnimStore {
  items: ZoomAnim[];
  play: (from: Rect, to: Rect, opts?: { duration?: number; onComplete?: () => void }) => number;
}

let nextId = 1;
const ZOOM_DURATION_MS = 220;

export const useWin98AnimStore = create<AnimStore>((set) => ({
  items: [],
  play: (from, to, opts) => {
    const id = nextId++;
    const duration = opts?.duration ?? ZOOM_DURATION_MS;
    const item: ZoomAnim = { id, from, to, startedAt: performance.now(), duration };
    set((s) => ({ items: [...s.items, item] }));
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        useWin98AnimStore.setState((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        opts?.onComplete?.();
      }, duration);
    }
    return id;
  },
}));

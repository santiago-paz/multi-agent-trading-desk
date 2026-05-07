import { useEffect, useRef } from 'react';
import { usePlantitaStore } from '@/lib/store/plantita-store';
import { TICK_INTERVAL_MS } from './engine';

let activeOwner: symbol | null = null;

export function useGameLoop(): void {
  const ownerRef = useRef<symbol | null>(null);
  if (!ownerRef.current) ownerRef.current = Symbol('plantita-loop');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeOwner && activeOwner !== ownerRef.current) return;
    activeOwner = ownerRef.current;

    let intervalId: number | null = null;

    const start = () => {
      if (intervalId !== null) return;
      intervalId = window.setInterval(() => {
        usePlantitaStore.getState().applyTick();
      }, TICK_INTERVAL_MS);
    };

    const stop = () => {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        usePlantitaStore.getState().applyTick();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
      if (activeOwner === ownerRef.current) activeOwner = null;
    };
  }, []);
}

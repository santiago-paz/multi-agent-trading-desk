'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useWin98AnimStore } from '@/lib/store/win98-anim-store';

const STEPS = 7;

export function Win98WindowAnimationOverlay() {
  const items = useWin98AnimStore((s) => s.items);
  const [now, setNow] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    const tick = () => {
      setNow(performance.now());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [items.length]);

  if (items.length === 0 || now === 0) return null;

  return (
    <svg
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 2147483646,
        pointerEvents: 'none',
        mixBlendMode: 'difference',
      }}
    >
      {items.map((it) => {
        const elapsed = Math.max(0, now - it.startedAt);
        const t = Math.min(1, elapsed / it.duration);
        const stepIdx = Math.min(STEPS, Math.floor(t * STEPS));
        const k = stepIdx / STEPS;
        const x = it.from.x + (it.to.x - it.from.x) * k;
        const y = it.from.y + (it.to.y - it.from.y) * k;
        const w = it.from.width + (it.to.width - it.from.width) * k;
        const h = it.from.height + (it.to.height - it.from.height) * k;
        const rx = Math.round(x) + 0.5;
        const ry = Math.round(y) + 0.5;
        const rw = Math.max(1, Math.round(w) - 1);
        const rh = Math.max(1, Math.round(h) - 1);
        return (
          <rect
            key={it.id}
            x={rx}
            y={ry}
            width={rw}
            height={rh}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
        );
      })}
    </svg>
  );
}

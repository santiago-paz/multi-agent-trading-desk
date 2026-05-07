'use client';

import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWin98AnimStore, type Rect } from '@/lib/store/win98-anim-store';

const MIN_WIDTH = 200;
const MIN_HEIGHT = 120;
const SNAP_THRESHOLD = 20;
const TASKBAR_HEIGHT = 32;

function getTaskbarRect(id: string): Rect | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(`[data-taskbar-id="${CSS.escape(id)}"]`) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

export interface WindowState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
}

type SnapZone = 'left' | 'right' | null;

interface DraggableResizableWindowProps {
  state: WindowState;
  title: string;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onMinimize: () => void;
  onClose: () => void;
  onFocus: () => void;
  children: React.ReactNode;
}

export const DraggableResizableWindow: React.FC<DraggableResizableWindowProps> = ({
  state,
  title,
  onMove,
  onResize,
  onMinimize,
  onClose,
  onFocus,
  children,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [snapZone, setSnapZone] = useState<SnapZone>(null);
  const [isSnapped, setIsSnapped] = useState(false);
  const prevStateRef = useRef({ x: state.x, y: state.y, width: state.width, height: state.height });
  const dragStartRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const resizeStartRef = useRef<{ startX: number; startY: number; startW: number; startH: number; edge: string } | null>(null);

  const detectSnapZone = useCallback((clientX: number): SnapZone => {
    if (clientX <= SNAP_THRESHOLD) return 'left';
    if (clientX >= window.innerWidth - SNAP_THRESHOLD) return 'right';
    return null;
  }, []);

  const applySnap = useCallback((zone: SnapZone) => {
    if (!zone) return;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight - TASKBAR_HEIGHT;
    const halfW = Math.floor(screenW / 2);
    if (zone === 'left') {
      onMove(0, 0);
      onResize(halfW, screenH);
    } else {
      onMove(halfW, 0);
      onResize(screenW - halfW, screenH);
    }
    setIsSnapped(true);
    setIsMaximized(false);
  }, [onMove, onResize]);

  const handleTitleBarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      onFocus();
      if (isSnapped) {
        prevStateRef.current = { x: state.x, y: state.y, width: prevStateRef.current.width, height: prevStateRef.current.height };
      }
      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft: state.x,
        startTop: state.y,
      };
    },
    [state.x, state.y, onFocus, isSnapped]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, edge: string) => {
      e.preventDefault();
      e.stopPropagation();
      onFocus();
      resizeStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: state.width,
        startH: state.height,
        edge,
      };
    },
    [state.width, state.height, onFocus]
  );

  React.useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragStartRef.current) {
        const dx = e.clientX - dragStartRef.current.startX;
        const dy = e.clientY - dragStartRef.current.startY;

        if (isSnapped && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
          const prevW = prevStateRef.current.width;
          const prevH = prevStateRef.current.height;
          const ratioX = (e.clientX - dragStartRef.current.startLeft) / state.width;
          const newX = e.clientX - prevW * ratioX;
          const newY = e.clientY - (dragStartRef.current.startY - dragStartRef.current.startTop);
          onResize(prevW, prevH);
          onMove(newX, newY);
          dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startLeft: newX,
            startTop: newY,
          };
          setIsSnapped(false);
          setSnapZone(null);
          return;
        }

        if (!isSnapped) {
          onMove(dragStartRef.current.startLeft + dx, dragStartRef.current.startTop + dy);
          setSnapZone(detectSnapZone(e.clientX));
        }
      }
      if (resizeStartRef.current) {
        const { startX, startY, startW, startH, edge } = resizeStartRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let w = startW;
        let h = startH;
        if (edge.includes('e')) w = Math.max(MIN_WIDTH, startW + dx);
        if (edge.includes('w')) w = Math.max(MIN_WIDTH, startW - dx);
        if (edge.includes('s')) h = Math.max(MIN_HEIGHT, startH + dy);
        if (edge.includes('n')) h = Math.max(MIN_HEIGHT, startH - dy);
        onResize(w, h);
        if (isSnapped) setIsSnapped(false);
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (dragStartRef.current && !isSnapped) {
        const zone = detectSnapZone(e.clientX);
        if (zone) {
          prevStateRef.current = {
            x: dragStartRef.current.startLeft,
            y: dragStartRef.current.startTop,
            width: state.width,
            height: state.height,
          };
          applySnap(zone);
        }
      }
      dragStartRef.current = null;
      resizeStartRef.current = null;
      setSnapZone(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMove, onResize, detectSnapZone, applySnap, isSnapped, state.width, state.height]);

  const playZoom = useWin98AnimStore((s) => s.play);

  const currentRect = useCallback((): Rect => ({
    x: state.x, y: state.y, width: state.width, height: state.height,
  }), [state.x, state.y, state.width, state.height]);

  const handleMinimizeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const tb = getTaskbarRect(state.id);
    if (tb) {
      const from = currentRect();
      onMinimize();
      playZoom(from, tb);
    } else {
      onMinimize();
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
  };

  const handleMaximizeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMaximized) {
      const from = currentRect();
      const target = { ...prevStateRef.current };
      playZoom(from, target, {
        onComplete: () => {
          onResize(target.width, target.height);
          onMove(target.x, target.y);
          setIsSnapped(false);
        },
      });
    } else {
      const from = currentRect();
      prevStateRef.current = from;
      const targetW = typeof window !== 'undefined' ? window.innerWidth : 800;
      const targetH = typeof window !== 'undefined' ? window.innerHeight - TASKBAR_HEIGHT : 600;
      const target: Rect = { x: 0, y: 0, width: targetW, height: targetH };
      playZoom(from, target, {
        onComplete: () => {
          onMove(0, 0);
          onResize(targetW, targetH);
        },
      });
    }
    setIsMaximized(!isMaximized);
  };

  return (
    <div
      className="absolute flex flex-col overflow-visible"
      style={{
        display: state.minimized ? 'none' : undefined,
        left: state.x,
        top: state.y,
        width: state.width,
        height: state.height,
        zIndex: state.zIndex,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
      }}
      onMouseDown={onFocus}
    >
      <div className="window flex flex-col h-full overflow-hidden flex-1 min-h-0">
        <div
          className="title-bar cursor-move select-none"
          onMouseDown={handleTitleBarMouseDown}
          onDoubleClick={handleMaximizeClick}
        >
          <div className="title-bar-text truncate pr-2">{title}</div>
          <div className="title-bar-controls shrink-0">
            <button type="button" aria-label="Minimize" onClick={handleMinimizeClick} />
            <button type="button" aria-label="Maximize" onClick={handleMaximizeClick} />
            <button type="button" aria-label="Close" onClick={handleCloseClick} />
          </div>
        </div>
        <div className="window-body overflow-hidden flex-1 min-h-0" style={{ padding: 0, margin: 0 }}>
          {children}
        </div>
      </div>
      {/* Resize handles */}
      {/* Corner SE — on top, with Win98 grip visual */}
      <div
        className="absolute cursor-se-resize"
        style={{ right: 0, bottom: 0, width: 16, height: 16, zIndex: 2 }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
      >
        {/* Win98 resize grip dots */}
        <svg width="16" height="16" style={{ display: 'block', pointerEvents: 'none' }}>
          {[
            [10, 14], [14, 14],
            [14, 10],
          ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <rect x={cx - 1} y={cy - 1} width={2} height={2} fill="#ffffff" />
              <rect x={cx}     y={cy}     width={2} height={2} fill="#808080" />
            </g>
          ))}
        </svg>
      </div>
      {/* Right edge — stops 16px from bottom to yield to corner */}
      <div
        className="absolute cursor-e-resize"
        style={{ right: 0, top: 0, width: 8, height: 'calc(100% - 16px)', zIndex: 1 }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
      />
      {/* Bottom edge — stops 16px from right to yield to corner */}
      <div
        className="absolute cursor-s-resize"
        style={{ bottom: 0, left: 0, height: 8, width: 'calc(100% - 16px)', zIndex: 1 }}
        onMouseDown={(e) => handleResizeMouseDown(e, 's')}
      />
      {/* Snap preview overlay */}
      {snapZone && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: snapZone === 'left' ? 0 : '50%',
            width: '50%',
            height: `calc(100vh - ${TASKBAR_HEIGHT}px)`,
            background: 'rgba(0, 0, 128, 0.15)',
            border: '3px solid rgba(0, 0, 128, 0.5)',
            zIndex: 99999,
            pointerEvents: 'none',
            transition: 'left 0.15s ease, opacity 0.15s ease',
          }}
        />,
        document.body
      )}
    </div>
  );
}

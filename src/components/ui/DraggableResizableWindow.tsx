'use client';

import React, { useCallback, useRef, useState } from 'react';

const MIN_WIDTH = 200;
const MIN_HEIGHT = 120;
const RESIZE_HANDLE_SIZE = 8;

export interface WindowState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
}

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
  const prevStateRef = useRef({ x: state.x, y: state.y, width: state.width, height: state.height });
  const dragStartRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const resizeStartRef = useRef<{ startX: number; startY: number; startW: number; startH: number; edge: string } | null>(null);

  const handleTitleBarMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      onFocus();
      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft: state.x,
        startTop: state.y,
      };
    },
    [state.x, state.y, onFocus]
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
        onMove(dragStartRef.current.startLeft + dx, dragStartRef.current.startTop + dy);
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
      }
    };
    const onMouseUp = () => {
      dragStartRef.current = null;
      resizeStartRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMove, onResize]);

  const handleMinimizeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onMinimize();
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
  };

  const handleMaximizeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMaximized) {
      onResize(prevStateRef.current.width, prevStateRef.current.height);
      onMove(prevStateRef.current.x, prevStateRef.current.y);
    } else {
      prevStateRef.current = { x: state.x, y: state.y, width: state.width, height: state.height };
      onMove(0, 0);
      onResize(typeof window !== 'undefined' ? window.innerWidth : 800, typeof window !== 'undefined' ? window.innerHeight - 32 : 600);
    }
    setIsMaximized(!isMaximized);
  };

  if (state.minimized) return null;

  return (
    <div
      className="absolute flex flex-col overflow-visible"
      style={{
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
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
        style={{ right: 0, bottom: 0 }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
        title="Resize"
      />
      <div
        className="absolute top-0 right-0 w-2 h-full cursor-e-resize"
        style={{ right: 0, top: 0 }}
        onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
      />
      <div
        className="absolute bottom-0 left-0 h-2 w-full cursor-s-resize"
        style={{ bottom: 0, left: 0 }}
        onMouseDown={(e) => handleResizeMouseDown(e, 's')}
      />
    </div>
  );
}

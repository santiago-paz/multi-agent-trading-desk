'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

const FALLBACK_EMOJI = '📄';

interface DesktopIconProps {
  id: string;
  label: string;
  /** URL to an image (e.g. Win98SE icon from CDN) */
  iconSrc?: string;
  /** Fallback when iconSrc is not used or image fails to load: emoji or React node */
  icon?: React.ReactNode;
  onClick: () => void;
  x?: number;
  y?: number;
  onMove?: (id: string, x: number, y: number) => void;
  onDragStart?: (id: string) => void;
  selected?: boolean;
}

export const DesktopIcon: React.FC<DesktopIconProps> = ({
  id,
  label,
  iconSrc,
  icon,
  onClick,
  x = 0,
  y = 0,
  onMove,
  onDragStart,
  selected = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const useImage = iconSrc && !imgFailed;

  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: x,
      initialY: y,
    };
    setIsTracking(true);
    setHasMoved(false);
  }, [x, y]);

  useEffect(() => {
    if (!isTracking) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;

      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;

      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        setIsDragging(true);
        onDragStart?.(id);
      }

      if (isDragging || Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setHasMoved(true);
        if (onMove) {
          onMove(id, dragStartRef.current.initialX + dx, dragStartRef.current.initialY + dy);
        }
      }
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      setIsTracking(false);
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [id, isTracking, isDragging, onMove, onDragStart]);

  const handleClick = (e: React.MouseEvent) => {
    if (!hasMoved) {
      onClick();
    }
  };

  return (
    <div
      className="absolute pointer-events-auto select-none desktop-icon-wrapper"
      style={{
        left: x,
        top: y,
        zIndex: isDragging ? 2000 : 1,
      }}
    >
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        className="desktop-icon flex flex-col items-center justify-start gap-0.5 w-16 p-1 bg-transparent border-none cursor-pointer text-left focus:outline-none focus-visible:outline-2 focus-visible:outline-dotted focus-visible:outline-white focus-visible:outline-offset-1 rounded-none min-h-0"
        style={{ minHeight: 52 }}
      >
        <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden flex-shrink-0 pointer-events-none relative">
          {useImage ? (
            <>
              <img
                src={iconSrc}
                alt=""
                className="w-8 h-8 object-contain block"
                loading="lazy"
                onError={() => setImgFailed(true)}
              />
              {selected && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ backgroundColor: 'rgba(0, 0, 128, 0.5)' }}
                />
              )}
            </>
          ) : (
            <span className="text-2xl leading-none block">{icon ?? FALLBACK_EMOJI}</span>
          )}
        </div>
        <span
          className="text-[11px] text-white text-center leading-tight font-normal break-words max-w-full px-0.5 block pointer-events-none"
          style={{
            textShadow: selected ? 'none' : '0 0 1px #000, 1px 1px 1px #000',
            userSelect: 'none',
            backgroundColor: selected ? '#000080' : 'transparent',
          }}
        >
          {label}
        </span>
      </button>
    </div>
  );
};

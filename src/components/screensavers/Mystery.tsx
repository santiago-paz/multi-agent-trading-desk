'use client';

import React, { useEffect, useState, useRef } from 'react';

interface MysteryProps {
  isFullScreen?: boolean;
}

export function Mystery({ isFullScreen = false }: MysteryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [velocity, setVelocity] = useState({ x: 0.5, y: 0.5 });
  const [colorIndex, setColorIndex] = useState(0);

  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const logoWidth = 40; // Approx logo width inside the preview
      const logoHeight = 20;

      setPosition((prevPos) => {
        let newX = prevPos.x + velocity.x;
        let newY = prevPos.y + velocity.y;
        let bounce = false;

        if (newX <= 0 || newX + logoWidth >= rect.width) {
          setVelocity((v) => ({ ...v, x: -v.x }));
          newX = newX <= 0 ? 0 : rect.width - logoWidth;
          bounce = true;
        }

        if (newY <= 0 || newY + logoHeight >= rect.height) {
          setVelocity((v) => ({ ...v, y: -v.y }));
          newY = newY <= 0 ? 0 : rect.height - logoHeight;
          bounce = true;
        }

        if (bounce) {
          setColorIndex((c) => (c + 1) % colors.length);
        }

        return { x: newX, y: newY };
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [velocity]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
      <div 
        style={{ 
          position: 'absolute', 
          left: position.x, 
          top: position.y,
          color: colors[colorIndex],
          fontFamily: '"Pixelated MS Sans Serif", "MS Sans Serif", Arial, sans-serif',
          fontWeight: 'bold',
          fontSize: isFullScreen ? '5vw' : '12px',
          whiteSpace: 'nowrap',
          textShadow: isFullScreen ? '3px 3px 0 #000' : '1px 1px 0 #000',
        }}
      >
        Windows
      </div>
    </div>
  );
}

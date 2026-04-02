'use client';

import React from 'react';
import { useDisplayStore } from '@/lib/store/display-store';

interface Text3DProps {
  text?: string;
  isFullScreen?: boolean;
}

export function Text3D({ text, isFullScreen = false }: Text3DProps) {
  const { screenSaverText } = useDisplayStore();
  const displayText = text || screenSaverText || 'Windows';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      perspective: '400px',
      overflow: 'hidden',
    }}>
      <style>
        {`
          @keyframes rotate3dtext {
            0% { transform: rotateY(0deg) rotateX(20deg); }
            100% { transform: rotateY(360deg) rotateX(20deg); }
          }
        `}
      </style>
      <div style={{
        animation: 'rotate3dtext 4s infinite linear',
        color: '#c0c0c0',
        fontSize: isFullScreen ? '15vw' : '20px',
        fontWeight: 'bold',
        fontFamily: '"Times New Roman", Times, serif',
        transformStyle: 'preserve-3d',
        textShadow: '2px 2px 0px #808080, -1px -1px 0 #ffffff',
        whiteSpace: 'nowrap',
      }}>
        {displayText}
      </div>
    </div>
  );
}

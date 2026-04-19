import React from 'react';
import { COL_SUNKEN, FONT } from '@/lib/theme/win98';

export function PeterLynchDetail({ reasoning }: { reasoning: string }) {
  if (!reasoning || typeof reasoning !== 'string') return null;

  return (
    <div key="peter-lynch-analysis" style={{ marginTop: 6, marginBottom: 8 }}>
      <strong>Análisis de Peter Lynch:</strong>
      <div style={{
        display: 'flex', 
        gap: '8px', 
        marginTop: '6px', 
        ...COL_SUNKEN,
        padding: '8px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ flexShrink: 0 }}>
          <img 
            src="/peter.png" 
            alt="Peter Lynch" 
            style={{ 
              width: '48px', 
              height: '48px', 
              imageRendering: 'pixelated',
              border: '2px solid #dfdfdf',
              borderBottomColor: '#808080',
              borderRightColor: '#808080'
            }} 
          />
        </div>
        <div style={{ flex: 1, ...FONT, fontSize: '1.05em', color: '#111', display: 'block', paddingTop: '1px' }}>
          <div style={{ wordBreak: 'break-word', lineHeight: '1.4', whiteSpace: 'normal' }}>
            {reasoning.split('\n').filter(line => line.trim() !== '').map((paragraph, idx, arr) => (
              <i key={idx} style={{ display: 'block', marginBottom: idx < arr.length - 1 ? '8px' : '0' }}>
                {idx === 0 ? '"' : ''}{paragraph.trim()}{idx === arr.length - 1 ? '"' : ''}
              </i>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

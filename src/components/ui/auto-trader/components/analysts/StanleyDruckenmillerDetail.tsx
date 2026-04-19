import React from 'react';
import { COL_SUNKEN, FONT } from '@/lib/theme/win98';

export function StanleyDruckenmillerDetail({ reasoning }: { reasoning: string }) {
  if (!reasoning || typeof reasoning !== 'string') return null;

  return (
    <div key="stanley-druckenmiller-analysis" style={{ marginTop: 6, marginBottom: 8 }}>
      <strong>Análisis de Stanley Druckenmiller:</strong>
      <div style={{
        display: 'flex', 
        gap: '12px', 
        marginTop: '6px', 
        ...COL_SUNKEN,
        padding: '8px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ flexShrink: 0 }}>
          <img 
            src="/stanley.png" 
            alt="Stanley Druckenmiller" 
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
        <div style={{ flex: 1, ...FONT, fontSize: '0.9em', color: '#111', display: 'block', paddingTop: '4px' }}>
          <i style={{ 
            display: 'block', 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            lineHeight: '1.4'
          }}>
            "{reasoning}"
          </i>
        </div>
      </div>
    </div>
  );
}

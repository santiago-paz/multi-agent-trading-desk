import React from 'react';
import { COL_SUNKEN } from '@/lib/theme/win98';

export function FundamentalsDetail({ reasoning }: { reasoning: any }) {
  if (!reasoning || typeof reasoning !== 'object') return null;

  return (
    <div key="fundamentals-analysis" style={{ marginTop: 6 }}>
      <strong>Análisis Fundamental Detallado:</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
        {[
          { key: 'profitability_signal', title: '💰 Rentabilidad' },
          { key: 'growth_signal', title: '📈 Crecimiento' },
          { key: 'financial_health_signal', title: '🏥 Salud Financiera' },
          { key: 'price_ratios_signal', title: '⚖️ Ratios de Valuación (Precio)' },
        ].map(sec => {
          const detail = reasoning[sec.key];
          if (!detail) return null;
          
          const secSig = detail.signal;
          const icon = secSig === 'bullish' ? '🟢' : secSig === 'bearish' ? '🔴' : '⚪';
          const sigText = secSig === 'bullish' ? 'Alcista' : secSig === 'bearish' ? 'Bajista' : 'Neutral';

          return (
            <div key={sec.key} style={{ ...COL_SUNKEN, padding: '4px 6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{sec.title}</strong>
                <span style={{ fontWeight: 'bold' }}>{icon} {sigText}</span>
              </div>
              {detail.details && (
                 <div style={{ fontSize: '0.95em', color: '#111', marginTop: 3 }}>
                   {detail.details.split(', ').map((metric: string, idx: number) => (
                     <div key={idx} style={{ display: 'inline-block', marginRight: 12 }}>
                       <span style={{ color: '#666', marginRight: 4 }}>•</span>
                       {metric}
                     </div>
                   ))}
                 </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { COL_SUNKEN } from '@/lib/theme/win98';

const METRIC_LABELS: Record<string, string> = {
  adx: 'Fuerza Tendencia (ADX)',
  trend_strength: 'Fuerza General',
  z_score: 'Z-Score (Desv)',
  price_vs_bb: 'Posición % Bandas BB',
  rsi_14: 'RSI (14 días)',
  rsi_28: 'RSI (28 días)',
  momentum_1m: 'Momentum 1 Mes',
  momentum_3m: 'Momentum 3 Meses',
  momentum_6m: 'Momentum 6 Meses',
  volume_momentum: 'Fuerza Volumen',
  historical_volatility: 'Volatilidad Histórica',
  volatility_regime: 'Régimen Volat',
  volatility_z_score: 'Z-Score Volatilidad',
  atr_ratio: 'Ratio Varianza (ATR)',
  hurst_exponent: 'Exponente Hurst',
  skewness: 'Asimetría (Skew)',
  kurtosis: 'Curtosis',
};

export function TechnicalDetail({ reasoning }: { reasoning: any }) {
  if (!reasoning || typeof reasoning !== 'object') return null;
  
  return (
    <div key="tech-analysis" style={{ marginTop: 6 }}>
      <strong>Análisis Técnico Detallado:</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
        {[
          { key: 'trend_following', title: '📈 Seguimiento de Tendencia' },
          { key: 'mean_reversion', title: '🔄 Reversión a la Media' },
          { key: 'momentum', title: '⚡ Momentum' },
          { key: 'volatility', title: '📊 Volatilidad' },
          { key: 'statistical_arbitrage', title: '📐 Arbitraje Estadístico' },
        ].map(sec => {
          const detail = reasoning[sec.key];
          if (!detail) return null;
          const secSig = detail.signal;
          const icon = secSig === 'bullish' ? '🟢' : secSig === 'bearish' ? '🔴' : '⚪';
          const sigText = secSig === 'bullish' ? 'Alcista' : secSig === 'bearish' ? 'Bajista' : 'Neutral';
          return (
            <div key={sec.key} style={{ ...COL_SUNKEN, padding: '4px 6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: detail.metrics ? 4 : 0 }}>
                <strong>{sec.title}</strong>
                <span style={{ fontWeight: 'bold' }}>{icon} {sigText} ({Math.round(detail.confidence || 0)}%)</span>
              </div>
              {detail.metrics && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: '0.95em', color: '#111' }}>
                  {Object.entries(detail.metrics).map(([mKey, mVal]) => (
                     <span key={mKey}>
                       <span style={{color: '#666', marginRight: 2}}>{METRIC_LABELS[mKey] || mKey.replace(/_/g, ' ')}:</span>
                       {typeof mVal === 'number' ? (Number.isInteger(mVal) ? mVal : (mVal as number).toFixed(2)) : String(mVal)}
                     </span>
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

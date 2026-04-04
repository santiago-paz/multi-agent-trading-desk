import React from 'react';
import { COL_SUNKEN } from '@/lib/theme/win98';

const GROWTH_LABELS: Record<string, string> = {
  score: 'Puntuación',
  revenue_growth: 'Crec. Ingresos',
  revenue_trend: 'Tendencia Ingresos',
  eps_growth: 'Crec. BxA (EPS)',
  eps_trend: 'Tendencia BxA',
  fcf_growth: 'Crec. FCF',
  fcf_trend: 'Tendencia FCF',
  peg_ratio: 'Ratio PEG',
  price_to_sales_ratio: 'Ratio Precio/Ventas',
  gross_margin: 'Margen Bruto',
  gross_margin_trend: 'Tendencia Margen Bruto',
  operating_margin: 'Margen Operativo',
  operating_margin_trend: 'Tendencia Margen Operativo',
  net_margin: 'Margen Neto',
  net_margin_trend: 'Tendencia Margen Neto',
  net_flow_ratio: 'Flujo Neto',
  buys: 'Compras',
  sells: 'Ventas',
  debt_to_equity: 'Deuda a Capital',
  current_ratio: 'Ratio de Liquidez',
};

// Formato genérico para números - convierte a porcentaje si el valor es menor a 10 pero no es el score ni ratios explícitos
const formatMetric = (key: string, value: any) => {
  if (typeof value !== 'number') return String(value);
  
  if (key === 'score') return `${(value * 100).toFixed(0)}/100`;
  
  if (['buys', 'sells'].includes(key)) {
    if (value > 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value > 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }

  if (['peg_ratio', 'price_to_sales_ratio', 'debt_to_equity', 'current_ratio'].includes(key)) {
    return value.toFixed(2);
  }

  // Las demás, como growth o margins, suelen ser porcentajes
  return `${(value * 100).toFixed(1)}%`;
};

export function GrowthDetail({ reasoning }: { reasoning: any }) {
  if (!reasoning || typeof reasoning !== 'object') return null;

  return (
    <div key="growth-analysis" style={{ marginTop: 6 }}>
      <strong>Análisis de Crecimiento Detallado:</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
        {[
          { key: 'historical_growth', title: '📈 Crecimiento Histórico' },
          { key: 'growth_valuation', title: '⚖️ Valuación vs Crecimiento' },
          { key: 'margin_expansion', title: '💸 Expansión de Márgenes' },
          { key: 'insider_conviction', title: '👥 Convicción Insiders' },
          { key: 'financial_health', title: '🏥 Salud Financiera' },
        ].map(sec => {
          const detail = reasoning[sec.key];
          if (!detail) return null;
          
          let scoreComponent = null;
          if (detail.score !== undefined) {
             const scr = detail.score;
             const color = scr >= 0.6 ? '#006600' : scr <= 0.4 ? '#990000' : '#444444';
             scoreComponent = <span style={{ fontWeight: 'bold', color }}>Puntuación: {Math.round(scr * 100)}%</span>;
          }

          return (
            <div key={sec.key} style={{ ...COL_SUNKEN, padding: '4px 6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong>{sec.title}</strong>
                {scoreComponent}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: '0.85em', color: '#111' }}>
                {Object.entries(detail).filter(([k]) => k !== 'score').map(([mKey, mVal]) => (
                   <span key={mKey}>
                     <span style={{color: '#666', marginRight: 2}}>{GROWTH_LABELS[mKey] || mKey.replace(/_/g, ' ')}:</span>
                     {formatMetric(mKey, mVal)}
                   </span>
                ))}
              </div>
            </div>
          );
        })}
        
        {reasoning.final_analysis && (
          <div key="combined" style={{ ...COL_SUNKEN, padding: '4px 6px', marginTop: '2px', backgroundColor: '#e8ecef' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Conclusión Final:</strong>
              <span style={{ fontWeight: 'bold' }}>
                 {reasoning.final_analysis.signal === 'bullish' ? '🟢 Alcista' : 
                  reasoning.final_analysis.signal === 'bearish' ? '🔴 Bajista' : '⚪ Neutral'}
                 {' '}({Math.round(reasoning.final_analysis.confidence || 0)}%)
              </span>
            </div>
            <div style={{ fontSize: '0.85em', color: '#333', marginTop: 2 }}>
              Puntuación Ponderada: {Math.round((reasoning.final_analysis.weighted_score || 0) * 100)}/100
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

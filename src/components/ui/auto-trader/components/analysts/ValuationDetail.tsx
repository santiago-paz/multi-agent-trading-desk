import React from 'react';
import { COL_SUNKEN } from '@/lib/theme/win98';

const VALUATION_LABELS: Record<string, string> = {
  bear_case: 'Escenario Pesimista',
  base_case: 'Escenario Base',
  bull_case: 'Escenario Optimista',
  wacc_used: 'WACC Utilizado',
  fcf_periods_analyzed: 'Períodos FCF Analizados'
};

export function ValuationDetail({ reasoning }: { reasoning: any }) {
  if (!reasoning || typeof reasoning !== 'object') return null;

  return (
    <div key="valuation-analysis" style={{ marginTop: 6 }}>
      <strong>Análisis de Valoración Detallado:</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
        {[
          { key: 'dcf_analysis', title: 'Flujo de Caja Descontado (DCF)' },
          { key: 'owner_earnings_analysis', title: 'Ganancias del Propietario (Buffett)' },
          { key: 'ev_ebitda_analysis', title: 'Múltiplo EV/EBITDA' },
          { key: 'residual_income_analysis', title: 'Ingreso Residual' },
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
                 <div style={{ fontSize: '0.95em', color: '#111', marginTop: 3, whiteSpace: 'pre-wrap' }}>
                   {detail.details.split('\n').map((line: string, i: number) => (
                     <div key={i}>{line}</div>
                   ))}
                 </div>
              )}
            </div>
          );
        })}
        {reasoning.dcf_scenario_analysis && (
          <div key="dcf-scenario" style={{ ...COL_SUNKEN, padding: '4px 6px', marginTop: '2px', backgroundColor: '#e8ecef' }}>
            <div style={{ marginBottom: 4 }}><strong>Escenarios DCF:</strong></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: '0.95em', color: '#111' }}>
              {Object.entries(reasoning.dcf_scenario_analysis).map(([mKey, mVal]) => (
                 <span key={mKey}>
                   <span style={{color: '#666', marginRight: 2}}>{VALUATION_LABELS[mKey] || mKey.replace(/_/g, ' ')}:</span>
                   {String(mVal)}
                 </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

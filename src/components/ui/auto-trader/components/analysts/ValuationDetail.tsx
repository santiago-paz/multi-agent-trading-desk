import React from 'react';
import { COL_SUNKEN } from '@/lib/theme/win98';
import { useAutoTraderT, type AutoTraderKey } from '@/lib/i18n';

const VALUATION_I18N: Record<string, AutoTraderKey> = {
  bear_case: 'detail.valuation.bearCase',
  base_case: 'detail.valuation.baseCase',
  bull_case: 'detail.valuation.bullCase',
  wacc_used: 'detail.valuation.waccUsed',
  fcf_periods_analyzed: 'detail.valuation.fcfPeriods',
};

export function ValuationDetail({ reasoning }: { reasoning: any }) {
  const t = useAutoTraderT();

  if (!reasoning || typeof reasoning !== 'object') return null;

  const sections: { key: string; titleKey: AutoTraderKey }[] = [
    { key: 'dcf_analysis', titleKey: 'detail.valuation.dcf' },
    { key: 'owner_earnings_analysis', titleKey: 'detail.valuation.ownerEarnings' },
    { key: 'ev_ebitda_analysis', titleKey: 'detail.valuation.evEbitda' },
    { key: 'residual_income_analysis', titleKey: 'detail.valuation.residualIncome' },
  ];

  return (
    <div key="valuation-analysis" style={{ marginTop: 6 }}>
      <strong>{t('detail.valuation.title')}</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
        {sections.map(sec => {
          const detail = reasoning[sec.key];
          if (!detail) return null;
          const secSig = detail.signal;
          const icon = secSig === 'bullish' ? '🟢' : secSig === 'bearish' ? '🔴' : '⚪';
          const sigText = secSig === 'bullish' ? t('detail.bullish') : secSig === 'bearish' ? t('detail.bearish') : t('detail.neutral');
          return (
            <div key={sec.key} style={{ ...COL_SUNKEN, padding: '4px 6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{t(sec.titleKey)}</strong>
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
            <div style={{ marginBottom: 4 }}><strong>{t('detail.valuation.dcfScenarios')}</strong></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: '0.95em', color: '#111' }}>
              {Object.entries(reasoning.dcf_scenario_analysis).map(([mKey, mVal]) => (
                 <span key={mKey}>
                   <span style={{color: '#666', marginRight: 2}}>{VALUATION_I18N[mKey] ? t(VALUATION_I18N[mKey]) : mKey.replace(/_/g, ' ')}:</span>
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

import React from 'react';
import { COL_SUNKEN } from '@/lib/theme/win98';
import { useAutoTraderT, type AutoTraderKey } from '@/lib/i18n';

const GROWTH_I18N: Record<string, AutoTraderKey> = {
  score: 'detail.score',
  revenue_growth: 'detail.growth.revenueGrowth',
  revenue_trend: 'detail.growth.revenueTrend',
  eps_growth: 'detail.growth.epsGrowth',
  eps_trend: 'detail.growth.epsTrend',
  fcf_growth: 'detail.growth.fcfGrowth',
  fcf_trend: 'detail.growth.fcfTrend',
  peg_ratio: 'detail.growth.pegRatio',
  price_to_sales_ratio: 'detail.growth.priceToSales',
  gross_margin: 'detail.growth.grossMargin',
  gross_margin_trend: 'detail.growth.grossMarginTrend',
  operating_margin: 'detail.growth.operatingMargin',
  operating_margin_trend: 'detail.growth.operatingMarginTrend',
  net_margin: 'detail.growth.netMargin',
  net_margin_trend: 'detail.growth.netMarginTrend',
  net_flow_ratio: 'detail.growth.netFlowRatio',
  buys: 'detail.growth.buys',
  sells: 'detail.growth.sells',
  debt_to_equity: 'detail.growth.debtToEquity',
  current_ratio: 'detail.growth.currentRatio',
};

// Formato genérico para números
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

  return `${(value * 100).toFixed(1)}%`;
};

export function GrowthDetail({ reasoning }: { reasoning: any }) {
  const t = useAutoTraderT();

  if (!reasoning || typeof reasoning !== 'object') return null;

  const sections: { key: string; titleKey: AutoTraderKey }[] = [
    { key: 'historical_growth', titleKey: 'detail.growth.historical' },
    { key: 'growth_valuation', titleKey: 'detail.growth.valuation' },
    { key: 'margin_expansion', titleKey: 'detail.growth.margins' },
    { key: 'insider_conviction', titleKey: 'detail.growth.insiderConviction' },
    { key: 'financial_health', titleKey: 'detail.growth.financialHealth' },
  ];

  return (
    <div key="growth-analysis" style={{ marginTop: 6 }}>
      <strong>{t('detail.growth.title')}</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
        {sections.map(sec => {
          const detail = reasoning[sec.key];
          if (!detail) return null;

          let scoreComponent = null;
          if (detail.score !== undefined) {
             const scr = detail.score;
             const color = scr >= 0.6 ? '#006600' : scr <= 0.4 ? '#990000' : '#444444';
             scoreComponent = <span style={{ fontWeight: 'bold', color }}>{t('detail.score')}: {Math.round(scr * 100)}%</span>;
          }

          return (
            <div key={sec.key} style={{ ...COL_SUNKEN, padding: '4px 6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong>{t(sec.titleKey)}</strong>
                {scoreComponent}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: '0.95em', color: '#111' }}>
                {Object.entries(detail).filter(([k]) => k !== 'score').map(([mKey, mVal]) => (
                   <span key={mKey}>
                     <span style={{color: '#666', marginRight: 2}}>{GROWTH_I18N[mKey] ? t(GROWTH_I18N[mKey]) : mKey.replace(/_/g, ' ')}:</span>
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
              <strong>{t('detail.growth.finalConclusion')}</strong>
              <span style={{ fontWeight: 'bold' }}>
                 {reasoning.final_analysis.signal === 'bullish' ? `🟢 ${t('detail.bullish')}` :
                  reasoning.final_analysis.signal === 'bearish' ? `🔴 ${t('detail.bearish')}` : `⚪ ${t('detail.neutral')}`}
                 {' '}({Math.round(reasoning.final_analysis.confidence || 0)}%)
              </span>
            </div>
            <div style={{ fontSize: '0.95em', color: '#333', marginTop: 2 }}>
              {t('detail.growth.weightedScore')} {Math.round((reasoning.final_analysis.weighted_score || 0) * 100)}/100
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

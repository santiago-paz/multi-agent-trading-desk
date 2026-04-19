import React from 'react';
import { COL_SUNKEN } from '@/lib/theme/win98';
import { useAutoTraderT, type AutoTraderKey } from '@/lib/i18n';

const METRIC_I18N: Record<string, AutoTraderKey> = {
  adx: 'detail.technical.adx',
  trend_strength: 'detail.technical.trendStrength',
  z_score: 'detail.technical.zScore',
  price_vs_bb: 'detail.technical.priceVsBb',
  rsi_14: 'detail.technical.rsi14',
  rsi_28: 'detail.technical.rsi28',
  momentum_1m: 'detail.technical.momentum1m',
  momentum_3m: 'detail.technical.momentum3m',
  momentum_6m: 'detail.technical.momentum6m',
  volume_momentum: 'detail.technical.volumeMomentum',
  historical_volatility: 'detail.technical.historicalVolatility',
  volatility_regime: 'detail.technical.volatilityRegime',
  volatility_z_score: 'detail.technical.volatilityZScore',
  atr_ratio: 'detail.technical.atrRatio',
  hurst_exponent: 'detail.technical.hurstExponent',
  skewness: 'detail.technical.skewness',
  kurtosis: 'detail.technical.kurtosis',
};

export function TechnicalDetail({ reasoning }: { reasoning: any }) {
  const t = useAutoTraderT();

  if (!reasoning || typeof reasoning !== 'object') return null;

  const sections: { key: string; titleKey: AutoTraderKey }[] = [
    { key: 'trend_following', titleKey: 'detail.technical.trendFollowing' },
    { key: 'mean_reversion', titleKey: 'detail.technical.meanReversion' },
    { key: 'momentum', titleKey: 'detail.technical.momentum' },
    { key: 'volatility', titleKey: 'detail.technical.volatility' },
    { key: 'statistical_arbitrage', titleKey: 'detail.technical.statArb' },
  ];

  return (
    <div key="tech-analysis" style={{ marginTop: 6 }}>
      <strong>{t('detail.technical.title')}</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
        {sections.map(sec => {
          const detail = reasoning[sec.key];
          if (!detail) return null;
          const secSig = detail.signal;
          const icon = secSig === 'bullish' ? '🟢' : secSig === 'bearish' ? '🔴' : '⚪';
          const sigText = secSig === 'bullish' ? t('detail.bullish') : secSig === 'bearish' ? t('detail.bearish') : t('detail.neutral');
          return (
            <div key={sec.key} style={{ ...COL_SUNKEN, padding: '4px 6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: detail.metrics ? 4 : 0 }}>
                <strong>{t(sec.titleKey)}</strong>
                <span style={{ fontWeight: 'bold' }}>{icon} {sigText} ({Math.round(detail.confidence || 0)}%)</span>
              </div>
              {detail.metrics && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: '0.95em', color: '#111' }}>
                  {Object.entries(detail.metrics).map(([mKey, mVal]) => (
                     <span key={mKey}>
                       <span style={{color: '#666', marginRight: 2}}>{METRIC_I18N[mKey] ? t(METRIC_I18N[mKey]) : mKey.replace(/_/g, ' ')}:</span>
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

import React from 'react';
import { COL_SUNKEN } from '@/lib/theme/win98';
import { useAutoTraderT, type AutoTraderKey } from '@/lib/i18n';

export function FundamentalsDetail({ reasoning }: { reasoning: any }) {
  const t = useAutoTraderT();

  if (!reasoning || typeof reasoning !== 'object') return null;

  const sections: { key: string; titleKey: AutoTraderKey }[] = [
    { key: 'profitability_signal', titleKey: 'detail.fundamentals.profitability' },
    { key: 'growth_signal', titleKey: 'detail.fundamentals.growth' },
    { key: 'financial_health_signal', titleKey: 'detail.fundamentals.financialHealth' },
    { key: 'price_ratios_signal', titleKey: 'detail.fundamentals.priceRatios' },
  ];

  return (
    <div key="fundamentals-analysis" style={{ marginTop: 6 }}>
      <strong>{t('detail.fundamentals.title')}</strong>
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

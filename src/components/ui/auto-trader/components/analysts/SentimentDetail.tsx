import React from 'react';
import { COL_SUNKEN, COLOR_LINK } from '@/lib/theme/win98';
import { useAutoTraderT, type AutoTraderKey } from '@/lib/i18n';

const SENTIMENT_I18N: Record<string, AutoTraderKey> = {
  total_trades: 'detail.sentiment.totalTrades',
  bullish_trades: 'detail.sentiment.bullishTrades',
  bearish_trades: 'detail.sentiment.bearishTrades',
  total_articles: 'detail.sentiment.totalArticles',
  bullish_articles: 'detail.sentiment.bullishArticles',
  bearish_articles: 'detail.sentiment.bearishArticles',
  neutral_articles: 'detail.sentiment.neutralArticles',
  weight: 'detail.sentiment.weight',
  weighted_bullish: 'detail.sentiment.weightedBullish',
  weighted_bearish: 'detail.sentiment.weightedBearish',
};

export function SentimentDetail({ reasoning }: { reasoning: any }) {
  const t = useAutoTraderT();

  if (!reasoning || typeof reasoning !== 'object') return null;

  const sections: { key: string; titleKey: AutoTraderKey }[] = [
    { key: 'insider_trading', titleKey: 'detail.sentiment.insiderTrading' },
    { key: 'news_sentiment', titleKey: 'detail.sentiment.newsSentiment' },
  ];

  return (
    <div key="sentiment-analysis" style={{ marginTop: 6 }}>
      <strong>{t('detail.sentiment.title')}</strong>
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
                       <span style={{color: '#666', marginRight: 2}}>{SENTIMENT_I18N[mKey] ? t(SENTIMENT_I18N[mKey]) : mKey.replace(/_/g, ' ')}:</span>
                       {typeof mVal === 'number' ? (Number.isInteger(mVal) ? mVal : (mVal as number).toFixed(2)) : String(mVal)}
                     </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {reasoning.combined_analysis && (
          <div key="combined" style={{ ...COL_SUNKEN, padding: '4px 6px', marginTop: '2px', backgroundColor: '#e8ecef' }}>
            <div style={{ fontSize: '1em' }}>
              <strong>{t('detail.conclusion')}</strong> {reasoning.combined_analysis.signal_determination === 'Bullish based on weighted signal comparison' ? t('detail.sentiment.conclusionBullish') :
                reasoning.combined_analysis.signal_determination === 'Bearish based on weighted signal comparison' ? t('detail.sentiment.conclusionBearish') :
                reasoning.combined_analysis.signal_determination === 'Neutral based on weighted signal comparison' ? t('detail.sentiment.conclusionNeutral') :
                reasoning.combined_analysis.signal_determination}
            </div>
          </div>
        )}
        {reasoning.news_sentiment?.news_titles && Array.isArray(reasoning.news_sentiment.news_titles) && reasoning.news_sentiment.news_titles.length > 0 && (
          <div key="news_titles" style={{ marginTop: 4 }}>
            <strong>{t('detail.sentiment.newsAnalyzed')}</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyleType: 'none', color: '#333' }}>
              {reasoning.news_sentiment.news_titles.map((n: any, idx: number) => {
                const sent = n.sentiment?.toLowerCase() || '';
                const icon = sent === 'positive' ? '🟢' : sent === 'negative' ? '🔴' : '⚪';
                return (
                  <li key={idx} style={{ marginBottom: 4, textIndent: -16, paddingLeft: 16 }}>
                    {icon}{' '}
                    {n.url ? (
                      <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ color: COLOR_LINK, textDecoration: 'underline' }}>
                        {n.title}
                      </a>
                    ) : (
                      n.title
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

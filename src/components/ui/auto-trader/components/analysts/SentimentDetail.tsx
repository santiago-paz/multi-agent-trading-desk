import React from 'react';
import { COL_SUNKEN, COLOR_LINK } from '@/lib/theme/win98';

const SENTIMENT_LABELS: Record<string, string> = {
  total_trades: 'Total Op. Insiders',
  bullish_trades: 'Compras Insiders',
  bearish_trades: 'Ventas Insiders',
  total_articles: 'Noticias Totales',
  bullish_articles: 'Noticias Positivas',
  bearish_articles: 'Noticias Negativas',
  neutral_articles: 'Noticias Neutrales',
  weight: 'Peso Relativo',
  weighted_bullish: 'Impacto Alcista',
  weighted_bearish: 'Impacto Bajista'
};

export function SentimentDetail({ reasoning }: { reasoning: any }) {
  if (!reasoning || typeof reasoning !== 'object') return null;

  return (
    <div key="sentiment-analysis" style={{ marginTop: 6 }}>
      <strong>Análisis de Sentimiento Detallado:</strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
        {[
          { key: 'insider_trading', title: '💼 Operaciones de Insiders (CEOs/Directores)' },
          { key: 'news_sentiment', title: '📰 Sentimiento de Noticias' },
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: '0.85em', color: '#111' }}>
                  {Object.entries(detail.metrics).map(([mKey, mVal]) => (
                     <span key={mKey}>
                       <span style={{color: '#666', marginRight: 2}}>{SENTIMENT_LABELS[mKey] || mKey.replace(/_/g, ' ')}:</span>
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
            <div style={{ fontSize: '0.9em' }}>
              <strong>Conclusión:</strong> {reasoning.combined_analysis.signal_determination === 'Bullish based on weighted signal comparison' ? 'Alcista basado en comparación de señales.' :
                reasoning.combined_analysis.signal_determination === 'Bearish based on weighted signal comparison' ? 'Bajista basado en comparación de señales.' :
                reasoning.combined_analysis.signal_determination === 'Neutral based on weighted signal comparison' ? 'Neutral basado en señales mixtas.' :
                reasoning.combined_analysis.signal_determination}
            </div>
          </div>
        )}
        {reasoning.news_sentiment?.news_titles && Array.isArray(reasoning.news_sentiment.news_titles) && reasoning.news_sentiment.news_titles.length > 0 && (
          <div key="news_titles" style={{ marginTop: 4 }}>
            <strong>Noticias analizadas:</strong>
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

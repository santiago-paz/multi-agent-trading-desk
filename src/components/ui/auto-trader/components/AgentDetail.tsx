import React from 'react';
import { COLOR_LINK, COL_SUNKEN } from '@/lib/theme/win98';

export function AgentDetail({ detail, ticker }: { detail: string | undefined; ticker?: string }) {
  if (!detail) return null;
  
  try {
    const trimmed = detail.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const data = JSON.parse(trimmed);
      let info = null;
      
      const keys = Object.keys(data);
      if (ticker && data[ticker] && typeof data[ticker] === 'object') {
        info = data[ticker];
      } else if (keys.length === 1 && data[keys[0]] && typeof data[keys[0]] === 'object') {
        info = data[keys[0]];
      } else {
        info = data;
      }
      
      const signal = info.signal || info.action;
      const confidence = info.confidence;
      const reasoning = info.reasoning || data.reasoning;
      
      let signalText = signal;
      if (typeof signal === 'string') {
        const s = String(signal).toLowerCase();
        if (s === 'bullish' || s === 'buy') signalText = '🟢 Alcista';
        else if (s === 'bearish' || s === 'sell') signalText = '🔴 Bajista';
        else if (s === 'neutral' || s === 'hold') signalText = '⚪ Neutral';
      }
      
      const rows = [];
      if (signalText) {
        rows.push(<div key="signal"><strong>Señal:</strong> {signalText} {confidence !== undefined ? `(Confianza: ${Math.round(confidence)}%)` : ''}</div>);
      }
      
      if (info.news_titles && Array.isArray(info.news_titles) && info.news_titles.length > 0) {
        rows.push(
          <div key="news" style={{ marginTop: 6 }}>
            <strong>Noticias analizadas:</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyleType: 'none', color: '#333' }}>
              {info.news_titles.map((n: any, idx: number) => {
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
        );
      } else if (reasoning && typeof reasoning === 'object' && !Array.isArray(reasoning)) {
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
        rows.push(
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
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: '0.85em', color: '#111' }}>
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
      } else if (reasoning && typeof reasoning === 'string') {
        rows.push(<div key="reasoning" style={{ marginTop: 4 }}><strong>Resumen:</strong> {reasoning}</div>);
      }
      
      // If we parsed successfully and generated human UI, return it.
      if (rows.length > 0) {
        return <div style={{ margin: '4px 0 0 12px' }}>{rows}</div>;
      }
    }
  } catch (e) {
    // Fall back below if not valid JSON
  }
  
  if (detail.includes('\n')) {
     return <div style={{ margin: '4px 0 0 12px', whiteSpace: 'pre-wrap' }}>{detail}</div>;
  }
  
  return <span style={{ marginLeft: 4 }}>{detail}</span>;
}

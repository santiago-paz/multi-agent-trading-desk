import React from 'react';
import { COLOR_LINK } from '@/lib/theme/win98';
import { TechnicalDetail, SentimentDetail, ValuationDetail, GrowthDetail, FundamentalsDetail, WarrenBuffettDetail, StanleyDruckenmillerDetail } from './analysts';

export function AgentDetail({ detail, ticker, agent, status }: { detail: string | undefined; ticker?: string; agent?: string; status?: string }) {
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
      let reasoning = info.reasoning || data.reasoning;

      // Si el objeto principal es el reasoning en sí (no está envuelto en key "reasoning")
      if (!reasoning && typeof info === 'object' && info !== null) {
        if ('trend_following' in info || 'insider_trading' in info || 'dcf_analysis' in info || 'owner_earnings_analysis' in info || 'historical_growth' in info || 'profitability_signal' in info) {
          reasoning = info;
        }
      }
      
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
        if ('trend_following' in reasoning) {
          rows.push(<TechnicalDetail key="tech-detail" reasoning={reasoning} />);
        } else if ('insider_trading' in reasoning) {
          rows.push(<SentimentDetail key="sent-detail" reasoning={reasoning} />);
        } else if ('dcf_analysis' in reasoning || 'owner_earnings_analysis' in reasoning || 'ev_ebitda_analysis' in reasoning || 'residual_income_analysis' in reasoning) {
          rows.push(<ValuationDetail key="val-detail" reasoning={reasoning} />);
        } else if ('historical_growth' in reasoning || 'growth_valuation' in reasoning) {
          rows.push(<GrowthDetail key="growth-detail" reasoning={reasoning} />);
        } else if ('profitability_signal' in reasoning || 'financial_health_signal' in reasoning) {
          rows.push(<FundamentalsDetail key="fundamentals-detail" reasoning={reasoning} />);
        } else {
          // Si es un objeto pero no es ninguno de los analistas conocidos, imprimimos como JSON formateado
          rows.push(
            <div key="json-fallback" style={{ marginTop: 4 }}>
              <strong>Detalles adicionales:</strong>
              <pre style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap', fontSize: '0.85em', color: '#333' }}>
                {JSON.stringify(reasoning, null, 2)}
              </pre>
            </div>
          );
        }
      } else if (reasoning && typeof reasoning === 'string') {
        if ((agent === 'warren_buffett_agent' || agent === 'warren_buffett')) {
          rows.push(<WarrenBuffettDetail key="warren-detail" reasoning={reasoning} />);
        } else if ((agent === 'stanley_druckenmiller_agent' || agent === 'stanley_druckenmiller')) {
          rows.push(<StanleyDruckenmillerDetail key="stanley-detail" reasoning={reasoning} />);
        } else {
          rows.push(<div key="reasoning" style={{ marginTop: 4 }}><strong>Resumen:</strong> {reasoning}</div>);
        }
      }
      
      // If we parsed successfully and generated human UI, return it.
      if (rows.length > 0) {
        return <div style={{ margin: '4px 0 0 12px' }}>{rows}</div>;
      }
    }
  } catch (e) {
    // Fall back below if not valid JSON
  }
  
  // Fall back below if not valid JSON or plain text
  if ((agent === 'warren_buffett_agent' || agent === 'warren_buffett') && status === 'ok') {
    return (
      <div style={{ margin: '4px 0 0 12px' }}>
        <WarrenBuffettDetail reasoning={detail} />
      </div>
    );
  }

  if ((agent === 'stanley_druckenmiller_agent' || agent === 'stanley_druckenmiller') && status === 'ok') {
    return (
      <div style={{ margin: '4px 0 0 12px' }}>
        <StanleyDruckenmillerDetail reasoning={detail} />
      </div>
    );
  }

  if (detail.includes('\n')) {
     return <div style={{ margin: '4px 0 0 12px', whiteSpace: 'pre-wrap' }}>{detail}</div>;
  }
  
  return <span style={{ marginLeft: 4 }}>{detail}</span>;
}

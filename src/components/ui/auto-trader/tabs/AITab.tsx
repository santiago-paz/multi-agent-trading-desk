import React, { useRef, useEffect } from 'react';
import { FONT, COL_HEADER_BASE, COL_RAISED, CELL, CELL_RIGHT, COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY } from '@/lib/theme/win98';
import { LogEntry, Phase, AgentSignal, Decision } from '../types';
import { AgentDetail } from '../components/AgentDetail';
import { LogIcon } from '../components/LogIcon';
import { fmtARS2 } from '../utils';

interface AITabProps {
  phase: Phase;
  logs: LogEntry[];
  isAnalyzing: boolean;
  progress: number;
  analystSignals: Record<string, Record<string, AgentSignal>> | null;
  candidateDecisions: Record<string, Decision> | null;
  arsPrices: Record<string, number>;
}

export function AITab({
  phase,
  logs,
  isAnalyzing,
  progress,
  analystSignals,
  candidateDecisions,
  arsPrices
}: AITabProps) {
  const logBodyRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    if (autoScrollRef.current && logBodyRef.current) {
      logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
      <div className="win98-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {phase === 'idle' && logs.length === 0 ? (
          <div style={{ ...FONT, padding: 16, textAlign: 'center', color: COLOR_SECONDARY }}>
            No hay datos de análisis. Configure los parámetros y presione &quot;Analizar&quot; en la pestaña de Configuración.
          </div>
        ) : (
          <>
            {logs.length > 0 && (
              <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <legend>Progreso {isAnalyzing && `(${progress}%)`}</legend>
                <div 
                  ref={logBodyRef} 
                  className="sunken-panel win98-scrollbar" 
                  style={{ flex: 1, overflow: 'auto', padding: 4, margin: 0 }}
                  onScroll={(e) => {
                    const target = e.target as HTMLDivElement;
                    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 10;
                    autoScrollRef.current = isNearBottom;
                  }}
                >
                  {logs.map(l => (
                    <div key={l.id} style={{ ...FONT, display: 'flex', gap: 4, lineHeight: '16px' }}>
                      <LogIcon status={l.status} />
                      {l.agent ? (
                        <span style={{ display: 'block', paddingTop: 4 }}>
                          <strong style={{ color: '#000080' }}>{l.agent.replace(/_/g, ' ')}</strong>
                          {l.ticker && <span style={{ color: '#800000', fontWeight: 'bold' }}> [{l.ticker}]</span>}
                          <span>:</span>
                          <AgentDetail detail={l.detail} ticker={l.ticker} />
                        </span>
                      ) : (
                        <span>{l.text}</span>
                      )}
                    </div>
                  ))}
                </div>
              </fieldset>
            )}

            {analystSignals && (
              <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <legend>Señales de Analistas</legend>
                <div className="sunken-panel win98-scrollbar" style={{ flex: 1, overflow: 'auto', margin: 0 }}>
                  <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Ticker</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Agente</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Señal</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Conf.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(analystSignals)
                        .filter(([agent]) => !agent.startsWith('risk_management'))
                        .flatMap(([agent, tickers]) =>
                          Object.entries(tickers).map(([ticker, sig]) => ({ agent, ticker, sig }))
                        )
                        .sort((a, b) => a.ticker.localeCompare(b.ticker) || a.agent.localeCompare(b.agent))
                        .map(({ agent, ticker, sig }, i) => (
                          <tr key={i} style={{
                            backgroundColor: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                            cursor: 'default',
                          }}>
                            <td style={CELL}>{ticker}</td>
                            <td style={CELL}>{agent.replace(/_/g, ' ')}</td>
                            <td style={{
                              ...CELL,
                              color: sig.signal === 'bullish' ? COLOR_POSITIVE
                                : sig.signal === 'bearish' ? COLOR_NEGATIVE : COLOR_SECONDARY,
                            }}>
                              {sig.signal}
                            </td>
                            <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>{sig.confidence}%</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </fieldset>
            )}

            {candidateDecisions && Object.keys(candidateDecisions).length > 0 && (
              <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <legend>Sugerencias AI (fuera de portfolio)</legend>
                <div className="sunken-panel win98-scrollbar" style={{ flex: 1, overflow: 'auto', margin: 0 }}>
                  <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Ticker</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Acción</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Conf.</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Precio</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Razón</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(candidateDecisions)
                        .sort(([, a], [, b]) => b.confidence - a.confidence)
                        .map(([ticker, dec], i) => (
                          <tr key={ticker} style={{
                            backgroundColor: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                            cursor: 'default',
                          }}>
                            <td style={CELL}>{ticker}</td>
                            <td style={{
                              ...CELL,
                              color: dec.action === 'buy' ? COLOR_POSITIVE
                                : dec.action === 'sell' ? COLOR_NEGATIVE : COLOR_SECONDARY,
                              fontWeight: dec.action !== 'hold' ? 'bold' : 'normal',
                            }}>
                              {dec.action.toUpperCase()}
                            </td>
                            <td style={CELL_RIGHT}>{dec.confidence}%</td>
                            <td style={CELL_RIGHT}>
                              {arsPrices[ticker] ? `$${fmtARS2(arsPrices[ticker])}` : '—'}
                            </td>
                            <td style={{ ...CELL, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', borderRight: 'none' }}
                                title={dec.reasoning}>
                              {dec.reasoning}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </fieldset>
            )}
          </>
        )}
      </div>

      {logs.length > 0 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexShrink: 0, paddingTop: 6, borderTop: '1px solid #dfdfdf' }}>
          <button onClick={() => {
            const text = logs.map(l => {
              const parts = [`[${l.status.toUpperCase()}]`];
              if (l.agent) parts.push(l.agent.replace(/_/g, ' '));
              if (l.ticker) parts.push(`[${l.ticker}]`);
              const header = parts.join(' ');
              const body = l.detail || l.text;
              return `${header}\n${body}`;
            }).join('\n\n');
            navigator.clipboard.writeText(text).then(() => alert('Logs copiados al portapapeles'));
          }}>
            Copiar Logs
          </button>
        </div>
      )}
    </div>
  );
}

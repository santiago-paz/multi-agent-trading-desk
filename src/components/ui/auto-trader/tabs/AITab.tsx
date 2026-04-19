import React, { useRef, useEffect } from 'react';
import { FONT, COL_HEADER_BASE, COL_RAISED, CELL, CELL_RIGHT, COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY } from '@/lib/theme/win98';
import { LogEntry, Phase, AgentSignal, Decision } from '../types';
import { TickerAccordion } from '../components/TickerAccordion';
import { fmtARS2 } from '../utils';
import { useAutoTraderT } from '@/lib/i18n';

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
  const t = useAutoTraderT();
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
            {t('ai.empty')}
          </div>
        ) : (
          <>
            {logs.length > 0 && (
              <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <legend>{t('ai.progress')} {isAnalyzing && `(${progress}%)`}</legend>
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
                  <TickerAccordion logs={logs} />
                </div>
              </fieldset>
            )}

            {analystSignals && (
              <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <legend>{t('ai.signals.title')}</legend>
                <div className="sunken-panel win98-scrollbar" style={{ flex: 1, overflow: 'auto', margin: 0 }}>
                  <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>{t('col.ticker')}</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>{t('col.agent')}</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>{t('col.signal')}</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>{t('col.confidence')}</th>
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
                <legend>{t('ai.candidates.title')}</legend>
                <div className="sunken-panel win98-scrollbar" style={{ flex: 1, overflow: 'auto', margin: 0 }}>
                  <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>{t('col.ticker')}</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>{t('col.action')}</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>{t('col.confidence')}</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>{t('col.price')}</th>
                        <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>{t('col.reason')}</th>
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
            navigator.clipboard.writeText(text).then(() => alert(t('ai.logs.copied')));
          }}>
            {t('ai.logs.copy')}
          </button>
        </div>
      )}
    </div>
  );
}

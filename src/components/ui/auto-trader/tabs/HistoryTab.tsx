import React, { useState } from 'react';
import {
  FONT, COL_HEADER_BASE, COL_RAISED, CELL, CELL_RIGHT,
  COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY,
} from '@/lib/theme/win98';
import { useHistoryStore } from '@/lib/store/history-store';
import type { HistoricalRun } from '../types';
import { fmtARS, fmtARS2 } from '../utils';
import { useAutoTraderT } from '@/lib/i18n';

interface HistoryTabProps {
  onRerun: (agentKeys: string[]) => void;
  isAnalyzing: boolean;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function RunDetail({ run }: { run: HistoricalRun }) {
  const t = useAutoTraderT();
  const [tab, setTab] = useState<'plan' | 'signals'>('plan');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, ...FONT }}>
        <button
          style={tab === 'plan' ? { fontWeight: 'bold' } : undefined}
          onClick={() => setTab('plan')}
        >
          {t('history.tabs.plan')}
        </button>
        <button
          style={tab === 'signals' ? { fontWeight: 'bold' } : undefined}
          onClick={() => setTab('signals')}
        >
          {t('history.tabs.signals')}
        </button>
      </div>

      {tab === 'plan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Sells */}
          {run.plan.sells.length > 0 && (
            <div>
              <div style={{ ...FONT, fontWeight: 'bold', color: COLOR_NEGATIVE, marginBottom: 2 }}>
                {t('history.sells.title', { count: run.plan.sells.length })}
              </div>
              <div className="sunken-panel" style={{ margin: 0 }}>
                <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>{t('col.ticker')}</th>
                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right' }}>{t('col.qty')}</th>
                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right' }}>{t('col.price')}</th>
                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right' }}>{t('col.confidence')}</th>
                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>{t('col.reason')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.plan.sells.map((o, i) => (
                      <tr key={o.ticker} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f0f0f0' }}>
                        <td style={CELL}>{o.ticker}</td>
                        <td style={CELL_RIGHT}>{o.quantity}</td>
                        <td style={CELL_RIGHT}>${fmtARS2(o.priceArs)}</td>
                        <td style={CELL_RIGHT}>{o.confidence}%</td>
                        <td style={{ ...CELL, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', borderRight: 'none' }} title={o.reasoning}>
                          {o.reasoning}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ ...FONT, color: COLOR_SECONDARY, marginTop: 2 }}>
                {t('history.sells.summary', { gross: `$${fmtARS(run.plan.totalSellVolume)}`, net: `$${fmtARS(run.plan.estimatedSellProceeds)}` })}
              </div>
            </div>
          )}

          {/* Buys */}
          {run.plan.buys.length > 0 && (
            <div>
              <div style={{ ...FONT, fontWeight: 'bold', color: COLOR_POSITIVE, marginBottom: 2 }}>
                {t('history.buys.title', { count: run.plan.buys.length })}
              </div>
              <div className="sunken-panel" style={{ margin: 0 }}>
                <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>{t('col.ticker')}</th>
                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right' }}>{t('col.qty')}</th>
                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right' }}>{t('col.price')}</th>
                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right' }}>{t('col.confidence')}</th>
                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>{t('col.reason')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.plan.buys.map((o, i) => (
                      <tr key={o.ticker} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f0f0f0' }}>
                        <td style={CELL}>{o.ticker}</td>
                        <td style={CELL_RIGHT}>{o.quantity}</td>
                        <td style={CELL_RIGHT}>${fmtARS2(o.priceArs)}</td>
                        <td style={CELL_RIGHT}>{o.confidence}%</td>
                        <td style={{ ...CELL, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', borderRight: 'none' }} title={o.reasoning}>
                          {o.reasoning}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ ...FONT, color: COLOR_SECONDARY, marginTop: 2 }}>
                {t('history.buys.summary', { gross: `$${fmtARS(run.plan.totalBuyVolume)}` })}
              </div>
            </div>
          )}

          {run.plan.sells.length === 0 && run.plan.buys.length === 0 && (
            <div style={{ ...FONT, color: COLOR_SECONDARY }}>{t('history.noOps')}</div>
          )}

          {/* Execution results */}
          {run.executed && run.orderResults.length > 0 && (
            <div>
              <div style={{ ...FONT, fontWeight: 'bold', marginBottom: 2 }}>{t('history.executionResults')}</div>
              {run.orderResults.map((r, i) => (
                <div key={i} style={{ ...FONT, display: 'flex', gap: 4, lineHeight: '16px' }}>
                  <span style={{ color: r.success ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
                    {r.success ? '\u25A0' : '\u2715'}
                  </span>
                  <span style={{ color: r.side === 'sell' ? COLOR_NEGATIVE : COLOR_POSITIVE }}>
                    {r.side === 'sell' ? 'SELL' : 'BUY'}
                  </span>
                  <span>{r.ticker} x{r.quantity}</span>
                  <span style={{ color: COLOR_SECONDARY }}>— {r.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Snapshot */}
          <div style={{
            ...FONT, padding: '3px 6px', marginTop: 2,
            background: '#f8f8f0', border: '1px solid #dfdfdf',
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{t('history.snapshot.title')}</div>
            <div>{t('history.snapshot.balance', { balance: `$${fmtARS(run.snapshot.cashArs)}`, limit: `$${fmtARS(run.snapshot.dailyLimit)}` })}</div>
            <div style={{ color: COLOR_SECONDARY }}>
              {t('history.snapshot.holdings')} {Object.entries(run.snapshot.holdings).map(([tk, q]) => `${tk}(${q})`).join(', ') || t('history.snapshot.empty')}
            </div>
          </div>

          {/* Warnings */}
          {run.plan.warnings.length > 0 && (
            <div>
              {run.plan.warnings.map((w, i) => (
                <div key={i} style={{ ...FONT, color: '#333', lineHeight: '18px', display: 'flex', gap: '6px' }}>
                  <span>⚠️</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'signals' && (
        <div className="sunken-panel" style={{ margin: 0 }}>
          <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>{t('col.ticker')}</th>
                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>{t('col.agent')}</th>
                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>{t('col.signal')}</th>
                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right' }}>{t('col.confidence')}</th>
                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>{t('col.decision')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(run.analystSignals)
                .filter(([agent]) => !agent.startsWith('risk_management'))
                .flatMap(([agent, tickers]) =>
                  Object.entries(tickers).map(([ticker, sig]) => ({ agent, ticker, sig }))
                )
                .sort((a, b) => a.ticker.localeCompare(b.ticker) || a.agent.localeCompare(b.agent))
                .map(({ agent, ticker, sig }, i) => {
                  const dec = run.decisions[ticker];
                  return (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f0f0f0' }}>
                      <td style={CELL}>{ticker}</td>
                      <td style={CELL}>{agent.replace(/_/g, ' ')}</td>
                      <td style={{
                        ...CELL,
                        color: sig.signal === 'bullish' ? COLOR_POSITIVE
                          : sig.signal === 'bearish' ? COLOR_NEGATIVE : COLOR_SECONDARY,
                      }}>
                        {sig.signal === 'bullish' ? t('history.signals.bullish') : sig.signal === 'bearish' ? t('history.signals.bearish') : t('history.signals.neutral')}
                      </td>
                      <td style={{ ...CELL_RIGHT }}>{sig.confidence}%</td>
                      <td style={{
                        ...CELL, borderRight: 'none',
                        color: dec?.action === 'buy' ? COLOR_POSITIVE
                          : dec?.action === 'sell' ? COLOR_NEGATIVE : COLOR_SECONDARY,
                        fontWeight: dec?.action !== 'hold' ? 'bold' : 'normal',
                      }}>
                        {dec ? dec.action.toUpperCase() : '—'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function HistoryTab({ onRerun, isAnalyzing }: HistoryTabProps) {
  const t = useAutoTraderT();
  const { runs, deleteRun, clearAll } = useHistoryStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
      <div className="win98-scrollbar" style={{ flex: 1, padding: 2, overflowY: 'auto', minHeight: 0 }}>
        {runs.length === 0 ? (
          <div style={{ ...FONT, padding: 16, textAlign: 'center', color: COLOR_SECONDARY }}>
            {t('history.empty')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {runs.map((run) => {
              const isExpanded = expandedId === run.id;
              const nSells = run.plan.sells.length;
              const nBuys = run.plan.buys.length;
              return (
                <fieldset key={run.id} style={{ margin: 0 }}>
                  <legend style={FONT}>{formatDate(run.timestamp)}</legend>
                  {/* Header row */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    onClick={() => setExpandedId(isExpanded ? null : run.id)}
                  >
                    <span style={{ ...FONT, fontFamily: 'monospace', width: 12 }}>{isExpanded ? '\u25BC' : '\u25B6'}</span>
                    <div style={{ ...FONT, flex: 1 }}>
                      <span>{t('history.summary', { agents: run.agentKeys.length, tickers: run.tickers.length })}</span>
                      <span style={{ margin: '0 6px' }}>—</span>
                      {nSells > 0 && <span style={{ color: COLOR_NEGATIVE }}>{nSells}V</span>}
                      {nSells > 0 && nBuys > 0 && <span> / </span>}
                      {nBuys > 0 && <span style={{ color: COLOR_POSITIVE }}>{nBuys}C</span>}
                      {nSells === 0 && nBuys === 0 && <span style={{ color: COLOR_SECONDARY }}>{t('history.noOpsShort')}</span>}
                      {run.executed && (
                        <span style={{ ...FONT, marginLeft: 6, color: COLOR_POSITIVE, fontWeight: 'bold' }}>
                          {t('history.executed')}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        disabled={isAnalyzing}
                        title={t('history.reanalyzeTitle')}
                        onClick={(e) => { e.stopPropagation(); onRerun(run.agentKeys); }}
                      >
                        {t('history.reanalyze')}
                      </button>
                      <button
                        title={t('history.deleteTitle')}
                        onClick={(e) => { e.stopPropagation(); deleteRun(run.id); }}
                      >
                        X
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ marginTop: 6, borderTop: '1px solid #c0c0c0', paddingTop: 6 }}>
                      <RunDetail run={run} />
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>
        )}
      </div>

      {runs.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0, paddingTop: 6, borderTop: '1px solid #dfdfdf' }}>
          <button onClick={() => { if (confirm(t('history.confirmClear'))) clearAll(); }}>
            {t('history.clearAll')}
          </button>
        </div>
      )}
    </div>
  );
}

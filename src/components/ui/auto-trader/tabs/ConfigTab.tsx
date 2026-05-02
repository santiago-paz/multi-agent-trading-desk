import React, { useState, useMemo, useRef } from 'react';
import { FONT, COL_HEADER_BASE, COL_RAISED, COL_SUNKEN, CELL, CELL_RIGHT, COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_DISABLED } from '@/lib/theme/win98';
import { AgentSelector } from '@/components/ui/AgentSelector';
import { fmtARS, fmtARS2 } from '../utils';
import { Agent, PortfolioSortKey } from '../types';
import { AI_MODELS, type AIModelId, isMarketOpen } from '../market-hours';
import { useAutoTraderT } from '@/lib/i18n';

interface ConfigTabProps {
  cashArs: number;
  comprometidoArs: number;
  totalPortfolioArs: number;
  effectiveMep: number;
  dailyLimit: number;
  setDailyLimit: (val: number) => void;
  modelName: AIModelId;
  setModelName: (val: AIModelId) => void;
  holdingTickers: string[];
  holdings: Record<string, number>;
  arsPrices: Record<string, number>;
  portfolioError: string | null;
  isLoadingPortfolio: boolean;
  commissionRate: number;
  agents: Agent[];
  selectedAgents: Set<string>;
  toggleAgent: (key: string) => void;
  selectAllAgents: () => void;
  selectNoAgents: () => void;
  isLoadingAgents: boolean;
  apiUrl: string;
  isAnalyzing: boolean;
  loadPortfolio: () => void;
  handleAnalyze: () => void;
  fmpTickers: string[];
  abortEngine: () => void;
}

export function ConfigTab({
  cashArs,
  comprometidoArs,
  totalPortfolioArs,
  effectiveMep,
  dailyLimit,
  setDailyLimit,
  modelName,
  setModelName,
  holdingTickers,
  holdings,
  arsPrices,
  portfolioError,
  isLoadingPortfolio,
  commissionRate,
  agents,
  selectedAgents,
  toggleAgent,
  selectAllAgents,
  selectNoAgents,
  isLoadingAgents,
  apiUrl,
  isAnalyzing,
  loadPortfolio,
  handleAnalyze,
  fmpTickers,
  abortEngine
}: ConfigTabProps) {
  const t = useAutoTraderT();
  const [pSortKey, setPSortKey] = useState<PortfolioSortKey>('ticker');
  const [pSortDir, setPSortDir] = useState<'asc' | 'desc'>('asc');
  const marketStatus = useMemo(() => isMarketOpen(), []);
  const helpRef = useRef<HTMLSpanElement>(null);
  const [helpPos, setHelpPos] = useState<{ top: number; left: number } | null>(null);

  const showHelp = () => {
    const el = helpRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setHelpPos({ top: r.bottom + 4, left: r.left });
  };
  const hideHelp = () => setHelpPos(null);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
      <div className="win98-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <legend>{t('config.portfolio.title')}</legend>
          <div style={{ ...FONT, padding: '2px 0 6px 0', display: 'flex', gap: 16, flexShrink: 0 }}>
            <div>
              <span>{t('config.portfolio.cash')}</span>
              <strong>${fmtARS(cashArs)} ARS</strong>
              {comprometidoArs > 0 && (
                <span style={{ color: COLOR_NEGATIVE, marginLeft: 8 }}>
                  {t('config.portfolio.committed', { amount: `$${fmtARS(comprometidoArs)}` })}
                </span>
              )}
              <span style={{ color: COLOR_SECONDARY, marginLeft: 8 }}>
                (~USD ${fmtARS(cashArs / effectiveMep)})
              </span>
            </div>
          </div>
          <div style={{ ...FONT, padding: '2px 0', borderTop: '1px solid #808080', borderBottom: '1px solid #ffffff', marginTop: 4, paddingTop: 4, display: 'flex', gap: 16, flexShrink: 0 }}>
            <div>
              <span>{t('config.portfolio.total')}</span>
              <strong>${fmtARS(totalPortfolioArs)} ARS</strong>
              <span style={{ color: COLOR_SECONDARY, marginLeft: 8 }}>
                (~USD ${fmtARS(totalPortfolioArs / effectiveMep)})
              </span>
            </div>
          </div>
          {holdingTickers.length > 0 ? (
            <div className="sunken-panel win98-scrollbar" style={{ margin: 0, flex: 1, overflow: 'auto', minHeight: 0 }}>
              <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    {([
                      { key: 'ticker' as PortfolioSortKey, label: t('col.ticker'), align: 'left' as const },
                      { key: 'qty' as PortfolioSortKey, label: t('col.qty'), align: 'right' as const },
                      { key: 'price' as PortfolioSortKey, label: t('col.price'), align: 'right' as const },
                      { key: 'priceUsd' as PortfolioSortKey, label: t('col.usd'), align: 'right' as const },
                      { key: 'valuation' as PortfolioSortKey, label: t('col.valuation'), align: 'right' as const },
                    ]).map((col) => {
                      const isActive = pSortKey === col.key;
                      const arrow = isActive ? (pSortDir === 'asc' ? ' ▲' : ' ▼') : '';
                      return (
                        <th
                          key={col.key}
                          onClick={() => {
                            if (pSortKey === col.key) setPSortDir(d => d === 'asc' ? 'desc' : 'asc');
                            else { setPSortKey(col.key); setPSortDir('asc'); }
                          }}
                          style={{
                            ...COL_HEADER_BASE,
                            textAlign: col.align,
                            ...(isActive ? COL_SUNKEN : COL_RAISED),
                            cursor: 'pointer',
                            position: 'sticky',
                            top: 0,
                            zIndex: 1,
                          }}
                        >
                          {col.label}{arrow}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[...holdingTickers].sort((a, b) => {
                    let va: string | number, vb: string | number;
                    const qtyA = holdings[a] ?? 0, qtyB = holdings[b] ?? 0;
                    const priceA = arsPrices[a] ?? 0, priceB = arsPrices[b] ?? 0;
                    switch (pSortKey) {
                      case 'ticker': va = a; vb = b; break;
                      case 'qty': va = qtyA; vb = qtyB; break;
                      case 'price': va = priceA; vb = priceB; break;
                      case 'priceUsd': va = priceA / effectiveMep; vb = priceB / effectiveMep; break;
                      case 'valuation': va = qtyA * priceA; vb = qtyB * priceB; break;
                    }
                    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
                    return pSortDir === 'asc' ? cmp : -cmp;
                  }).map((ticker, idx) => {
                    const qty = holdings[ticker] ?? 0;
                    const price = arsPrices[ticker] ?? 0;
                    const priceUsd = price / effectiveMep;
                    return (
                      <tr key={ticker} style={{
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0f0f0',
                        cursor: 'default',
                      }}>
                        <td style={CELL}>{ticker}</td>
                        <td style={CELL_RIGHT}>{qty}</td>
                        <td style={CELL_RIGHT}>${fmtARS2(price)}</td>
                        <td style={CELL_RIGHT}>${fmtARS2(priceUsd)}</td>
                        <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>${fmtARS(qty * price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ ...FONT, color: portfolioError ? COLOR_NEGATIVE : COLOR_DISABLED, padding: '4px 0' }}>
              {isLoadingPortfolio ? t('config.portfolio.loading') : portfolioError ? portfolioError : t('config.portfolio.empty')}
            </div>
          )}
        </fieldset>

        <fieldset style={{ margin: 0, flexShrink: 0 }}>
          <legend>{t('config.settings.title')}</legend>
          <div style={{ ...FONT, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 4, alignItems: 'center' }}>
            <label htmlFor="daily-limit" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              {t('config.settings.dailyLimit')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <input
                id="daily-limit"
                type="number"
                value={dailyLimit}
                onChange={e => setDailyLimit(Math.max(0, Number(e.target.value)))}
                style={{ width: 120, ...FONT }}
                disabled={isAnalyzing}
              />
              <span>ARS</span>
              <span style={{ color: COLOR_SECONDARY }}>
                (~USD ${fmtARS(dailyLimit / effectiveMep)})
              </span>
              <span
                ref={helpRef}
                role="img"
                aria-label={t('config.settings.helpAria')}
                onMouseEnter={showHelp}
                onMouseLeave={hideHelp}
                onFocus={showHelp}
                onBlur={hideHelp}
                tabIndex={0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 14,
                  height: 14,
                  border: '1px solid #808080',
                  borderTop: '1px solid #ffffff',
                  borderLeft: '1px solid #ffffff',
                  background: '#c0c0c0',
                  color: '#000080',
                  fontWeight: 'bold',
                  fontSize: 10,
                  lineHeight: 1,
                  cursor: 'help',
                  userSelect: 'none',
                }}
              >
                ?
              </span>
              {helpPos && (
                <div
                  role="tooltip"
                  style={{
                    ...FONT,
                    position: 'fixed',
                    top: Math.min(helpPos.top, window.innerHeight - 120),
                    left: Math.min(helpPos.left, window.innerWidth - 360),
                    width: 340,
                    padding: '4px 6px',
                    background: '#ffffe1',
                    color: '#000000',
                    border: '1px solid #000000',
                    boxShadow: '2px 2px 0 rgba(0,0,0,0.25)',
                    whiteSpace: 'normal',
                    lineHeight: 1.35,
                    zIndex: 10000,
                    pointerEvents: 'none',
                  }}
                >
                  {t('config.settings.dailyLimitHelp')}
                </div>
              )}
            </div>

            <span />
            <span style={{ color: COLOR_SECONDARY, fontStyle: 'italic' }}>
              {t('config.settings.dailyLimitHint')}
            </span>

            <label htmlFor="model-select" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              {t('config.settings.model')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <select
                id="model-select"
                value={modelName}
                onChange={e => setModelName(e.target.value as AIModelId)}
                style={{ ...FONT, width: 200 }}
                disabled={isAnalyzing}
              >
                {AI_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <span style={{ color: COLOR_SECONDARY }}>
                {t(AI_MODELS.find(m => m.id === modelName)?.descriptionKey as Parameters<typeof t>[0])}
              </span>
            </div>

            <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              {t('config.settings.commissionLabel')}
            </span>
            <span style={{ color: COLOR_SECONDARY }}>
              {t('config.settings.commissionValue', { rate: (commissionRate * 100).toFixed(1) })}
            </span>
          </div>
          {!marketStatus.open && (
            <div style={{
              ...FONT,
              marginTop: 6,
              padding: '3px 6px',
              background: '#ffffcc',
              border: '1px solid #808000',
              color: '#666600',
            }}>
              {t('config.settings.marketClosed', { reason: t(marketStatus.reasonKey as Parameters<typeof t>[0], marketStatus.reasonParams) })}
            </div>
          )}
        </fieldset>

        <div style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <AgentSelector
            agents={agents}
            selectedAgents={selectedAgents}
            onToggle={toggleAgent}
            onSelectAll={selectAllAgents}
            onSelectNone={selectNoAgents}
            isLoading={isLoadingAgents}
            disabled={isAnalyzing}
            errorText={t('config.agents.error', { url: apiUrl })}
            idPrefix="at-agent"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexShrink: 0, paddingTop: 6, borderTop: '1px solid #dfdfdf' }}>
        {isAnalyzing && (
          <button onClick={abortEngine} style={{ ...FONT, minWidth: 75 }}>{t('config.actions.cancel')}</button>
        )}
        <button onClick={loadPortfolio} disabled={isAnalyzing}>
          {t('config.actions.reload')}
        </button>
        <button
          className="default"
          onClick={handleAnalyze}
          disabled={isLoadingPortfolio || isLoadingAgents || isAnalyzing || selectedAgents.size === 0 || fmpTickers.length === 0}
        >
          {isAnalyzing ? t('config.actions.analyzing') : t('config.actions.analyze')}
        </button>
      </div>
    </div>
  );
}

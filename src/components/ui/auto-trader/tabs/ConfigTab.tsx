import React, { useState } from 'react';
import { FONT, COL_HEADER_BASE, COL_RAISED, COL_SUNKEN, CELL, CELL_RIGHT, COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_DISABLED } from '@/lib/theme/win98';
import { AgentSelector } from '@/components/ui/AgentSelector';
import { fmtARS, fmtARS2 } from '../utils';
import { Agent, PortfolioSortKey } from '../types';

interface ConfigTabProps {
  cashArs: number;
  comprometidoArs: number;
  totalPortfolioArs: number;
  effectiveMep: number;
  dailyLimit: number;
  setDailyLimit: (val: number) => void;
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
  const [pSortKey, setPSortKey] = useState<PortfolioSortKey>('ticker');
  const [pSortDir, setPSortDir] = useState<'asc' | 'desc'>('asc');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
      <div className="win98-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <legend>Portafolio Actual</legend>
          <div style={{ ...FONT, padding: '2px 0 6px 0', display: 'flex', gap: 16, flexShrink: 0 }}>
            <div>
              <span>Cash disponible: </span>
              <strong>${fmtARS(cashArs)} ARS</strong>
              {comprometidoArs > 0 && (
                <span style={{ color: COLOR_NEGATIVE, marginLeft: 8 }}>
                  (Comprometido: ${fmtARS(comprometidoArs)} ARS)
                </span>
              )}
              <span style={{ color: COLOR_SECONDARY, marginLeft: 8 }}>
                (~USD ${fmtARS(cashArs / effectiveMep)})
              </span>
            </div>
          </div>
          <div style={{ ...FONT, padding: '2px 0', borderTop: '1px solid #808080', borderBottom: '1px solid #ffffff', marginTop: 4, paddingTop: 4, display: 'flex', gap: 16, flexShrink: 0 }}>
            <div>
              <span>Total portfolio: </span>
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
                      { key: 'ticker' as PortfolioSortKey, label: 'Ticker', align: 'left' as const },
                      { key: 'qty' as PortfolioSortKey, label: 'Cant', align: 'right' as const },
                      { key: 'price' as PortfolioSortKey, label: 'Precio', align: 'right' as const },
                      { key: 'priceUsd' as PortfolioSortKey, label: 'USD', align: 'right' as const },
                      { key: 'valuation' as PortfolioSortKey, label: 'Valuación', align: 'right' as const },
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
              {isLoadingPortfolio ? 'Cargando...' : portfolioError ? portfolioError : 'Sin posiciones en CEDEARs'}
            </div>
          )}
        </fieldset>

        <fieldset style={{ margin: 0, flexShrink: 0 }}>
          <legend>Configuración</legend>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FONT }}>
            <div className="field-row">
              <label htmlFor="daily-limit">Límite plata nueva:</label>
              <input
                id="daily-limit"
                type="number"
                value={dailyLimit}
                onChange={e => setDailyLimit(Math.max(0, Number(e.target.value)))}
                style={{ width: 120, ...FONT }}
                disabled={isAnalyzing}
              />
            </div>
            <span>ARS</span>
            <span style={{ color: COLOR_SECONDARY, marginLeft: 8 }}>
              (~USD ${fmtARS(dailyLimit / effectiveMep)})
            </span>
            <span style={{ color: COLOR_SECONDARY, marginLeft: 16 }}>
              Comisión: {(commissionRate * 100).toFixed(1)}% por operación
            </span>
          </div>
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
            errorText={`No se pudo conectar al servidor AI Hedge Fund (${apiUrl})`}
            idPrefix="at-agent"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexShrink: 0, paddingTop: 6, borderTop: '1px solid #dfdfdf' }}>
        {isAnalyzing && (
          <button onClick={abortEngine}>Cancelar</button>
        )}
        <button onClick={loadPortfolio} disabled={isAnalyzing}>
          Recargar Portfolio
        </button>
        <button
          className="default"
          onClick={handleAnalyze}
          disabled={isLoadingPortfolio || isLoadingAgents || isAnalyzing || selectedAgents.size === 0 || fmpTickers.length === 0}
        >
          {isAnalyzing ? 'Analizando...' : 'Analizar'}
        </button>
      </div>
    </div>
  );
}

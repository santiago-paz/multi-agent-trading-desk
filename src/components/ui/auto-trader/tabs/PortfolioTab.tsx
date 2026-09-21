import React, { useState } from 'react';
import {
  FONT, COL_HEADER_BASE, COL_RAISED, COL_SUNKEN, CELL, CELL_RIGHT,
  COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_DISABLED,
} from '@/lib/theme/win98';
import { fmtARS, fmtARS2 } from '../utils';
import type { PortfolioSortKey } from '../types';
import { TickerCell } from '../components/TickerCell';
import { PAGE } from '../components/Page';
import type { MarketStatus } from '../market-hours';
import { useAutoTraderT } from '@/lib/i18n';

interface PortfolioTabProps {
  cashArs: number;
  comprometidoArs: number;
  totalPortfolioArs: number;
  effectiveMep: number;
  holdingTickers: string[];
  holdings: Record<string, number>;
  panelSymbols: string[];
  companyNames?: Record<string, string>;
  arsPrices: Record<string, number>;
  portfolioError: string | null;
  isLoadingPortfolio: boolean;
  market: MarketStatus;
  onCompanyDetail?: (symbol: string) => void;
}

const COLUMNS: { key: PortfolioSortKey; labelKey: 'col.ticker' | 'col.qty' | 'col.price' | 'col.usd' | 'col.valuation'; align: 'left' | 'right' }[] = [
  { key: 'ticker', labelKey: 'col.ticker', align: 'left' },
  { key: 'qty', labelKey: 'col.qty', align: 'right' },
  { key: 'price', labelKey: 'col.price', align: 'right' },
  { key: 'priceUsd', labelKey: 'col.usd', align: 'right' },
  { key: 'valuation', labelKey: 'col.valuation', align: 'right' },
];

/** Label column of the Account group box: right-aligned so the colons line up. */
const ROW_LABEL: React.CSSProperties = { ...FONT, textAlign: 'right', whiteSpace: 'nowrap' };
/** Dynamic read-only figure: status-field border (Sunken Outer only), right-aligned so the amounts line up. */
const FIGURE: React.CSSProperties = { ...FONT, display: 'inline-block', minWidth: 140, padding: '2px 6px', textAlign: 'right', boxSizing: 'border-box', whiteSpace: 'nowrap' };
const NOTE: React.CSSProperties = { ...FONT, color: COLOR_SECONDARY, whiteSpace: 'nowrap' };

export function PortfolioTab({
  cashArs,
  comprometidoArs,
  totalPortfolioArs,
  effectiveMep,
  holdingTickers,
  holdings,
  panelSymbols,
  companyNames,
  arsPrices,
  portfolioError,
  isLoadingPortfolio,
  market,
  onCompanyDetail,
}: PortfolioTabProps) {
  const t = useAutoTraderT();
  const [sortKey, setSortKey] = useState<PortfolioSortKey>('ticker');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const usd = (ars: number) => t('usdApprox', { amount: `$${fmtARS(ars / effectiveMep)}` });
  const mepLoaded = effectiveMep > 1;

  const sorted = [...holdingTickers].sort((a, b) => {
    let va: string | number, vb: string | number;
    const qtyA = holdings[a] ?? 0, qtyB = holdings[b] ?? 0;
    const priceA = arsPrices[a] ?? 0, priceB = arsPrices[b] ?? 0;
    switch (sortKey) {
      case 'ticker': va = a; vb = b; break;
      case 'qty': va = qtyA; vb = qtyB; break;
      case 'price': va = priceA; vb = priceB; break;
      case 'priceUsd': va = priceA / effectiveMep; vb = priceB / effectiveMep; break;
      case 'valuation': va = qtyA * priceA; vb = qtyB * priceB; break;
    }
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const listMessage = isLoadingPortfolio && holdingTickers.length === 0
    ? { text: t('portfolio.holdings.loading'), color: COLOR_DISABLED }
    : portfolioError
      ? { text: portfolioError, color: COLOR_NEGATIVE }
      : { text: t('portfolio.holdings.empty'), color: COLOR_DISABLED };

  return (
    <div style={PAGE}>
      <fieldset style={{ margin: 0, flexShrink: 0 }}>
        <legend>{t('portfolio.account.title')}</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'max-content max-content auto', columnGap: 6, rowGap: 4, alignItems: 'center' }}>
          <span style={ROW_LABEL}>{t('portfolio.account.cash')}</span>
          <span className="status-field-border" style={FIGURE}>${fmtARS(cashArs)} ARS</span>
          <span style={NOTE}>{usd(cashArs)}</span>

          <span style={ROW_LABEL}>{t('portfolio.account.committed')}</span>
          <span className="status-field-border" style={FIGURE}>${fmtARS(comprometidoArs)} ARS</span>
          <span />

          <span style={ROW_LABEL}>{t('portfolio.account.total')}</span>
          <span className="status-field-border" style={FIGURE}>${fmtARS(totalPortfolioArs)} ARS</span>
          <span style={NOTE}>{usd(totalPortfolioArs)}</span>

          <span style={ROW_LABEL}>{t('portfolio.account.mep')}</span>
          <span className="status-field-border" style={FIGURE}>
            {mepLoaded ? t('portfolio.account.mepValue', { rate: fmtARS2(effectiveMep) }) : t('portfolio.holdings.loading')}
          </span>
          <span />
        </div>
        {!market.open && (
          <div style={{ ...FONT, marginTop: 8, color: COLOR_SECONDARY }}>
            {t('portfolio.marketClosed', { reason: t(market.reasonKey as Parameters<typeof t>[0], market.reasonParams) })}
          </div>
        )}
      </fieldset>

      <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <legend>{t('portfolio.holdings.title', { count: holdingTickers.length })}</legend>
        <div className="sunken-panel win98-scrollbar" style={{ flex: 1, minHeight: 0, overflow: 'auto', margin: 0 }}>
          {holdingTickers.length > 0 ? (
            <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {COLUMNS.map((col) => {
                    const isActive = sortKey === col.key;
                    const arrow = isActive ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
                    return (
                      <th
                        key={col.key}
                        onClick={() => {
                          if (isActive) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                          else { setSortKey(col.key); setSortDir('asc'); }
                        }}
                        style={{ ...COL_HEADER_BASE, ...(isActive ? COL_SUNKEN : COL_RAISED), textAlign: col.align }}
                      >
                        {t(col.labelKey)}{arrow}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.map((ticker, idx) => {
                  const qty = holdings[ticker] ?? 0;
                  const price = arsPrices[ticker] ?? 0;
                  const isSelected = selectedTicker === ticker;
                  return (
                    <tr
                      key={ticker}
                      onClick={() => setSelectedTicker(ticker)}
                      onDoubleClick={() => onCompanyDetail?.(ticker)}
                      style={{
                        backgroundColor: isSelected ? '#000080' : (idx % 2 === 0 ? '#ffffff' : '#f0f0f0'),
                        color: isSelected ? '#ffffff' : 'inherit',
                        cursor: 'default',
                        userSelect: 'none',
                      }}
                    >
                      <td style={CELL}>
                        <TickerCell ticker={ticker} company={companyNames?.[ticker]} selected={isSelected} />
                      </td>
                      <td style={CELL_RIGHT}>{qty}</td>
                      <td style={CELL_RIGHT}>${fmtARS2(price)}</td>
                      <td style={CELL_RIGHT}>${fmtARS2(price / effectiveMep)}</td>
                      <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>${fmtARS(qty * price)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ ...FONT, padding: '4px 6px', color: listMessage.color }}>{listMessage.text}</div>
          )}
        </div>
      </fieldset>

      <fieldset style={{ margin: 0, flexShrink: 0 }}>
        <legend>{t('portfolio.candidates.title')}</legend>
        {panelSymbols.length > 0 ? (
          <>
            <div style={FONT}>{t('portfolio.candidates.intro', { count: panelSymbols.length })}</div>
            <div style={{ ...FONT, marginTop: 4, lineHeight: '14px' }}>
              {panelSymbols.map((symbol, i) => (
                <span key={symbol} title={companyNames?.[symbol] ? `${symbol} - ${companyNames[symbol]}` : symbol}>
                  {symbol}{i < panelSymbols.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div style={{ ...FONT, color: COLOR_DISABLED }}>
            {isLoadingPortfolio ? t('portfolio.holdings.loading') : t('portfolio.candidates.empty')}
          </div>
        )}
      </fieldset>
    </div>
  );
}

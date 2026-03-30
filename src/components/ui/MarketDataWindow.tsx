import React, { useState } from 'react';
import type { HistoricalRow } from '@/lib/fmp/types';
import {
  FONT, COL_HEADER_BASE, COL_RAISED, COL_SUNKEN, CELL, CELL_RIGHT,
  WINDOW_CONTAINER, REFRESH_FOOTER, STATUS_BAR_STYLE,
  COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_DISABLED,
} from '@/lib/theme/win98';

interface MarketItem {
  symbol: string;
  data: HistoricalRow[];
}

interface MarketDataWindowProps {
  marketData: MarketItem[] | null;
  ownedSymbols: string[];
  companyNames: Record<string, string>;
  isLoading: boolean;
  onRefresh: () => void;
}

type SortCol = 'symbol' | 'last' | 'pct';
type SortDir = 'asc' | 'desc';


const Sparkline: React.FC<{ closes: number[]; isUp: boolean }> = ({ closes, isUp }) => {
  if (closes.length < 2) return <span style={{ color: COLOR_DISABLED }}>—</span>;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const pts = closes
    .map((v, i) => {
      const x = (i / (closes.length - 1)) * 58 + 1;
      const y = 14 - ((v - min) / range) * 12 + 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={60} height={18} viewBox="0 0 60 18" style={{ display: 'block', margin: '0 auto' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={isUp ? COLOR_POSITIVE : COLOR_NEGATIVE}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

interface SortableThProps {
  children: React.ReactNode;
  col: SortCol;
  activeCol: SortCol;
  dir: SortDir;
  onSort: (col: SortCol) => void;
  style?: React.CSSProperties;
}

const SortableTh: React.FC<SortableThProps> = ({ children, col, activeCol, dir, onSort, style }) => {
  const isActive = activeCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        ...COL_HEADER_BASE,
        ...(isActive ? COL_SUNKEN : COL_RAISED),
        cursor: 'pointer',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        ...style,
      }}
    >
      {children}{isActive ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );
};

interface ListViewProps {
  items: MarketItem[];
  companyNames: Record<string, string>;
  sortCol: SortCol;
  sortDir: SortDir;
  onSort: (col: SortCol) => void;
}

const ListView: React.FC<ListViewProps> = ({ items, companyNames, sortCol, sortDir, onSort }) => {
  const enriched = items.map((item) => {
    const closes = item.data.map((d) => d.close);
    const last = closes[closes.length - 1] ?? 0;
    const first = closes[0] ?? 0;
    const pct = first > 0 ? ((last - first) / first) * 100 : 0;
    return { item, closes, last, first, pct, isUp: last >= first };
  });

  const sorted = [...enriched].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'symbol') cmp = a.item.symbol.localeCompare(b.item.symbol);
    else if (sortCol === 'last') cmp = a.last - b.last;
    else if (sortCol === 'pct') cmp = a.pct - b.pct;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div
      className="sunken-panel win98-scrollbar"
      style={{ overflow: 'auto', padding: 0, flex: 1, minHeight: 0 }}
    >
      <table
        style={{
          ...FONT,
          width: '100%',
          borderCollapse: 'collapse',
          borderSpacing: 0,
          tableLayout: 'fixed',
        }}
      >
        <colgroup>
          <col />
          <col style={{ width: '7em' }} />
          <col style={{ width: '5.2em' }} />
          <col style={{ width: '72px' }} />
        </colgroup>
        <thead>
          <tr>
            <SortableTh col="symbol" activeCol={sortCol} dir={sortDir} onSort={onSort}>
              Símbolo
            </SortableTh>
            <SortableTh col="last" activeCol={sortCol} dir={sortDir} onSort={onSort} style={{ textAlign: 'right' }}>
              Último
            </SortableTh>
            <SortableTh col="pct" activeCol={sortCol} dir={sortDir} onSort={onSort} style={{ textAlign: 'right' }}>
              7D %
            </SortableTh>
            <th
              style={{
                ...COL_HEADER_BASE,
                ...COL_RAISED,
                position: 'sticky',
                top: 0,
                zIndex: 1,
                width: 72,
                maxWidth: 72,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              7 Días
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ item, closes, last, pct, isUp }, idx) => (
            <tr
              key={item.symbol}
              style={{
                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0f0f0',
                borderBottom: '1px solid #c0c0c0',
                cursor: 'default',
              }}
            >
              <td style={{ ...CELL, fontWeight: 'bold', lineHeight: '1.2' }}>
                {item.symbol}
                {companyNames[item.symbol] && companyNames[item.symbol] !== item.symbol && (
                  <div style={{
                    ...FONT,
                    fontWeight: 'normal',
                    color: COLOR_SECONDARY,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {companyNames[item.symbol]}
                  </div>
                )}
              </td>
              <td style={{ ...CELL_RIGHT }}>
                ${last.toFixed(2)}
              </td>
              <td
                style={{
                  ...CELL_RIGHT,
                  color: isUp ? COLOR_POSITIVE : COLOR_NEGATIVE,
                }}
              >
                {isUp ? '+' : ''}{pct.toFixed(2)}%
              </td>
              <td
                style={{
                  ...CELL,
                  padding: '1px 2px',
                  borderRight: 'none',
                  width: 72,
                  maxWidth: 72,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                }}
              >
                <Sparkline closes={closes} isUp={isUp} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const MarketDataWindow: React.FC<MarketDataWindowProps> = ({
  marketData,
  ownedSymbols,
  companyNames,
  isLoading,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'mine' | 'all'>('mine');
  const [sortCol, setSortCol] = useState<SortCol>('symbol');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (col: SortCol) => {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const mineItems = (marketData ?? []).filter((d) => ownedSymbols.includes(d.symbol));
  const allItems = marketData ?? [];
  const activeItems = activeTab === 'mine' ? mineItems : allItems;

  return (
    <div style={{ ...WINDOW_CONTAINER, padding: '6px 6px 0 6px', boxSizing: 'border-box' }}>
      {/* Tab strip */}
      <menu role="tablist">
        <li role="tab" aria-selected={activeTab === 'mine'}>
          <a
            href="#mine"
            onClick={(e) => { e.preventDefault(); setActiveTab('mine'); }}
          >
            Mis CEDEARs{mineItems.length > 0 ? ` (${mineItems.length})` : ''}
          </a>
        </li>
        <li role="tab" aria-selected={activeTab === 'all'}>
          <a
            href="#all"
            onClick={(e) => { e.preventDefault(); setActiveTab('all'); }}
          >
            Todos{allItems.length > 0 ? ` (${allItems.length})` : ''}
          </a>
        </li>
      </menu>

      {/* Tab panel */}
      <div className="window" role="tabpanel" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 12, minHeight: 0 }}>
        <div className="window-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', minHeight: 0, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 }}>
          <fieldset style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, margin: 0 }}>
            <legend>
              {activeTab === 'mine' ? 'Mis CEDEARs' : 'Todos los CEDEARs'}
              {activeItems.length > 0 ? ` (${activeItems.length})` : ''}
            </legend>

            {isLoading && !marketData ? (
              <p style={{ margin: 0, padding: 4 }}>Cargando datos de mercado…</p>
            ) : !marketData ? (
              <p style={{ margin: 0, padding: 4, color: COLOR_NEGATIVE }}>
                Error al cargar datos.
              </p>
            ) : activeItems.length === 0 ? (
              <p style={{ margin: 0, padding: 4, color: COLOR_SECONDARY }}>
                {activeTab === 'mine'
                  ? 'No hay CEDEARs en tenencia.'
                  : 'No hay otros CEDEARs disponibles.'}
              </p>
            ) : (
              <ListView
                items={activeItems}
                companyNames={companyNames}
                sortCol={sortCol}
                sortDir={sortDir}
                onSort={handleSort}
              />
            )}
          </fieldset>
        </div>
      </div>

      {/* Refresh button — bottom-right */}
      <div style={REFRESH_FOOTER}>
        <button type="button" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Status bar */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">
          {marketData
            ? `${activeItems.length} elemento${activeItems.length !== 1 ? 's' : ''}`
            : 'Sin datos'}
        </p>
      </div>
    </div>
  );
};

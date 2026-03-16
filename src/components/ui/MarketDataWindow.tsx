import React, { useState } from 'react';
import { HistoricalRow } from '@/lib/market-data';

interface MarketItem {
  symbol: string;
  data: HistoricalRow[];
}

interface MarketDataWindowProps {
  marketData: MarketItem[] | null;
  ownedSymbols: string[];
  isLoading: boolean;
  onRefresh: () => void;
}

type SortCol = 'symbol' | 'last' | 'pct';
type SortDir = 'asc' | 'desc';

const Sparkline: React.FC<{ closes: number[]; isUp: boolean }> = ({ closes, isUp }) => {
  if (closes.length < 2) return <span style={{ color: '#808080' }}>—</span>;
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
    <svg width={60} height={18} viewBox="0 0 60 18" style={{ display: 'block' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={isUp ? '#008000' : '#800000'}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

const colHeader = (
  extra?: React.CSSProperties,
  onClick?: () => void,
  sortIndicator?: string,
): React.CSSProperties => ({
  padding: '2px 6px',
  background: '#c0c0c0',
  boxShadow: onClick
    ? 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf'
    : 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf',
  fontWeight: 'normal',
  fontSize: 11,
  whiteSpace: 'nowrap',
  cursor: onClick ? 'pointer' : 'default',
  userSelect: 'none' as const,
  ...extra,
});

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
  const [pressed, setPressed] = useState(false);

  const boxShadow = pressed
    ? 'inset 1px 1px #0a0a0a, inset -1px -1px #fff, inset 2px 2px #808080, inset -2px -2px #dfdfdf'
    : 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf';

  return (
    <th
      onClick={() => onSort(col)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        padding: '2px 6px',
        background: '#c0c0c0',
        boxShadow,
        fontWeight: 'normal',
        fontSize: 11,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
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
  sortCol: SortCol;
  sortDir: SortDir;
  onSort: (col: SortCol) => void;
}

const ListView: React.FC<ListViewProps> = ({ items, sortCol, sortDir, onSort }) => {
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
      className="win98-scrollbar"
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        boxShadow:
          'inset 1px 1px #0a0a0a, inset -1px -1px #dfdfdf, inset 2px 2px #808080, inset -2px -2px #fff',
        background: '#fff',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}
      >
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '32%' }} />
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
                padding: '2px 6px',
                background: '#c0c0c0',
                boxShadow:
                  'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf',
                fontWeight: 'normal',
                fontSize: 11,
                cursor: 'default',
                userSelect: 'none',
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}
            >
              7 Días
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ item, closes, last, pct, isUp }) => (
            <tr key={item.symbol}>
              <td
                style={{
                  padding: '2px 6px',
                  fontSize: 11,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {item.symbol}
              </td>
              <td
                style={{
                  padding: '2px 6px',
                  fontSize: 11,
                  textAlign: 'right',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                ${last.toFixed(2)}
              </td>
              <td
                style={{
                  padding: '2px 6px',
                  fontSize: 11,
                  textAlign: 'right',
                  color: isUp ? '#008000' : '#800000',
                }}
              >
                {isUp ? '+' : ''}
                {pct.toFixed(2)}%
              </td>
              <td style={{ padding: '1px 4px' }}>
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
  const othersItems = (marketData ?? []).filter((d) => !ownedSymbols.includes(d.symbol));
  const activeItems = activeTab === 'mine' ? mineItems : othersItems;

  return (
    <div
      className="flex flex-col flex-1 h-full min-h-0"
      style={{
        fontFamily: '"Pixelated MS Sans Serif", Tahoma, sans-serif',
        fontSize: 11,
        WebkitFontSmoothing: 'none',
        padding: '6px 6px 0 6px',
      }}
    >
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
            Todos{othersItems.length > 0 ? ` (${othersItems.length})` : ''}
          </a>
        </li>
      </menu>

      {/* Tab panel */}
      <div
        role="tabpanel"
        className="flex-1 flex flex-col"
        style={{ overflow: 'hidden', minHeight: 0, padding: '4px 0 0 0' }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 4,
            paddingBottom: 3,
            borderBottom: '1px solid #808080',
          }}
        >
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Actualizar datos de mercado"
            style={{ fontSize: 11, padding: '1px 10px' }}
          >
            {isLoading ? 'Actualizando…' : '↺ Actualizar'}
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {isLoading && !marketData ? (
            <p style={{ margin: 0, padding: 4 }}>Cargando datos de mercado…</p>
          ) : !marketData ? (
            <p style={{ margin: 0, padding: 4, color: '#800000' }}>
              Error al cargar datos.
            </p>
          ) : activeItems.length === 0 ? (
            <p style={{ margin: 0, padding: 4, color: '#555' }}>
              {activeTab === 'mine'
                ? 'No hay CEDEARs en tenencia.'
                : 'No hay otros CEDEARs disponibles.'}
            </p>
          ) : (
            <ListView
              items={activeItems}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
            />
          )}
        </div>

        {/* Status bar */}
        <div
          style={{
            height: 20,
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            padding: '0 6px',
            fontSize: 11,
            boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff',
            background: '#c0c0c0',
          }}
        >
          {marketData
            ? `${activeItems.length} elemento${activeItems.length !== 1 ? 's' : ''}`
            : 'Sin datos'}
        </div>
      </div>
    </div>
  );
};

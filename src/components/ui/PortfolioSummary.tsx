import React, { useState, useMemo } from 'react';
import { PortfolioAsset } from '@/lib/iol/types';
import { PortfolioResponse } from '@/lib/iol/types';

interface PortfolioSummaryProps {
  portfolio: PortfolioResponse;
  valueUSD: number;
  cclRate: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

/* ─── Win98 authentic inline style constants ─────────────────────────────── */
const FONT: React.CSSProperties = {
  fontFamily: '"Pixelated MS Sans Serif", Arial, sans-serif',
  fontSize: '11px',
  WebkitFontSmoothing: 'none',
  // @ts-ignore – non-standard
  MozOsxFontSmoothing: 'grayscale',
};

const LABEL: React.CSSProperties = {
  ...FONT,
  width: '80px',
  flexShrink: 0,
  textAlign: 'right',
  paddingRight: '6px',
  whiteSpace: 'nowrap',
};

/* ─── Win98 ListView column header (raised 3D button look) ───────────────── */
const COL_HEADER_BASE: React.CSSProperties = {
  ...FONT,
  fontWeight: 'normal',
  padding: '2px 6px',
  background: '#c0c0c0',
  whiteSpace: 'nowrap',
  cursor: 'default',
  userSelect: 'none',
};

/* Raised look (default / inactive) */
const COL_RAISED: React.CSSProperties = {
  borderTop: '1px solid #ffffff',
  borderLeft: '1px solid #ffffff',
  borderRight: '1px solid #808080',
  borderBottom: '1px solid #808080',
};

/* Sunken look (active sort column – pressed button) */
const COL_SUNKEN: React.CSSProperties = {
  borderTop: '1px solid #808080',
  borderLeft: '1px solid #808080',
  borderRight: '1px solid #ffffff',
  borderBottom: '1px solid #ffffff',
};

/* ─── Sort column definitions ────────────────────────────────────────────── */
type SortKey = 'simbolo' | 'descripcion' | 'cantidad' | 'ultimoPrecio' | 'valorizado' | 'variacionDiaria' | 'gananciaDinero';
type SortDir = 'asc' | 'desc';

interface ColumnDef {
  key: SortKey;
  label: string;
  align: 'left' | 'right';
  width?: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'simbolo',         label: 'Símbolo',     align: 'left',  width: '60px'  },
  { key: 'descripcion',     label: 'Descripción', align: 'left'                 },
  { key: 'cantidad',        label: 'Cant.',        align: 'right', width: '36px'  },
  { key: 'ultimoPrecio',    label: 'Últ. Precio', align: 'right', width: '65px'  },
  { key: 'valorizado',      label: 'Valorizado',  align: 'right', width: '75px'  },
  { key: 'variacionDiaria', label: 'Var %',        align: 'right', width: '50px'  },
  { key: 'gananciaDinero',  label: 'Ganancia',     align: 'right', width: '65px'  },
];

function getSortValue(asset: PortfolioAsset, key: SortKey): string | number {
  switch (key) {
    case 'simbolo':         return asset.titulo.simbolo;
    case 'descripcion':     return asset.titulo.descripcion;
    case 'cantidad':        return asset.cantidad;
    case 'ultimoPrecio':    return asset.ultimoPrecio;
    case 'valorizado':      return asset.valorizado;
    case 'variacionDiaria': return asset.variacionDiaria;
    case 'gananciaDinero':  return asset.gananciaDinero;
  }
}

/* Win98 cell style */
const CELL: React.CSSProperties = {
  ...FONT,
  padding: '1px 6px',
  borderRight: '1px solid #c0c0c0',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const CELL_RIGHT: React.CSSProperties = {
  ...CELL,
  textAlign: 'right',
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  portfolio,
  valueUSD,
  cclRate,
  isLoading,
  onRefresh,
}) => {
  const totalARS = portfolio.activos.reduce((acc, asset) => acc + asset.valorizado, 0);
  const totalUSD = totalARS / cclRate;
  const totalGananciaARS = portfolio.activos.reduce((acc, asset) => acc + asset.gananciaDinero, 0);
  const totalGananciaUSD = totalGananciaARS / cclRate;

  const [sortKey, setSortKey] = useState<SortKey>('simbolo');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedActivos = useMemo(() => {
    const copy = [...portfolio.activos];
    copy.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      let cmp: number;
      if (typeof va === 'string' && typeof vb === 'string') {
        cmp = va.localeCompare(vb);
      } else {
        cmp = (va as number) - (vb as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [portfolio.activos, sortKey, sortDir]);

  return (
    <div
      style={{
        ...FONT,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#c0c0c0',
        overflow: 'hidden',
      }}
    >
      {/* ── Scrollable body ── */}
      <div
        className="win98-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          margin: 0,
          padding: '6px',
          background: '#c0c0c0',
        }}
      >
        {/* ─── Resumen de Valuación ─── */}
        <fieldset>
          <legend>Valuación (USD)</legend>
          <div className="field-row" style={{ marginBottom: '2px' }}>
            <label style={LABEL}>Total USD:</label>
            <input
              type="text"
              readOnly
              value={`U$D ${totalUSD.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              style={{
                ...FONT,
                flex: 1,
                cursor: 'default',
                fontWeight: 'bold',
              }}
            />
          </div>
          <div className="field-row">
            <label style={LABEL}>Ganancia:</label>
            <input
              type="text"
              readOnly
              value={`U$D ${totalGananciaUSD >= 0 ? '+' : ''}${totalGananciaUSD.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              style={{
                ...FONT,
                flex: 1,
                cursor: 'default',
                fontWeight: 'bold',
                color: totalGananciaUSD >= 0 ? '#008000' : '#ff0000',
              }}
            />
          </div>
        </fieldset>

        {/* ─── Holdings ListView ─── */}
        <fieldset style={{ marginTop: '6px' }}>
          <legend>Tenencia ({portfolio.activos.length} títulos)</legend>
          <div
            className="sunken-panel win98-scrollbar"
            style={{ overflow: 'auto', maxHeight: '320px', padding: 0 }}
          >
            <table
              style={{
                ...FONT,
                width: '100%',
                borderCollapse: 'collapse',
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr>
                  {COLUMNS.map((col) => {
                    const isActive = sortKey === col.key;
                    const arrow = isActive ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        style={{
                          ...COL_HEADER_BASE,
                          textAlign: col.align,
                          ...(isActive ? COL_SUNKEN : COL_RAISED),
                          ...(col.width ? { width: col.width } : {}),
                          cursor: 'pointer',
                        }}
                      >
                        {col.label}{arrow}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedActivos.map((asset, idx) => {
                  const ganancia = asset.gananciaDinero;
                  const variacion = asset.variacionDiaria;
                  return (
                    <tr
                      key={asset.titulo.simbolo}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0f0f0',
                        borderBottom: '1px solid #c0c0c0',
                        cursor: 'default',
                      }}
                    >
                      <td style={{ ...CELL, fontWeight: 'bold' }}>
                        {asset.titulo.simbolo}
                      </td>
                      <td
                        style={{
                          ...CELL,
                          maxWidth: '120px',
                        }}
                        title={asset.titulo.descripcion}
                      >
                        {asset.titulo.descripcion}
                      </td>
                      <td style={CELL_RIGHT}>{asset.cantidad}</td>
                      <td style={CELL_RIGHT}>
                        {(asset.ultimoPrecio / cclRate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ ...CELL_RIGHT, fontWeight: 'bold' }}>
                        {(asset.valorizado / cclRate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td
                        style={{
                          ...CELL_RIGHT,
                          color: variacion >= 0 ? '#008000' : '#ff0000',
                        }}
                      >
                        {variacion >= 0 ? '+' : ''}{variacion.toFixed(2)}%
                      </td>
                      <td
                        style={{
                          ...CELL_RIGHT,
                          color: ganancia >= 0 ? '#008000' : '#ff0000',
                          borderRight: 'none',
                        }}
                      >
                        {ganancia >= 0 ? '+' : ''}{(ganancia / cclRate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </fieldset>
      </div>

      {/* ── Botón Actualizar ── */}
      {onRefresh && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '2px 6px 4px',
            background: '#c0c0c0',
            borderTop: '1px solid #808080',
            flexShrink: 0,
          }}
        >
          <button onClick={onRefresh} disabled={isLoading}>
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      )}

      {/* ── Status Bar ── */}
      <div className="status-bar" style={{ ...FONT, flexShrink: 0, margin: 0 }}>
        <p className="status-bar-field">
          {portfolio.activos.length} títulos en cartera
        </p>
        <p className="status-bar-field">
          CCL: ${cclRate.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="status-bar-field" style={{
          color: totalGananciaUSD >= 0 ? '#008000' : '#ff0000',
        }}>
          P&L: {totalGananciaUSD >= 0 ? '+' : ''}U$D {totalGananciaUSD.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
};

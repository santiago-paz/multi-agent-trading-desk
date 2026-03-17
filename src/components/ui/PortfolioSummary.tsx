import React from 'react';
import { PortfolioResponse } from '@/lib/iol/types';
import { usePortfolioSort, SortKey } from '@/hooks/usePortfolioSort';

import { useMepStore } from '@/lib/store/mep-store';

interface PortfolioSummaryProps {
  portfolio: PortfolioResponse;
  isLoading?: boolean;
  onRefresh?: () => void;
}

import {
  FONT, LABEL, COL_HEADER_BASE, COL_RAISED, COL_SUNKEN, CELL, CELL_RIGHT,
  WINDOW_CONTAINER, SCROLLABLE_BODY, REFRESH_FOOTER, STATUS_BAR_STYLE,
  COLOR_POSITIVE, COLOR_NEGATIVE,
} from '@/lib/theme/win98';

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



/* ─── Component ──────────────────────────────────────────────────────────── */
export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  portfolio,
  isLoading,
  onRefresh,
}) => {
  const { mepRate, fetchMepRate } = useMepStore();
  const {
    sortKey,
    sortDir,
    handleSort,
    sortedActivos,
    totalUSD,
    totalGananciaUSD,
    totalActivosEnCartera,
  } = usePortfolioSort(portfolio, mepRate);

  return (
    <div style={WINDOW_CONTAINER}>
      {/* ── Scrollable body ── */}
      <div className="win98-scrollbar" style={SCROLLABLE_BODY}>
        {/* ─── Resumen de Valuación ─── */}
        <fieldset>
          <legend>Valuación (USD)</legend>
          <div className="field-row" style={{ marginBottom: '2px' }}>
            <label style={LABEL}>Total USD:</label>
            <input
              type="text"
              readOnly
              value={`U$D ${totalUSD.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              style={{ ...FONT, flex: 1, cursor: 'default' }}
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
                color: totalGananciaUSD >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
              }}
            />
          </div>
        </fieldset>

        {/* ─── Holdings ListView ─── */}
        <fieldset style={{ marginTop: '6px' }}>
          <legend>Tenencia ({totalActivosEnCartera} títulos)</legend>
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
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
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
                      <td style={CELL}>
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
                        {(asset.ultimoPrecio / mepRate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={CELL_RIGHT}>
                        {(asset.valorizado / mepRate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td
                        style={{
                          ...CELL_RIGHT,
                          color: variacion >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
                        }}
                      >
                        {variacion >= 0 ? '+' : ''}{variacion.toFixed(2)}%
                      </td>
                      <td
                        style={{
                          ...CELL_RIGHT,
                          color: ganancia >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
                          borderRight: 'none',
                        }}
                      >
                        {ganancia >= 0 ? '+' : ''}{(ganancia / mepRate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        <div style={REFRESH_FOOTER}>
          <button onClick={() => { onRefresh?.(); fetchMepRate(); }} disabled={isLoading}>
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      )}

      {/* ── Status Bar ── */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">
          {totalActivosEnCartera} títulos en cartera
        </p>
        <p className="status-bar-field">
          MEP: ${mepRate.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="status-bar-field" style={{
          color: totalGananciaUSD >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
        }}>
          P&L: {totalGananciaUSD >= 0 ? '+' : ''}U$D {totalGananciaUSD.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
};

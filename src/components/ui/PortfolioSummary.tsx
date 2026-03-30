import React, { useState } from 'react';
import { PortfolioResponse, EstadoCuenta } from '@/lib/iol/types';
import { usePortfolioSort, SortKey, UsdPriceEntry } from '@/hooks/usePortfolioSort';
import { stripCurrencySuffix } from '@/lib/cedear-map';

import { useMepStore } from '@/lib/store/mep-store';

interface PortfolioSummaryProps {
  portfolio: PortfolioResponse;
  usdPrices?: Record<string, UsdPriceEntry>;
  estadoCuenta?: EstadoCuenta | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onCompanyDetail?: (symbol: string) => void;
}

import {
  FONT, LABEL, COL_HEADER_BASE, COL_RAISED, COL_SUNKEN, CELL, CELL_RIGHT,
  WINDOW_CONTAINER, SCROLLABLE_BODY, REFRESH_FOOTER, STATUS_BAR_STYLE,
  COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY,
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
  { key: 'gananciaPorcentaje', label: 'Rend. %', align: 'right', width: '55px' },
];



/* ─── Component ──────────────────────────────────────────────────────────── */
export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  portfolio,
  usdPrices,
  estadoCuenta,
  isLoading,
  onRefresh,
  onCompanyDetail,
}) => {
  const { mepRate, fetchMepRate } = useMepStore();
  const {
    sortKey,
    sortDir,
    handleSort,
    sortedActivos,
    totalUSD,
    cashUSD,
    comprometidoUSD,
    totalGananciaUSD,
    totalARS,
    cashARS,
    comprometidoARS,
    totalGananciaARS,
    totalActivosEnCartera,
  } = usePortfolioSort(portfolio, mepRate, estadoCuenta, usdPrices);

  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'ARS'>('USD');

  const isUSD = displayCurrency === 'USD';
  const displayTotal = isUSD ? totalUSD : totalARS;
  const displayGanancia = isUSD ? totalGananciaUSD : totalGananciaARS;
  const displayCash = isUSD ? cashUSD : cashARS;
  const displayComprometido = isUSD ? comprometidoUSD : comprometidoARS;
  const currencySymbol = isUSD ? 'U$D' : 'AR$';

  return (
    <div style={WINDOW_CONTAINER}>
      {/* ── Scrollable body ── */}
      <div className="win98-scrollbar" style={SCROLLABLE_BODY}>
        {/* ─── Resumen de Valuación ─── */}
        <fieldset>
          <legend>Valuación</legend>
          <div className="field-row" style={{ marginBottom: '6px' }}>
            <label style={LABEL}>Moneda:</label>
            <select 
              value={displayCurrency} 
              onChange={(e) => setDisplayCurrency(e.target.value as 'USD' | 'ARS')}
              style={{ ...FONT, flex: 1 }}
            >
              <option value="USD">Dólar MEP (U$D)</option>
              <option value="ARS">Pesos (AR$)</option>
            </select>
          </div>
          <div className="field-row" style={{ marginBottom: '2px' }}>
            <label style={LABEL}>Total:</label>
            <input
              type="text"
              readOnly
              value={`${currencySymbol} ${displayTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              style={{ ...FONT, flex: 1, cursor: 'default' }}
            />
          </div>
          <div className="field-row" style={{ marginBottom: '2px' }}>
            <label style={LABEL}>Ganancia:</label>
            <input
              type="text"
              readOnly
              value={`${currencySymbol} ${displayGanancia >= 0 ? '+' : ''}${displayGanancia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              style={{
                ...FONT,
                flex: 1,
                cursor: 'default',
                color: displayGanancia >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
              }}
            />
          </div>
          {displayCash > 0 && (
            <div className="field-row" style={{ marginBottom: '2px' }}>
              <label style={LABEL}>Efectivo:</label>
              <input
                type="text"
                readOnly
                value={`${currencySymbol} ${displayCash.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                style={{ ...FONT, flex: 1, cursor: 'default', color: COLOR_SECONDARY }}
              />
            </div>
          )}
          {displayComprometido > 0 && (
            <div className="field-row">
              <label style={LABEL}>Comprometido:</label>
              <input
                type="text"
                readOnly
                value={`${currencySymbol} ${displayComprometido.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                style={{ ...FONT, flex: 1, cursor: 'default', color: COLOR_NEGATIVE }}
              />
            </div>
          )}
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
                  const sym = asset.titulo.simbolo;
                  const dPrice = usdPrices?.[sym];
                  const priceUSD = dPrice ? dPrice.price : asset.ultimoPrecio / mepRate;
                  const valorizadoUSD = dPrice ? dPrice.price * asset.cantidad : asset.valorizado / mepRate;
                  const variacion = dPrice ? dPrice.pct : asset.variacionDiaria;
                  const gananciaUSD = asset.gananciaDinero / mepRate;
                  
                  const displayPrice = isUSD ? priceUSD : asset.ultimoPrecio;
                  const displayValorizado = isUSD ? valorizadoUSD : asset.valorizado;
                  const displayGananciaDinero = isUSD ? gananciaUSD : asset.gananciaDinero;
                  
                  return (
                    <tr
                      key={sym}
                      onDoubleClick={() => onCompanyDetail?.(stripCurrencySuffix(sym))}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0f0f0',
                        borderBottom: '1px solid #c0c0c0',
                        cursor: 'default',
                        userSelect: 'none',
                      }}
                    >
                      <td style={CELL}>
                        {sym}
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
                        {displayPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={CELL_RIGHT}>
                        {displayValorizado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          color: displayGananciaDinero >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
                        }}
                      >
                        {displayGananciaDinero >= 0 ? '+' : ''}{displayGananciaDinero.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td
                        style={{
                          ...CELL_RIGHT,
                          color: asset.gananciaPorcentaje >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
                          borderRight: 'none',
                        }}
                      >
                        {asset.gananciaPorcentaje >= 0 ? '+' : ''}{asset.gananciaPorcentaje.toFixed(2)}%
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
          color: displayGanancia >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
        }}>
          F&L: {displayGanancia >= 0 ? '+' : ''}{currencySymbol} {displayGanancia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
};

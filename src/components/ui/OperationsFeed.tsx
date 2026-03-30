import React, { useState, useMemo } from 'react';
import { Operation } from '@/lib/iol/types';
import {
  FONT, COL_HEADER_BASE, COL_RAISED, COL_SUNKEN, CELL, CELL_RIGHT,
  WINDOW_CONTAINER, SCROLLABLE_BODY, REFRESH_FOOTER, STATUS_BAR_STYLE,
  COLOR_POSITIVE, COLOR_NEGATIVE,
} from '@/lib/theme/win98';
import { useMepStore } from '@/lib/store/mep-store';

interface OperationsFeedProps {
  operations: Operation[];
  isLoading: boolean;
  onRefresh: () => void;
}

type SortKey = 'fechaOrden' | 'simbolo' | 'tipo' | 'cantidad' | 'precio' | 'monto' | 'estado';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right'; width: string }[] = [
  { key: 'fechaOrden', label: 'Fecha',   align: 'left',  width: '72px' },
  { key: 'simbolo',    label: 'Símbolo', align: 'left',  width: '60px' },
  { key: 'tipo',       label: 'Tipo',    align: 'left',  width: '60px' },
  { key: 'cantidad',   label: 'Cant.',   align: 'right', width: '50px' },
  { key: 'precio',     label: 'Precio',  align: 'right', width: '72px' },
  { key: 'monto',      label: 'Monto',   align: 'right', width: '80px' },
  { key: 'estado',     label: 'Estado',  align: 'left',  width: '80px' },
];

export function OperationsFeed({ operations, isLoading, onRefresh }: OperationsFeedProps) {
  const { mepRate } = useMepStore();
  const [displayCurrency, setDisplayCurrency] = useState<'ARS' | 'USD'>('ARS');

  // Default: most recent first (▼ = descending per guideline)
  const [sortKey, setSortKey] = useState<SortKey>('fechaOrden');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = useMemo(() => {
    return [...operations].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case 'fechaOrden': av = a.fechaOrden; bv = b.fechaOrden; break;
        case 'simbolo':    av = a.simbolo;    bv = b.simbolo;    break;
        case 'tipo':       av = a.tipo;       bv = b.tipo;       break;
        case 'cantidad':   av = a.cantidadOperada || a.cantidad;   bv = b.cantidadOperada || b.cantidad;   break;
        case 'precio':     av = a.precioOperado || a.precio;     bv = b.precioOperado || b.precio;     break;
        case 'monto':      av = a.montoOperado || a.monto;      bv = b.montoOperado || b.monto;      break;
        case 'estado':     av = a.estado;     bv = b.estado;     break;
        default:           return 0;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [operations, sortKey, sortDir]);

  return (
    <div style={WINDOW_CONTAINER}>
      {/* ── Scrollable body ── */}
      <div className="win98-scrollbar" style={SCROLLABLE_BODY}>
        {/* Group box: sentence caps for legend (group box label rule) */}
        <fieldset style={{ margin: 0, paddingBottom: '6px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 10px)' }}>
          <legend>Últimos movimientos (IOL)</legend>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
            <label style={{ ...FONT, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Moneda:
              <select 
                value={displayCurrency} 
                onChange={(e) => setDisplayCurrency(e.target.value as 'ARS' | 'USD')}
                style={FONT}
              >
                <option value="ARS">Pesos (AR$)</option>
                <option value="USD">Dólar MEP (U$D)</option>
              </select>
            </label>
          </div>

          <div
            className="sunken-panel win98-scrollbar"
            style={{ overflow: 'auto', flex: 1, padding: 0 }}
          >
            {isLoading && operations.length === 0 ? (
              <p style={{ ...FONT, padding: '4px', margin: 0 }}>Cargando movimientos...</p>
            ) : operations.length === 0 ? (
              <p style={{ ...FONT, padding: '4px', margin: 0 }}>No hay movimientos recientes.</p>
            ) : (
              <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    {COLUMNS.map((col) => {
                      const isActive = col.key === sortKey;
                      return (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          style={{
                            ...COL_HEADER_BASE,
                            ...(isActive ? COL_SUNKEN : COL_RAISED),
                            textAlign: col.align,
                            width: col.width,
                            position: 'sticky',
                            top: 0,
                            zIndex: 1,
                            cursor: 'pointer',
                          }}
                        >
                          {col.label}{isActive ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((op, idx) => {
                    const isCompra = op.tipo === 'Compra';
                    const isVenta = op.tipo === 'Venta';
                    const tipoColor = isCompra ? COLOR_POSITIVE : isVenta ? COLOR_NEGATIVE : '#000000';
                    
                    let estadoColor = '#000000';
                    if (op.estado) {
                      const est = op.estado.toLowerCase();
                      if (est.includes('terminada')) estadoColor = COLOR_POSITIVE;
                      else if (est.includes('cancelada') || est.includes('rechazada')) estadoColor = COLOR_NEGATIVE;
                      else if (est.includes('iniciada') || est.includes('pendiente')) estadoColor = '#0000ff'; // Blue for pending/in-progress
                    }

                    return (
                      <tr
                        key={op.numero || idx}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0f0f0',
                          cursor: 'default',
                        }}
                      >
                        <td style={CELL}>
                          {new Date(op.fechaOrden).toLocaleDateString('es-AR')}
                        </td>
                        <td style={CELL}>
                          {op.simbolo}
                        </td>
                        <td style={{ ...CELL, color: tipoColor }}>
                          {op.tipo}
                        </td>
                        <td style={CELL_RIGHT}>
                          {op.cantidadOperada || op.cantidad || '—'}
                        </td>
                        <td style={CELL_RIGHT}>
                          {(() => {
                            const precio = op.precioOperado || op.precio;
                            if (!precio) return '—';
                            const isUsdSymbol = op.simbolo.endsWith('D') && op.simbolo.length > 2;
                            // If the symbol is inherently USD, we might not want to convert it, but for simplicity,
                            // we assume the raw price is in ARS unless it's a USD symbol.
                            // If it's a USD symbol, the raw price is already USD.
                            let displayVal = precio;
                            if (displayCurrency === 'USD' && !isUsdSymbol) {
                              displayVal = precio / mepRate;
                            } else if (displayCurrency === 'ARS' && isUsdSymbol) {
                              displayVal = precio * mepRate;
                            }
                            const prefix = displayCurrency === 'USD' ? 'U$D' : 'AR$';
                            return `${prefix} ${displayVal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          })()}
                        </td>
                        <td style={CELL_RIGHT}>
                          {(() => {
                            const monto = op.montoOperado || op.monto;
                            if (!monto) return '—';
                            const isUsdSymbol = op.simbolo.endsWith('D') && op.simbolo.length > 2;
                            let displayVal = monto;
                            if (displayCurrency === 'USD' && !isUsdSymbol) {
                              displayVal = monto / mepRate;
                            } else if (displayCurrency === 'ARS' && isUsdSymbol) {
                              displayVal = monto * mepRate;
                            }
                            const prefix = displayCurrency === 'USD' ? 'U$D' : 'AR$';
                            return `${prefix} ${displayVal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          })()}
                        </td>
                        <td style={{ ...CELL, borderRight: 'none', color: estadoColor }}>
                          {op.estado ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </fieldset>
      </div>

      {/* ── Botón Actualizar ── */}
      <div style={REFRESH_FOOTER}>
        <button onClick={onRefresh} disabled={isLoading}>
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* ── Status Bar ── */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">
          {operations.length} movimientos
        </p>
        <p className="status-bar-field">
          MEP: ${mepRate.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="status-bar-field">
          {isLoading ? 'Actualizando...' : 'Listo'}
        </p>
      </div>
    </div>
  );
}

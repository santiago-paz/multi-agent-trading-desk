import React from 'react';
import { Operation } from '@/lib/iol/types';
import { FONT, COL_RAISED, CELL, CELL_RIGHT } from '@/lib/theme/win98';

import { useMepStore } from '@/lib/store/mep-store';

interface OperationsFeedProps {
  operations: Operation[];
  isLoading: boolean;
  onRefresh: () => void;
}

const COLUMNS = [
  { key: 'fecha', label: 'Fecha', align: 'left', width: '70px' },
  { key: 'simbolo', label: 'Símbolo', align: 'left', width: '60px' },
  { key: 'tipo', label: 'Tipo', align: 'left', width: '60px' },
  { key: 'cantidad', label: 'Cant.', align: 'right', width: '50px' },
  { key: 'precio', label: 'Precio', align: 'right', width: '70px' },
  { key: 'monto', label: 'Monto', align: 'right', width: '80px' },
  { key: 'estado', label: 'Estado', align: 'center', width: '80px' }
] as const;

export function OperationsFeed({ operations, isLoading, onRefresh }: OperationsFeedProps) {
  const { mepRate } = useMepStore();
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
        <fieldset style={{ margin: 0, paddingBottom: '6px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 10px)' }}>
          <legend>Últimos Movimientos (IOL)</legend>
          <div
            className="sunken-panel win98-scrollbar"
            style={{ overflow: 'auto', flex: 1, padding: 0 }}
          >
            {isLoading && operations.length === 0 ? (
              <p style={{ ...FONT, padding: '4px', margin: 0 }}>Cargando movimientos...</p>
            ) : operations.length === 0 ? (
              <p style={{ ...FONT, padding: '4px', margin: 0 }}>No hay movimientos recientes.</p>
            ) : (
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
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          ...COL_RAISED,
                          textAlign: col.align as React.CSSProperties['textAlign'],
                          width: col.width,
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op, idx) => {
                    const isCompra = op.tipo === 'Compra';
                    const isVenta = op.tipo === 'Venta';
                    const tipoColor = isCompra ? '#008000' : isVenta ? '#ff0000' : '#000000';
                    return (
                      <tr
                        key={op.numero || idx}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0f0f0',
                          borderBottom: '1px solid #c0c0c0',
                          cursor: 'default',
                        }}
                      >
                        <td style={CELL}>
                          {new Date(op.fechaOrden).toLocaleDateString()}
                        </td>
                        <td style={{ ...CELL, fontWeight: 'bold' }}>
                          {op.simbolo}
                        </td>
                        <td style={{ ...CELL, color: tipoColor }}>
                          {op.tipo}
                        </td>
                        <td style={CELL_RIGHT}>
                          {op.cantidad ?? '-'}
                        </td>
                        <td style={CELL_RIGHT}>
                          {op.precio != null
                            ? `U$D ${(op.precio / mepRate).toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : '-'}
                        </td>
                        <td style={{ ...CELL_RIGHT, fontWeight: 'bold' }}>
                          {op.monto != null
                            ? `U$D ${(op.monto / mepRate).toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : '-'}
                        </td>
                        <td style={{ ...CELL, textAlign: 'center', borderRight: 'none' }}>
                          {op.estado ?? '-'}
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

      {/* ── Status Bar ── */}
      <div className="status-bar" style={{ ...FONT, flexShrink: 0, margin: 0 }}>
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

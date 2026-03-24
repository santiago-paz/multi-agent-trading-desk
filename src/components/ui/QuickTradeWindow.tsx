'use client';

import React, { useState, useMemo } from 'react';
import {
  FONT,
  WINDOW_CONTAINER,
  SCROLLABLE_BODY,
  COL_HEADER,
  COL_HEADER_RIGHT,
  CELL,
  CELL_RIGHT,
  REFRESH_FOOTER,
  STATUS_BAR_STYLE,
  COLOR_POSITIVE,
  COLOR_NEGATIVE,
  HR98,
} from '@/lib/theme/win98';

export interface TradableCedear {
  simbolo: string;
  base: string;
  descripcion: string;
  ultimoPrecio: number;
  variacionPorcentual: number;
  maxCantidad: number;
  volumen: number;
}

interface QuickTradeWindowProps {
  cedears: TradableCedear[];
  cash: number;
  effectiveCash: number;
  commissionRate: number;
  isLoading: boolean;
  onRefresh: () => void;
  onBuy: (params: {
    simbolo: string;
    cantidad: number;
    precio: number;
    plazo: 't0' | 't1' | 't2';
    tipoOrden: 'precioLimite' | 'precioMercado';
  }) => Promise<{ success: boolean; data?: { ok: boolean; messages: { title: string; description: string }[] }; error?: string }>;
}

type SortKey = 'base' | 'ultimoPrecio' | 'variacionPorcentual' | 'maxCantidad' | 'volumen';
type SortDir = 'asc' | 'desc';

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (n: number) => n.toLocaleString('es-AR');

export const QuickTradeWindow: React.FC<QuickTradeWindowProps> = ({
  cedears,
  cash,
  effectiveCash,
  commissionRate,
  isLoading,
  onRefresh,
  onBuy,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('volumen');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter] = useState('');

  // Order form state
  const [selected, setSelected] = useState<TradableCedear | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [tipoOrden, setTipoOrden] = useState<'precioLimite' | 'precioMercado'>('precioLimite');
  const [plazo, setPlazo] = useState<'t0' | 't1' | 't2'>('t1');
  const [orderStatus, setOrderStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'base' ? 'asc' : 'desc'); }
  };

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return cedears.filter(
      (c) => c.base.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q)
    );
  }, [cedears, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sortKey, sortDir]);

  const handleSelect = (c: TradableCedear) => {
    setSelected(c);
    setCantidad(1);
    setOrderStatus(null);
  };

  const handleBuy = async () => {
    if (!selected) return;
    setIsSending(true);
    setOrderStatus(null);

    const result = await onBuy({
      simbolo: selected.simbolo,
      cantidad,
      precio: selected.ultimoPrecio,
      plazo,
      tipoOrden,
    });

    if (result.success && result.data) {
      if (result.data.ok) {
        const detail = result.data.messages?.[0]?.description || 'Orden enviada correctamente';
        setOrderStatus({ type: 'success', msg: detail });
        setSelected(null);
      } else {
        const detail = result.data.messages?.[0]?.description || 'La orden no fue aceptada';
        setOrderStatus({ type: 'error', msg: detail });
      }
    } else {
      setOrderStatus({ type: 'error', msg: result.error || 'Error al enviar orden' });
    }
    setIsSending(false);
  };

  const totalEstimado = selected ? cantidad * selected.ultimoPrecio : 0;
  const comisionEstimada = totalEstimado * commissionRate;

  if (isLoading) {
    return (
      <div style={{ ...WINDOW_CONTAINER, padding: '6px' }}>
        <p style={{ ...FONT, margin: 0, padding: '4px' }}>Cargando CEDEARs disponibles...</p>
      </div>
    );
  }

  return (
    <div style={WINDOW_CONTAINER}>
      {/* Summary bar */}
      <div style={{ padding: '4px 6px', flexShrink: 0, borderBottom: '1px solid #808080' }}>
        <div style={{ ...FONT, display: 'flex', gap: '12px' }}>
          <span>Disponible: <b>${fmt(cash)}</b></span>
          <span>Operable (neto com.): <b>${fmt(effectiveCash)}</b></span>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '4px 6px', flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Buscar ticker o nombre..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ ...FONT, width: '100%', padding: '2px 4px', boxSizing: 'border-box' }}
        />
      </div>

      {/* Table */}
      <div className="sunken-panel" style={{ ...SCROLLABLE_BODY, padding: 0, margin: '0 6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={COL_HEADER} onClick={() => toggleSort('base')}>
                Ticker {sortKey === 'base' ? (sortDir === 'asc' ? '\u25b2' : '\u25bc') : ''}
              </th>
              <th style={COL_HEADER}>Nombre</th>
              <th style={COL_HEADER_RIGHT} onClick={() => toggleSort('ultimoPrecio')}>
                Precio {sortKey === 'ultimoPrecio' ? (sortDir === 'asc' ? '\u25b2' : '\u25bc') : ''}
              </th>
              <th style={COL_HEADER_RIGHT} onClick={() => toggleSort('variacionPorcentual')}>
                Var% {sortKey === 'variacionPorcentual' ? (sortDir === 'asc' ? '\u25b2' : '\u25bc') : ''}
              </th>
              <th style={COL_HEADER_RIGHT} onClick={() => toggleSort('maxCantidad')}>
                Max Qty {sortKey === 'maxCantidad' ? (sortDir === 'asc' ? '\u25b2' : '\u25bc') : ''}
              </th>
              <th style={COL_HEADER_RIGHT} onClick={() => toggleSort('volumen')}>
                Vol {sortKey === 'volumen' ? (sortDir === 'asc' ? '\u25b2' : '\u25bc') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const isSelected = selected?.simbolo === c.simbolo;
              return (
                <tr
                  key={c.simbolo}
                  onClick={() => handleSelect(c)}
                  style={{
                    cursor: 'default',
                    background: isSelected ? '#000080' : undefined,
                    color: isSelected ? '#ffffff' : undefined,
                  }}
                >
                  <td style={CELL}><b>{c.base}</b></td>
                  <td style={{ ...CELL, maxWidth: '160px' }}>{c.descripcion}</td>
                  <td style={CELL_RIGHT}>${fmt(c.ultimoPrecio)}</td>
                  <td style={{
                    ...CELL_RIGHT,
                    color: isSelected ? '#ffffff' : c.variacionPorcentual >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
                  }}>
                    {c.variacionPorcentual >= 0 ? '+' : ''}{c.variacionPorcentual.toFixed(2)}%
                  </td>
                  <td style={CELL_RIGHT}>{fmtInt(c.maxCantidad)}</td>
                  <td style={CELL_RIGHT}>{fmtInt(c.volumen)}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...CELL, textAlign: 'center', padding: '12px' }}>
                  {filter ? 'Sin resultados' : 'No hay CEDEARs disponibles con tu saldo actual'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Order panel */}
      {selected && (
        <fieldset style={{ margin: '6px', padding: '4px 8px' }}>
          <legend style={FONT}>Comprar {selected.base}</legend>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={FONT}>
              Cantidad:
              <input
                type="number"
                min={1}
                max={selected.maxCantidad}
                value={cantidad}
                onChange={(e) => setCantidad(Math.min(Math.max(1, Number(e.target.value)), selected.maxCantidad))}
                style={{ ...FONT, width: '70px', marginLeft: '4px', padding: '1px 4px' }}
              />
              <span style={{ ...FONT, color: '#808080', marginLeft: '4px' }}>/ {fmtInt(selected.maxCantidad)}</span>
            </label>

            <label style={FONT}>
              Plazo:
              <select
                value={plazo}
                onChange={(e) => setPlazo(e.target.value as 't0' | 't1' | 't2')}
                style={{ ...FONT, marginLeft: '4px' }}
              >
                <option value="t0">CI (t+0)</option>
                <option value="t1">24hs (t+1)</option>
                <option value="t2">48hs (t+2)</option>
              </select>
            </label>

            <label style={FONT}>
              Tipo:
              <select
                value={tipoOrden}
                onChange={(e) => setTipoOrden(e.target.value as 'precioLimite' | 'precioMercado')}
                style={{ ...FONT, marginLeft: '4px' }}
              >
                <option value="precioLimite">Limite</option>
                <option value="precioMercado">Mercado</option>
              </select>
            </label>
          </div>

          <hr style={HR98} />

          <div style={{ ...FONT, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span>Total: <b>${fmt(totalEstimado)}</b></span>
              <span style={{ color: '#808080', marginLeft: '8px' }}>
                (com. est. ~${fmt(comisionEstimada)})
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={FONT}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBuy}
                disabled={isSending || cantidad < 1}
                style={{ ...FONT, fontWeight: 'bold', minWidth: '80px' }}
              >
                {isSending ? 'Enviando...' : 'Comprar'}
              </button>
            </div>
          </div>
        </fieldset>
      )}

      {/* Order status */}
      {orderStatus && (
        <div style={{
          ...FONT,
          padding: '4px 8px',
          margin: '0 6px 4px',
          background: orderStatus.type === 'success' ? '#e0ffe0' : '#ffe0e0',
          border: '1px solid',
          borderColor: orderStatus.type === 'success' ? COLOR_POSITIVE : COLOR_NEGATIVE,
          color: orderStatus.type === 'success' ? COLOR_POSITIVE : COLOR_NEGATIVE,
        }}>
          {orderStatus.msg}
        </div>
      )}

      {/* Footer */}
      <div style={REFRESH_FOOTER}>
        <button type="button" onClick={onRefresh} style={FONT}>
          Actualizar
        </button>
      </div>

      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <div className="status-bar-field">
          {sorted.length} CEDEAR{sorted.length !== 1 ? 's' : ''} disponible{sorted.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

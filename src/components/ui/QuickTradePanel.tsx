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

export interface QuickTradePanelProps {
  cedears: TradableCedear[];
  cash: number;
  comprometido?: number;
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
  }) => Promise<{ success: boolean; data?: { ok: boolean; numeroOperacion?: number; messages?: { title: string; description: string }[] }; error?: string }>;
  onCompanyDetail?: (symbol: string) => void;
}

type SortKey = 'base' | 'ultimoPrecio' | 'variacionPorcentual' | 'maxCantidad' | 'volumen';
type SortDir = 'asc' | 'desc';

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (n: number) => n.toLocaleString('es-AR');

export const QuickTradePanel: React.FC<QuickTradePanelProps> = ({
  cedears,
  cash,
  comprometido = 0,
  effectiveCash,
  commissionRate,
  isLoading,
  onRefresh,
  onBuy,
  onCompanyDetail,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('volumen');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Order form state
  const [selected, setSelected] = useState<TradableCedear | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [tipoOrden, setTipoOrden] = useState<'precioLimite' | 'precioMercado'>('precioLimite');
  const [plazo, setPlazo] = useState<'t0' | 't1' | 't2'>('t1');
  const [orderStatus, setOrderStatus] = useState<{ type: 'success' | 'error' | 'warning'; msg: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'base' ? 'asc' : 'desc'); }
  };

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return cedears.filter((c) => {
      if (!showAll && c.maxCantidad < 1) return false;
      return c.base.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q);
    });
  }, [cedears, filter, showAll]);

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
      // Extract the best available message from IOL response
      const msgs = result.data.messages ?? [];
      const detail = msgs.map(m => m.description || m.title).filter(Boolean).join('. ');

      if (result.data.ok) {
        const successMsg = result.data.numeroOperacion 
          ? `Orden enviada correctamente (Operación #${result.data.numeroOperacion})` 
          : (detail || 'Orden enviada correctamente');
        setOrderStatus({ type: 'success', msg: successMsg });
        setSelected(null);
      } else if (detail) {
        // IOL explicitly rejected with a reason
        setOrderStatus({ type: 'error', msg: detail });
      } else {
        // IOL returned ok:false without explanation — order may still have gone through
        setOrderStatus({ type: 'warning', msg: 'IOL no confirmó la orden. Verificá en Movimientos si fue enviada.' });
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
      <div style={{ padding: '6px', height: '100%' }}>
        <p style={{ ...FONT, margin: 0, padding: '4px' }}>Cargando CEDEARs disponibles...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Summary bar */}
      <div style={{ padding: '4px 6px', flexShrink: 0, borderBottom: '1px solid #808080' }}>
        <div style={{ ...FONT, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span>Disponible: <b>AR$ {fmt(cash)}</b></span>
          {comprometido > 0 && (
            <span style={{ color: COLOR_NEGATIVE }}>Comprometido: <b>AR$ {fmt(comprometido)}</b></span>
          )}
          <span>Operable (neto com.): <b>AR$ {fmt(effectiveCash)}</b></span>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '4px 6px', flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar ticker o nombre..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ ...FONT, flex: 1, padding: '2px 4px', boxSizing: 'border-box' }}
        />
        <div style={{ ...FONT, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          <span>Filtro:</span>
          <select
            value={showAll ? 'all' : 'buyable'}
            onChange={(e) => setShowAll(e.target.value === 'all')}
            style={FONT}
          >
            <option value="buyable">Solo con saldo</option>
            <option value="all">Todos</option>
          </select>
        </div>
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
              <th style={COL_HEADER_RIGHT} onClick={() => toggleSort('volumen')} title="Volumen operado en el día">
                Vol. Diario {sortKey === 'volumen' ? (sortDir === 'asc' ? '\u25b2' : '\u25bc') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, idx) => {
              const isSelected = selected?.simbolo === c.simbolo;
              return (
                <tr
                  key={c.simbolo}
                  onClick={() => handleSelect(c)}
                  onDoubleClick={() => onCompanyDetail?.(c.base)}
                  style={{
                    cursor: 'default',
                    userSelect: 'none',
                    background: isSelected ? '#000080' : (idx % 2 === 0 ? '#ffffff' : '#f0f0f0'),
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
                  {filter ? 'Sin resultados' : (showAll ? 'No hay CEDEARs' : 'No hay CEDEARs disponibles con tu saldo actual')}
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
                max={selected.maxCantidad > 0 ? selected.maxCantidad : undefined}
                value={cantidad}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  setCantidad(selected.maxCantidad > 0 ? Math.min(val, selected.maxCantidad) : val);
                }}
                style={{ ...FONT, width: '70px', marginLeft: '4px', padding: '1px 4px' }}
              />
              <span style={{ ...FONT, color: '#808080', marginLeft: '4px' }}>/ {fmtInt(selected.maxCantidad)}</span>
              <button
                type="button"
                onClick={() => setCantidad(selected.maxCantidad)}
                disabled={selected.maxCantidad < 1}
                style={{ ...FONT, marginLeft: '4px', padding: '1px 6px' }}
              >
                Max
              </button>
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
          background: orderStatus.type === 'success' ? '#e0ffe0' : orderStatus.type === 'warning' ? '#fff8e0' : '#ffe0e0',
          border: '1px solid',
          borderColor: orderStatus.type === 'success' ? COLOR_POSITIVE : orderStatus.type === 'warning' ? '#b8860b' : COLOR_NEGATIVE,
          color: orderStatus.type === 'success' ? COLOR_POSITIVE : orderStatus.type === 'warning' ? '#b8860b' : COLOR_NEGATIVE,
        }}>
          {orderStatus.msg}
        </div>
      )}

    </div>
  );
};

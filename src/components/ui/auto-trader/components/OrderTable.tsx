import React from 'react';
import { FONT, COL_HEADER_BASE, COL_RAISED, CELL, CELL_RIGHT } from '@/lib/theme/win98';
import { RebalanceOrder } from '@/lib/trading/rebalance-engine';
import { fmtARS, fmtARS2 } from '../utils';

export function OrderTable({ orders }: { orders: RebalanceOrder[] }) {
  return (
    <div className="sunken-panel win98-scrollbar" style={{ flex: 1, overflow: 'auto', margin: 0, minHeight: 0 }}>
      <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Ticker</th>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Cant</th>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Precio</th>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Volumen</th>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Conf.</th>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Razón</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, idx) => (
            <tr key={o.ticker} style={{
              backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0f0f0',
              cursor: 'default',
            }}>
              <td style={CELL}>{o.ticker}</td>
              <td style={CELL_RIGHT}>{o.quantity}</td>
              <td style={CELL_RIGHT}>${fmtARS2(o.priceArs)}</td>
              <td style={CELL_RIGHT}>${fmtARS(o.volumeArs)}</td>
              <td style={CELL_RIGHT}>{o.confidence}%</td>
              <td style={{ ...CELL, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', borderRight: 'none' }}
                  title={o.reasoning}>
                {o.reasoning}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

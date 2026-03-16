import React from 'react';
import { OrderRequest } from '@/lib/iol/types';
import { FONT, COLOR_POSITIVE, COLOR_NEGATIVE } from '@/lib/theme/win98';

interface OrderReviewProps {
  orders: OrderRequest[];
  onExecute: () => void;
  isLoading: boolean;
}

export const OrderReview: React.FC<OrderReviewProps> = ({ orders, onExecute, isLoading }) => {
  if (orders.length === 0) {
    return <p style={{ ...FONT, margin: 0 }}>No orders to review.</p>;
  }

  return (
    <>
      <div className="field-row-stacked" style={{ marginBottom: '8px' }}>
        {orders.map((order, index) => (
          <div key={index} className="field-row" style={{ justifyContent: 'space-between' }}>
            <span style={FONT}>
              <strong style={{ color: order.side === 'buy' ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
                {order.side === 'buy' ? 'Buy' : 'Sell'}
              </strong>
              {' '}{order.simbolo}
            </span>
            <span style={FONT}>{order.cantidad} shares · {order.tipo}</span>
          </div>
        ))}
      </div>
      <div className="field-row" style={{ justifyContent: 'flex-end' }}>
        <button
          onClick={onExecute}
          disabled={isLoading}
          className="default"
        >
          {isLoading ? 'Executing...' : 'Execute Orders'}
        </button>
      </div>
    </>
  );
};

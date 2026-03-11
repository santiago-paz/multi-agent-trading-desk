import React from 'react';
import { OrderRequest } from '@/lib/iol/types';

interface OrderReviewProps {
  orders: OrderRequest[];
  onExecute: () => void;
  isLoading: boolean;
}

export const OrderReview: React.FC<OrderReviewProps> = ({ orders, onExecute, isLoading }) => {
  if (orders.length === 0) {
    return <p className="m-0">No orders to review.</p>;
  }

  return (
    <>
      <div className="field-row-stacked mb-4">
        {orders.map((order, index) => (
          <div key={index} className="field-row" style={{ justifyContent: 'space-between' }}>
            <span>
              <strong style={{ color: order.side === 'buy' ? 'green' : 'maroon' }}>
                {order.side === 'buy' ? 'BUY' : 'SELL'}
              </strong>
              {' '}{order.simbolo}
            </span>
            <span>{order.cantidad} shares · {order.tipo}</span>
          </div>
        ))}
      </div>
      <div className="field-row justify-end">
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


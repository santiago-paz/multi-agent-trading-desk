import React from 'react';
import { OrderRequest } from '@/lib/iol/types';

interface OrderReviewProps {
  orders: OrderRequest[];
  onExecute: () => void;
  isLoading: boolean;
}

export const OrderReview: React.FC<OrderReviewProps> = ({ orders, onExecute, isLoading }) => {
  if (orders.length === 0) {
    return (
      <div className="border-4 border-white p-4 bg-black text-white font-mono mb-6">
        <h2 className="text-xl font-bold mb-4 uppercase tracking-widest border-b-2 border-white pb-2">Order Review</h2>
        <p className="text-gray-400">No orders to review.</p>
      </div>
    );
  }

  return (
    <div className="border-4 border-white p-4 bg-black text-white font-mono mb-6">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-widest border-b-2 border-white pb-2">Order Review</h2>
      
      <div className="space-y-4 mb-6">
        {orders.map((order, index) => (
          <div key={index} className="flex justify-between items-center border-b border-gray-800 pb-2">
            <div>
              <span className={`font-bold ${order.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                {order.side === 'buy' ? 'BUY' : 'SELL'}
              </span>
              <span className="ml-2">{order.simbolo}</span>
            </div>
            <div className="text-right">
              <span className="block text-sm">{order.cantidad} shares</span>
              <span className="block text-xs text-gray-500">{order.tipo}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onExecute}
        disabled={isLoading}
        className={`w-full py-3 font-bold uppercase tracking-widest border-2 border-white transition-colors
          ${isLoading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-transparent hover:text-white'}
        `}
      >
        {isLoading ? 'Executing...' : 'Execute Orders'}
      </button>
    </div>
  );
};

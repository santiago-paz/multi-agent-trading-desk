import React from 'react';
import { PortfolioResponse } from '@/lib/iol/types';

interface PortfolioSummaryProps {
  portfolio: PortfolioResponse;
  valueUSD: number;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ portfolio, valueUSD }) => {
  const totalARS = portfolio.activos.reduce((acc, asset) => acc + asset.valorizado, 0);

  return (
    <div className="border-4 border-white p-4 bg-black text-white font-mono mb-6">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-widest border-b-2 border-white pb-2">Portfolio Status</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-gray-400 text-sm">Total Value (ARS)</p>
          <p className="text-2xl font-bold text-green-400">${totalARS.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Total Value (USD)</p>
          <p className="text-2xl font-bold text-yellow-400">${valueUSD.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Holdings</h3>
        {portfolio.activos.map((asset) => (
          <div key={asset.simbolo} className="flex justify-between items-center border-b border-gray-800 pb-1">
            <span className="font-bold">{asset.simbolo}</span>
            <div className="text-right">
              <span className="block text-sm">{asset.cantidad} shares</span>
              <span className="block text-xs text-gray-500">${asset.valorizado.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

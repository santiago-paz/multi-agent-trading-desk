import React from 'react';
import { PortfolioResponse } from '@/lib/iol/types';

interface PortfolioSummaryProps {
  portfolio: PortfolioResponse;
  valueUSD: number;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ portfolio, valueUSD }) => {
  const totalARS = portfolio.activos.reduce((acc, asset) => acc + asset.valorizado, 0);

  return (
    <>
      <div className="field-row-stacked">
        <div className="field-row" style={{ justifyContent: 'space-between' }}>
          <span>Total Value (ARS)</span>
          <strong>${totalARS.toLocaleString()}</strong>
        </div>
        <div className="field-row" style={{ justifyContent: 'space-between' }}>
          <span>Total Value (USD)</span>
          <strong>${valueUSD.toFixed(2)}</strong>
        </div>
      </div>
      <fieldset className="mt-4">
        <legend>Holdings</legend>
        <div className="field-row-stacked">
          {portfolio.activos.map((asset) => (
            <div key={asset.simbolo} className="field-row" style={{ justifyContent: 'space-between' }}>
              <span>{asset.simbolo}</span>
              <span>{asset.cantidad} shares · ${asset.valorizado.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </fieldset>
    </>
  );
};


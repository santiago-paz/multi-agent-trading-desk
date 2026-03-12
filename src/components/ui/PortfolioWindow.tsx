import React, { useState } from 'react';
import { PortfolioSummary } from './PortfolioSummary';
import { AccountData } from './AccountData';
import { PortfolioResponse, DatosPerfil, EstadoCuenta } from '@/lib/iol/types';

interface PortfolioWindowProps {
  portfolio: PortfolioResponse | null;
  portfolioValueUSD: number;
  cclRate: number;
  isLoadingPortfolio: boolean;
  onRefreshPortfolio: () => void;
  perfil: DatosPerfil | null;
  estadoCuenta: EstadoCuenta | null;
  isLoadingAccount: boolean;
  onRefreshAccount: () => void;
}

export const PortfolioWindow: React.FC<PortfolioWindowProps> = ({
  portfolio,
  portfolioValueUSD,
  cclRate,
  isLoadingPortfolio,
  onRefreshPortfolio,
  perfil,
  estadoCuenta,
  isLoadingAccount,
  onRefreshAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'account'>('portfolio');

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 text-[11px]" style={{ fontFamily: '"Pixelated MS Sans Serif", Tahoma, sans-serif', WebkitFontSmoothing: 'none' }}>
      <menu role="tablist">
        <li role="tab" aria-selected={activeTab === 'portfolio'}>
          <a href="#portfolio" onClick={(e) => { e.preventDefault(); setActiveTab('portfolio'); }} style={{ textDecoration: 'none' }}>Tenencias</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'account'}>
          <a href="#account" onClick={(e) => { e.preventDefault(); setActiveTab('account'); }} style={{ textDecoration: 'none' }}>Mi Cuenta</a>
        </li>
      </menu>

      <div className="window flex-1 flex flex-col" role="tabpanel" style={{ overflow: 'hidden' }}>
        <div className="window-body flex-1 flex flex-col m-0" style={{ padding: '6px', overflow: 'hidden' }}>
          {activeTab === 'portfolio' && (
            isLoadingPortfolio && !portfolio ? (
              <p style={{ margin: 0, padding: '4px' }}>Cargando portafolio...</p>
            ) : portfolio ? (
              <PortfolioSummary
                portfolio={portfolio}
                valueUSD={portfolioValueUSD}
                cclRate={cclRate}
                isLoading={isLoadingPortfolio}
                onRefresh={onRefreshPortfolio}
              />
            ) : (
              <p style={{ margin: 0, padding: '4px', color: '#ff0000' }}>No se pudo cargar el portafolio.</p>
            )
          )}
          {activeTab === 'account' && (
            <AccountData
              perfil={perfil}
              estadoCuenta={estadoCuenta}
              cclRate={cclRate}
              isLoading={isLoadingAccount}
              onRefresh={onRefreshAccount}
            />
          )}
        </div>
      </div>
    </div>
  );
};

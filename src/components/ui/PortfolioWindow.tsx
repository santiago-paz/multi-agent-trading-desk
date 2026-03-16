import React, { useState } from 'react';
import { PortfolioSummary } from './PortfolioSummary';
import { AccountData } from './AccountData';
import { PortfolioResponse, DatosPerfil, EstadoCuenta } from '@/lib/iol/types';

interface PortfolioWindowProps {
  portfolio: PortfolioResponse | null;
  isLoadingPortfolio: boolean;
  onRefreshPortfolio: () => void;
  perfil: DatosPerfil | null;
  estadoCuenta: EstadoCuenta | null;
  isLoadingAccount: boolean;
  onRefreshAccount: () => void;
}

export const PortfolioWindow: React.FC<PortfolioWindowProps> = ({
  portfolio,
  isLoadingPortfolio,
  onRefreshPortfolio,
  perfil,
  estadoCuenta,
  isLoadingAccount,
  onRefreshAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'account'>('portfolio');

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 text-[11px]" style={{ fontFamily: '"Pixelated MS Sans Serif", Tahoma, sans-serif', WebkitFontSmoothing: 'none', padding: '6px 6px 0 6px' }}>
      <menu role="tablist">
        <li role="tab" aria-selected={activeTab === 'portfolio'}>
          <a href="#portfolio" onClick={(e) => { e.preventDefault(); setActiveTab('portfolio'); }} style={{ textDecoration: 'none' }}>Tenencias</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'account'}>
          <a href="#account" onClick={(e) => { e.preventDefault(); setActiveTab('account'); }} style={{ textDecoration: 'none' }}>Mi Cuenta</a>
        </li>
      </menu>

      <div role="tabpanel" className="flex-1 flex flex-col" style={{ overflow: 'hidden', padding: '4px 0 0 0' }}>
          {activeTab === 'portfolio' && (
            isLoadingPortfolio && !portfolio ? (
              <p style={{ margin: 0, padding: '4px' }}>Cargando portafolio...</p>
            ) : portfolio ? (
              <PortfolioSummary
                portfolio={portfolio}
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
              isLoading={isLoadingAccount}
              onRefresh={onRefreshAccount}
            />
          )}
      </div>
    </div>
  );
};

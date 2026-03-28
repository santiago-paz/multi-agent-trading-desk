import React, { useState } from 'react';
import { PortfolioSummary } from './PortfolioSummary';
import { AccountData } from './AccountData';
import { PortfolioResponse, DatosPerfil, EstadoCuenta } from '@/lib/iol/types';
import { FONT, WINDOW_CONTAINER, COLOR_NEGATIVE } from '@/lib/theme/win98';

interface PortfolioWindowProps {
  portfolio: PortfolioResponse | null;
  usdPrices?: Record<string, { price: number; pct: number }>;
  isLoading: boolean;
  onRefresh: () => void;
  perfil: DatosPerfil | null;
  estadoCuenta: EstadoCuenta | null;
  onCompanyDetail?: (symbol: string) => void;
}

export const PortfolioWindow: React.FC<PortfolioWindowProps> = ({
  portfolio,
  usdPrices,
  isLoading,
  onRefresh,
  perfil,
  estadoCuenta,
  onCompanyDetail,
}) => {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'account'>('portfolio');

  return (
    <div style={{ ...WINDOW_CONTAINER, padding: '6px 6px 0 6px' }}>
      <menu role="tablist">
        <li role="tab" aria-selected={activeTab === 'portfolio'}>
          <a href="#portfolio" onClick={(e) => { e.preventDefault(); setActiveTab('portfolio'); }} style={{ textDecoration: 'none' }}>Tenencias</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'account'}>
          <a href="#account" onClick={(e) => { e.preventDefault(); setActiveTab('account'); }} style={{ textDecoration: 'none' }}>Mi Cuenta</a>
        </li>
      </menu>

      <div role="tabpanel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '4px 0 0 0' }}>
          {activeTab === 'portfolio' && (
            isLoading && !portfolio ? (
              <p style={{ ...FONT, margin: 0, padding: '4px' }}>Cargando portafolio...</p>
            ) : portfolio ? (
              <PortfolioSummary
                portfolio={portfolio}
                usdPrices={usdPrices}
                estadoCuenta={estadoCuenta}
                isLoading={isLoading}
                onRefresh={onRefresh}
                onCompanyDetail={onCompanyDetail}
              />
            ) : (
              <p style={{ ...FONT, margin: 0, padding: '4px', color: COLOR_NEGATIVE }}>No se pudo cargar el portafolio.</p>
            )
          )}
          {activeTab === 'account' && (
            <AccountData
              perfil={perfil}
              estadoCuenta={estadoCuenta}
              isLoading={isLoading}
              onRefresh={onRefresh}
            />
          )}
      </div>
    </div>
  );
};

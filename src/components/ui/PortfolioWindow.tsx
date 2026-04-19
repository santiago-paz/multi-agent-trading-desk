import React, { useState } from 'react';
import { PortfolioSummary } from './PortfolioSummary';
import { AccountData } from './AccountData';
import { PortfolioResponse, DatosPerfil, EstadoCuenta } from '@/lib/iol/types';
import { FONT, WINDOW_CONTAINER, COLOR_NEGATIVE } from '@/lib/theme/win98';
import { usePortfolioT } from '@/lib/i18n';

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
  const t = usePortfolioT();

  return (
    <div style={{ ...WINDOW_CONTAINER, padding: '6px 6px 0 6px' }}>
      <menu role="tablist">
        <li role="tab" aria-selected={activeTab === 'portfolio'}>
          <a href="#portfolio" onClick={(e) => { e.preventDefault(); setActiveTab('portfolio'); }}>{t('tabs.holdings')}</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'account'}>
          <a href="#account" onClick={(e) => { e.preventDefault(); setActiveTab('account'); }}>{t('tabs.account')}</a>
        </li>
      </menu>

      <div className="window" role="tabpanel" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 12, minHeight: 0, marginTop: '-1px' }}>
        <div className="window-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 }}>
          {activeTab === 'portfolio' && (
            isLoading && !portfolio ? (
              <p style={{ ...FONT, margin: 0, padding: '4px' }}>{t('loading')}</p>
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
              <p style={{ ...FONT, margin: 0, padding: '4px', color: COLOR_NEGATIVE }}>{t('error')}</p>
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
    </div>
  );
};

'use client';

import React from 'react';
import { FONT, COLOR_SECONDARY } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import { ScoresSummary } from '../charts/ScoresSummary';
import { ValuationChart } from '../charts/ValuationChart';
import { ProfitabilityChart } from '../charts/ProfitabilityChart';
import { CashFlowChart } from '../charts/CashFlowChart';
import { BalanceSheetChart } from '../charts/BalanceSheetChart';
import { LeverageChart } from '../charts/LeverageChart';
import type { AdvancedDetailResult } from '@/app/trading/actions';

interface AdvancedTabProps {
  advLoading: boolean;
  advData: AdvancedDetailResult | null;
}

export const AdvancedTab: React.FC<AdvancedTabProps> = ({ advLoading, advData }) => {
  const t = useCompanyDetailT();

  return (
    <>
      {advLoading && (
        <p style={{ ...FONT, padding: '8px', color: COLOR_SECONDARY }}>{t('adv.loading')}</p>
      )}
      {!advLoading && advData && (
        <>
          <ScoresSummary scores={advData.scores} dcf={advData.dcf} />
          <ValuationChart data={advData.keyMetrics} />
          <ProfitabilityChart data={advData.keyMetrics} />
          <CashFlowChart data={advData.cashFlow} />
          <BalanceSheetChart data={advData.balanceSheet} />
          <LeverageChart data={advData.keyMetrics} />
        </>
      )}
      {!advLoading && !advData && (
        <p style={{ ...FONT, padding: '8px', color: COLOR_SECONDARY }}>{t('adv.noData')}</p>
      )}
    </>
  );
};

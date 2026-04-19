'use client';

import React from 'react';
import { PriceChart } from '../charts/PriceChart';
import { VolumeChart } from '../charts/VolumeChart';
import { RevenueChart } from '../charts/RevenueChart';
import { MarginsChart } from '../charts/MarginsChart';
import { EPSChart } from '../charts/EPSChart';
import type { IncomeStatementRow } from '@/lib/fmp/types';

interface ChartsTabProps {
  priceHistory: { date: string; close: number; volume: number }[];
  incomeStatements: IncomeStatementRow[];
  isEtf: boolean;
}

export const ChartsTab: React.FC<ChartsTabProps> = ({ priceHistory, incomeStatements, isEtf }) => (
  <>
    <PriceChart data={priceHistory} />
    <VolumeChart data={priceHistory} />
    {!isEtf && (
      <>
        <RevenueChart data={incomeStatements} />
        <MarginsChart data={incomeStatements} />
        <EPSChart data={incomeStatements} />
      </>
    )}
  </>
);

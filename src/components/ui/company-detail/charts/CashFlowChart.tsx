'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart, Bar, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { FONT, COLOR_POSITIVE } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import { InfoTip } from '../components/InfoTip';
import { CHART_FONT, fmtCompact } from '../utils';
import type { CashFlowRow } from '@/lib/fmp/types';

interface CashFlowChartProps {
  data: CashFlowRow[];
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ data }) => {
  const t = useCompanyDetailT();

  if (data.length === 0) return null;
  const chartData = data.map(r => ({
    year: r.date.slice(0, 4),
    operatingCF: r.operatingCashFlow,
    freeCF: r.freeCashFlow,
  }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>{t('adv.cashFlow')} <InfoTip text={t('adv.cashFlowHelp')} /></legend>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis tick={CHART_FONT} tickFormatter={(v: number) => `$${fmtCompact(v)}`} width={52} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => [`$${fmtCompact(Number(value))}`, name === 'operatingCF' ? 'Operating CF' : 'Free CF']}
          />
          <Bar dataKey="operatingCF" fill="#000080" opacity={0.5} name="operatingCF" />
          <Line type="monotone" dataKey="freeCF" stroke={COLOR_POSITIVE} strokeWidth={2} dot={{ r: 2 }} name="freeCF" />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ ...FONT, display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2px', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#000080' }} /> Operating CF</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: COLOR_POSITIVE }} /> Free CF</span>
      </div>
    </fieldset>
  );
};

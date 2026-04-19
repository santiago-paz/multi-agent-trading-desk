'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart, Bar, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { FONT, COLOR_POSITIVE, COLOR_NEGATIVE } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import { InfoTip } from '../components/InfoTip';
import { CHART_FONT, fmtCompact } from '../utils';
import type { BalanceSheetRow } from '@/lib/fmp/types';

interface BalanceSheetChartProps {
  data: BalanceSheetRow[];
}

export const BalanceSheetChart: React.FC<BalanceSheetChartProps> = ({ data }) => {
  const t = useCompanyDetailT();

  if (data.length === 0) return null;
  const chartData = data.map(r => ({
    year: r.date.slice(0, 4),
    equity: r.totalStockholdersEquity,
    liabilities: r.totalLiabilities,
    netDebt: r.netDebt,
  }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>{t('adv.capitalStructure')} <InfoTip text={t('adv.capitalHelp')} /></legend>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis yAxisId="left" tick={CHART_FONT} tickFormatter={(v: number) => `$${fmtCompact(v)}`} width={52} />
          <YAxis yAxisId="right" orientation="right" tick={CHART_FONT} tickFormatter={(v: number) => `$${fmtCompact(v)}`} width={52} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => {
              const labels: Record<string, string> = { equity: t('adv.equity'), liabilities: t('adv.liabilities'), netDebt: t('adv.netDebt') };
              return [`$${fmtCompact(Number(value))}`, labels[String(name)] ?? name];
            }}
          />
          <Bar yAxisId="left" dataKey="equity" stackId="a" fill={COLOR_POSITIVE} opacity={0.5} name="equity" />
          <Bar yAxisId="left" dataKey="liabilities" stackId="a" fill="#000080" opacity={0.4} name="liabilities" />
          <Line yAxisId="right" type="monotone" dataKey="netDebt" stroke={COLOR_NEGATIVE} strokeWidth={2} dot={{ r: 2 }} name="netDebt" />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ ...FONT, display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2px', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: COLOR_POSITIVE }} /> {t('adv.equity')}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#000080' }} /> {t('adv.liabilities')}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: COLOR_NEGATIVE }} /> {t('adv.netDebt')}</span>
      </div>
    </fieldset>
  );
};

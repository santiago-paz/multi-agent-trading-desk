'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart, Bar, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { FONT, COLOR_SECONDARY, COLOR_POSITIVE } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import { InfoTip } from '../components/InfoTip';
import { CHART_FONT, fmtCompact } from '../utils';
import type { IncomeStatementRow } from '@/lib/fmp/types';

interface RevenueChartProps {
  data: IncomeStatementRow[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const t = useCompanyDetailT();

  if (data.length === 0) return <p style={{ ...FONT, color: COLOR_SECONDARY }}>{t('chart.noFinancials')}</p>;
  const chartData = data.map(r => ({
    year: r.date.slice(0, 4),
    revenue: r.revenue,
    netIncome: r.netIncome,
  }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>{t('chart.revenue')} <InfoTip text={t('chart.revenueHelp')} /></legend>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis tick={CHART_FONT} tickFormatter={(v: number) => `$${fmtCompact(v)}`} width={52} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => [`$${fmtCompact(Number(value))}`, name === 'revenue' ? 'Revenue' : 'Net Income']}
          />
          <Bar dataKey="revenue" fill="#000080" opacity={0.5} name="revenue" />
          <Line type="monotone" dataKey="netIncome" stroke={COLOR_POSITIVE} strokeWidth={2} dot={{ r: 2 }} name="netIncome" />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ ...FONT, display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2px', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#000080' }} /> Revenue</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: COLOR_POSITIVE }} /> Net Income</span>
      </div>
    </fieldset>
  );
};

'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { FONT, COLOR_POSITIVE } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import { InfoTip } from '../components/InfoTip';
import { CHART_FONT } from '../utils';
import type { IncomeStatementRow } from '@/lib/fmp/types';

interface MarginsChartProps {
  data: IncomeStatementRow[];
}

export const MarginsChart: React.FC<MarginsChartProps> = ({ data }) => {
  const t = useCompanyDetailT();

  if (data.length === 0) return null;
  const chartData = data
    .filter(r => r.revenue > 0)
    .map(r => ({
      year: r.date.slice(0, 4),
      grossMargin: ((r.grossProfit / r.revenue) * 100),
      operatingMargin: ((r.operatingIncome / r.revenue) * 100),
      netMargin: ((r.netIncome / r.revenue) * 100),
    }));
  if (chartData.length === 0) return null;
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>{t('chart.margins')} <InfoTip text={t('chart.marginsHelp')} /></legend>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis tick={CHART_FONT} tickFormatter={(v: number) => `${v.toFixed(0)}%`} width={36} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => {
              const labels: Record<string, string> = { grossMargin: t('chart.marginGross'), operatingMargin: t('chart.marginOperating'), netMargin: t('chart.marginNet') };
              return [`${Number(value).toFixed(1)}%`, labels[String(name)] ?? name];
            }}
          />
          <Area type="monotone" dataKey="grossMargin" stroke="#000080" fill="#000080" fillOpacity={0.15} strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="operatingMargin" stroke="#808000" fill="#808000" fillOpacity={0.1} strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="netMargin" stroke={COLOR_POSITIVE} fill={COLOR_POSITIVE} fillOpacity={0.1} strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ ...FONT, display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2px', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#000080' }} /> {t('chart.marginGross')}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#808000' }} /> {t('chart.marginOperating')}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: COLOR_POSITIVE }} /> {t('chart.marginNet')}</span>
      </div>
    </fieldset>
  );
};

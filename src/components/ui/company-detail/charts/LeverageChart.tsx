'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart, Bar, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { FONT } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import { InfoTip } from '../components/InfoTip';
import { CHART_FONT } from '../utils';
import type { KeyMetricsRow } from '@/lib/fmp/types';

interface LeverageChartProps {
  data: KeyMetricsRow[];
}

export const LeverageChart: React.FC<LeverageChartProps> = ({ data }) => {
  const t = useCompanyDetailT();

  if (data.length === 0) return null;
  const chartData = data.map(r => ({
    year: r.date.slice(0, 4),
    debtToEquity: r.debtToEquity,
    currentRatio: r.currentRatio,
  }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>{t('adv.leverage')} <InfoTip text={t('adv.leverageHelp')} /></legend>
      <ResponsiveContainer width="100%" height={140}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis yAxisId="left" tick={CHART_FONT} tickFormatter={(v: number) => v.toFixed(1)} width={36} />
          <YAxis yAxisId="right" orientation="right" tick={CHART_FONT} tickFormatter={(v: number) => v.toFixed(1)} width={36} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => [Number(value).toFixed(2), name === 'debtToEquity' ? 'D/E' : 'Current Ratio']}
          />
          <Bar yAxisId="left" dataKey="debtToEquity" fill="#000080" opacity={0.5} name="debtToEquity" />
          <Line yAxisId="right" type="monotone" dataKey="currentRatio" stroke="#808000" strokeWidth={2} dot={{ r: 2 }} name="currentRatio" />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ ...FONT, display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2px', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#000080' }} /> D/E</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#808000' }} /> Current Ratio</span>
      </div>
    </fieldset>
  );
};

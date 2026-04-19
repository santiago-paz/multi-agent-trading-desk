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
import type { KeyMetricsRow } from '@/lib/fmp/types';

interface ProfitabilityChartProps {
  data: KeyMetricsRow[];
}

export const ProfitabilityChart: React.FC<ProfitabilityChartProps> = ({ data }) => {
  const t = useCompanyDetailT();

  if (data.length === 0) return null;
  const chartData = data.map(r => ({ year: r.date.slice(0, 4), roe: r.roe * 100, roa: r.roa * 100 }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>{t('adv.profitability')} <InfoTip text={t('adv.profitabilityHelp')} /></legend>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis tick={CHART_FONT} tickFormatter={(v: number) => `${v.toFixed(0)}%`} width={40} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name === 'roe' ? 'ROE' : 'ROA']}
          />
          <Area type="monotone" dataKey="roe" stroke="#000080" fill="#000080" fillOpacity={0.15} strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="roa" stroke={COLOR_POSITIVE} fill={COLOR_POSITIVE} fillOpacity={0.1} strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ ...FONT, display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2px', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#000080' }} /> ROE</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: COLOR_POSITIVE }} /> ROA</span>
      </div>
    </fieldset>
  );
};

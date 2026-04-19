'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { FONT, COLOR_POSITIVE, COLOR_NEGATIVE } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import { InfoTip } from '../components/InfoTip';
import { CHART_FONT } from '../utils';
import type { IncomeStatementRow } from '@/lib/fmp/types';

interface EPSChartProps {
  data: IncomeStatementRow[];
}

export const EPSChart: React.FC<EPSChartProps> = ({ data }) => {
  const t = useCompanyDetailT();

  if (data.length === 0) return null;
  const chartData = data.map(r => ({
    year: r.date.slice(0, 4),
    eps: r.eps,
  }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>{t('chart.eps')} <InfoTip text={t('chart.epsHelp')} /></legend>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis tick={CHART_FONT} tickFormatter={(v: number) => `$${v.toFixed(2)}`} width={42} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, t('chart.eps')]}
          />
          <Bar
            dataKey="eps"
            fill={COLOR_POSITIVE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => {
              const { x, y, width, height, payload } = props;
              const fill = payload.eps >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
              return <rect x={x} y={y} width={width} height={height} fill={fill} opacity={0.7} />;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </fieldset>
  );
};

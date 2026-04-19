'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { FONT, COLOR_SECONDARY, COLOR_POSITIVE, COLOR_NEGATIVE } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import { InfoTip } from '../components/InfoTip';
import { CHART_FONT } from '../utils';

interface PriceChartProps {
  data: { date: string; close: number }[];
}

export const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  const t = useCompanyDetailT();

  if (data.length === 0) return <p style={{ ...FONT, color: COLOR_SECONDARY }}>{t('chart.noPrice')}</p>;
  const isUp = data[data.length - 1].close >= data[0].close;
  const color = isUp ? COLOR_POSITIVE : COLOR_NEGATIVE;
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>{t('chart.price')} <InfoTip text={t('chart.priceHelp')} /></legend>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis
            dataKey="date"
            tick={CHART_FONT}
            tickFormatter={(d: string) => d.slice(5)} // MM-DD
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tick={CHART_FONT}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `$${v.toFixed(v >= 100 ? 0 : 2)}`}
            width={52}
          />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, t('chart.priceTooltip')]}
            labelFormatter={(label) => String(label)}
          />
          <Area type="monotone" dataKey="close" stroke={color} strokeWidth={1.5} fill="url(#priceGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </fieldset>
  );
};

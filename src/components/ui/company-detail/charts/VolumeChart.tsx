'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { FONT } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import { InfoTip } from '../components/InfoTip';
import { CHART_FONT, fmtCompact, fmtVol } from '../utils';

interface VolumeChartProps {
  data: { date: string; volume: number }[];
}

export const VolumeChart: React.FC<VolumeChartProps> = ({ data }) => {
  const t = useCompanyDetailT();

  if (data.length === 0) return null;
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>{t('chart.volume')} <InfoTip text={t('chart.volumeHelp')} /></legend>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis
            dataKey="date"
            tick={CHART_FONT}
            tickFormatter={(d: string) => d.slice(5)}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis tick={CHART_FONT} tickFormatter={fmtCompact} width={42} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value) => [fmtVol(Number(value)), t('chart.volumeTooltip')]}
            labelFormatter={(label) => String(label)}
          />
          <Bar dataKey="volume" fill="#000080" opacity={0.6} />
        </BarChart>
      </ResponsiveContainer>
    </fieldset>
  );
};

'use client';

import React from 'react';
import { FONT, COLOR_SECONDARY, COLOR_POSITIVE, COLOR_NEGATIVE } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import { InfoTip } from '../components/InfoTip';
import { StatRow } from '../components/StatRow';
import type { FinancialScores, DCFValue } from '@/lib/fmp/types';

interface ScoresSummaryProps {
  scores: FinancialScores | null;
  dcf: DCFValue | null;
}

export const ScoresSummary: React.FC<ScoresSummaryProps> = ({ scores, dcf }) => {
  const t = useCompanyDetailT();

  if (!scores && !dcf) return <p style={{ ...FONT, color: COLOR_SECONDARY }}>{t('adv.noScores')}</p>;

  const zColor = (z: number) => z >= 2.99 ? COLOR_POSITIVE : z >= 1.81 ? '#808000' : COLOR_NEGATIVE;
  const pColor = (p: number) => p >= 7 ? COLOR_POSITIVE : p >= 4 ? '#808000' : COLOR_NEGATIVE;

  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>{t('adv.scoresTitle')} <InfoTip text={t('adv.scoresHelp')} /></legend>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {scores && (
            <>
              <StatRow
                label="Altman Z-Score"
                value={<span style={{ fontWeight: 'bold', color: zColor(scores.altmanZScore) }}>{scores.altmanZScore.toFixed(2)}</span>}
              />
              <StatRow
                label="Piotroski F-Score"
                value={<span style={{ fontWeight: 'bold', color: pColor(scores.piotroskiScore) }}>{scores.piotroskiScore.toFixed(0)}/9</span>}
              />
            </>
          )}
          {dcf && dcf.dcf > 0 && dcf.price > 0 && (
            <>
              <StatRow label={t('adv.dcfFairValue')} value={`$${dcf.dcf.toFixed(2)}`} />
              <StatRow label={t('adv.currentPrice')} value={`$${dcf.price.toFixed(2)}`} />
              <StatRow
                label={t('adv.signal')}
                value={
                  <span style={{ fontWeight: 'bold', color: dcf.dcf > dcf.price ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
                    {dcf.dcf > dcf.price ? t('adv.undervalued') : t('adv.overvalued')} ({((dcf.dcf / dcf.price - 1) * 100).toFixed(1)}%)
                  </span>
                }
              />
            </>
          )}
        </tbody>
      </table>
    </fieldset>
  );
};

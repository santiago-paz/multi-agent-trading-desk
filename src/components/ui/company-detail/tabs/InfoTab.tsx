'use client';

import React from 'react';
import { FONT, HR98, COLOR_LINK } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import { StatRow } from '../components/StatRow';
import { fmtMktCap, fmtVol } from '../utils';
import type { CompanyProfile } from '@/lib/fmp/types';

interface InfoTabProps {
  profile: CompanyProfile;
  isEtf: boolean;
}

export const InfoTab: React.FC<InfoTabProps> = ({ profile: p, isEtf }) => {
  const t = useCompanyDetailT();

  return (
    <>
      {/* Stats */}
      <fieldset style={{ margin: '4px 0 2px', padding: '4px 4px 4px 2px' }}>
        <legend style={FONT}>{isEtf ? t('info.etfData') : t('info.companyData')}</legend>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {!isEtf && p.sector && <StatRow label={t('info.sector')} value={p.sector} />}
            {!isEtf && p.industry && <StatRow label={t('info.industry')} value={p.industry} />}
            {p.mktCap > 0 && <StatRow label={t('info.marketCap')} value={fmtMktCap(p.mktCap)} />}
            {p.beta !== 0 && <StatRow label={t('info.beta')} value={p.beta.toFixed(2)} />}
            {p.volAvg > 0 && <StatRow label={t('info.avgVolume')} value={fmtVol(p.volAvg)} />}
            {p.country && <StatRow label={t('info.country')} value={p.country} />}
            {p.ipoDate && <StatRow label={isEtf ? t('info.inception') : t('info.ipo')} value={p.ipoDate} />}
            {p.website && (
              <StatRow
                label={t('info.web')}
                value={
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...FONT, color: COLOR_LINK, textDecoration: 'underline' }}
                  >
                    {p.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  </a>
                }
              />
            )}
          </tbody>
        </table>
      </fieldset>

      <hr style={HR98} />

      {/* Description */}
      <div className="sunken-panel" style={{ padding: '4px 6px', background: '#fff' }}>
        <p style={{ ...FONT, margin: 0, lineHeight: '1.4' }}>
          {p.description || t('info.noDescription')}
        </p>
      </div>
    </>
  );
};

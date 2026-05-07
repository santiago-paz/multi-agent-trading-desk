import React from 'react';
import { FONT, COL_HEADER, COL_HEADER_RIGHT, CELL, CELL_RIGHT, COLOR_SECONDARY } from '@/lib/theme/win98';
import { usePlantitaT } from '@/lib/i18n';
import { usePlantitaStore } from '@/lib/store/plantita-store';
import { SPECIES_PROFILES } from './species';
import { HOURS_PER_DAY } from './engine';

export function Graveyard() {
  const t = usePlantitaT();
  const graveyard = usePlantitaStore((s) => s.graveyard);

  return (
    <div style={{ ...FONT, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ ...FONT, margin: '0 0 4px 0', fontWeight: 'bold', fontSize: 11 }}>
        🪦 {t('cemetery.title')}
      </h3>
      {graveyard.length === 0 ? (
        <div style={{ color: COLOR_SECONDARY, padding: 6 }}>{t('cemetery.empty')}</div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            background: '#fff',
            borderTop: '1px solid #808080',
            borderLeft: '1px solid #808080',
            borderRight: '1px solid #fff',
            borderBottom: '1px solid #fff',
          }}
        >
          <table style={{ ...FONT, borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={COL_HEADER}>{t('cemetery.col.name')}</th>
                <th style={COL_HEADER}>{t('cemetery.col.species')}</th>
                <th style={COL_HEADER_RIGHT}>{t('cemetery.col.age')}</th>
                <th style={COL_HEADER}>{t('cemetery.col.cause')}</th>
              </tr>
            </thead>
            <tbody>
              {graveyard.map((p) => {
                const days = p.ageHours / HOURS_PER_DAY;
                const ageLabel =
                  days >= 1
                    ? t('statusbar.age.days', { n: Math.floor(days) })
                    : t('statusbar.age.hours', { n: Math.floor(p.ageHours) });
                return (
                  <tr key={p.id}>
                    <td style={CELL}>{p.name}</td>
                    <td style={CELL}>
                      {SPECIES_PROFILES[p.species].emoji.adult} {t(`species.${p.species}.name`)}
                    </td>
                    <td style={CELL_RIGHT}>{ageLabel}</td>
                    <td style={CELL}>{t(`cemetery.cause.${p.causeOfDeath}`)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

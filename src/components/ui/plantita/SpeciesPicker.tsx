import React, { useState } from 'react';
import { FONT, COLOR_LINK, COLOR_SECONDARY } from '@/lib/theme/win98';
import { usePlantitaT } from '@/lib/i18n';
import { usePlantitaStore } from '@/lib/store/plantita-store';
import { ALL_SPECIES, SPECIES_PROFILES } from './species';
import type { SpeciesId } from './types';
import { Graveyard } from './Graveyard';

export function SpeciesPicker() {
  const t = usePlantitaT();
  const plantSeed = usePlantitaStore((s) => s.plantSeed);
  const graveyard = usePlantitaStore((s) => s.graveyard);
  const totalDaysAlive = usePlantitaStore((s) => s.totalDaysAlive);
  const totalHarvests = usePlantitaStore((s) => s.totalHarvests);

  const [selected, setSelected] = useState<SpeciesId>('sunflower');
  const [name, setName] = useState('');
  const [showCemetery, setShowCemetery] = useState(false);

  if (showCemetery) {
    return (
      <div style={{ ...FONT, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Graveyard />
        <div style={{ marginTop: 4, textAlign: 'center' }}>
          <a
            href="#back"
            onClick={(e) => {
              e.preventDefault();
              setShowCemetery(false);
            }}
            style={{ color: COLOR_LINK, textDecoration: 'underline' }}
          >
            ← {t('picker.back')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...FONT, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <h3 style={{ ...FONT, margin: '0 0 4px 0', fontWeight: 'bold', fontSize: 11 }}>
        {t('picker.title')}
      </h3>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          background: '#fff',
          borderTop: '1px solid #808080',
          borderLeft: '1px solid #808080',
          borderRight: '1px solid #fff',
          borderBottom: '1px solid #fff',
          padding: 4,
          marginBottom: 6,
        }}
      >
        {ALL_SPECIES.map((id) => {
          const profile = SPECIES_PROFILES[id];
          const isSel = id === selected;
          return (
            <div
              key={id}
              onClick={() => setSelected(id)}
              style={{
                ...FONT,
                padding: 4,
                marginBottom: 2,
                cursor: 'pointer',
                background: isSel ? '#000080' : 'transparent',
                color: isSel ? '#fff' : '#000',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 18 }}>{profile.emoji.adult}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'bold' }}>{t(`species.${id}.name`)}</div>
                <div
                  style={{
                    fontSize: 10,
                    color: isSel ? '#cdd' : COLOR_SECONDARY,
                    whiteSpace: 'normal',
                    lineHeight: 1.2,
                  }}
                >
                  {t(`species.${id}.desc`)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 6 }}>
        <label style={{ ...FONT, flexShrink: 0 }}>{t('picker.name_label')}:</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('picker.name_placeholder')}
          maxLength={24}
          style={{ ...FONT, flex: 1 }}
        />
      </div>

      <section className="field-row" style={{ justifyContent: 'space-between', margin: 0 }}>
        <button
          onClick={() => setShowCemetery(true)}
          style={{ ...FONT, minWidth: 90 }}
          disabled={graveyard.length === 0}
        >
          🪦 {t('picker.cemetery')} ({graveyard.length})
        </button>
        <button
          onClick={() => plantSeed(selected, name)}
          style={{ ...FONT, fontWeight: 'bold', minWidth: 90 }}
        >
          🌰 {t('picker.plant')}
        </button>
      </section>

      {(totalDaysAlive > 0 || totalHarvests > 0) && (
        <div
          style={{
            ...FONT,
            marginTop: 6,
            color: COLOR_SECONDARY,
            textAlign: 'center',
            fontSize: 10,
          }}
        >
          🌿 {Math.floor(totalDaysAlive)}d · 🍅 {totalHarvests}
        </div>
      )}
    </div>
  );
}

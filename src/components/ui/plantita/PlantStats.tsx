import React from 'react';
import { FONT, COLOR_NEGATIVE, COLOR_POSITIVE, COLOR_WARNING } from '@/lib/theme/win98';
import { usePlantitaT } from '@/lib/i18n';
import type { PlantInstance } from './types';
import { SPECIES_PROFILES } from './species';

interface BarProps {
  label: string;
  value: number;
  color: string;
  warning?: string;
}

function Bar({ label, value, color, warning }: BarProps) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          ...FONT,
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 'bold',
          marginBottom: 1,
        }}
      >
        <span>{label}</span>
        <span style={{ color: warning ? COLOR_WARNING : undefined }}>
          {Math.round(value)}%{warning ? ` · ${warning}` : ''}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 10,
          background: '#fff',
          borderTop: '1px solid #808080',
          borderLeft: '1px solid #808080',
          borderRight: '1px solid #fff',
          borderBottom: '1px solid #fff',
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: '100%',
            background: color,
            transition: 'width 0.25s ease, background-color 0.25s ease',
          }}
        />
      </div>
    </div>
  );
}

interface Props {
  plant: PlantInstance;
}

export function PlantStats({ plant }: Props) {
  const t = usePlantitaT();
  const profile = SPECIES_PROFILES[plant.species];
  const [sunMin, sunMax] = profile.preferredSun;

  const waterColor =
    plant.stats.water === 0
      ? '#ff0000'
      : plant.stats.water > profile.drowningThreshold
        ? '#000080'
        : plant.stats.water < 20
          ? '#ff6060'
          : '#0080ff';
  const waterWarning =
    plant.stats.water === 0
      ? '!'
      : plant.stats.water > profile.drowningThreshold
        ? '!'
        : undefined;

  const sunInBand = plant.stats.sun >= sunMin && plant.stats.sun <= sunMax;
  const sunColor = sunInBand ? '#e0a020' : plant.stats.sun > sunMax ? '#cc4400' : '#888';

  const nutrientsColor = plant.stats.nutrients < 15 ? '#ff6060' : '#5d8a3a';
  const moodColor = plant.stats.mood < 25 ? '#ff6060' : plant.stats.mood > 70 ? '#d040a0' : '#a060c0';

  const healthColor =
    plant.health === 0
      ? COLOR_NEGATIVE
      : plant.health < 25
        ? COLOR_NEGATIVE
        : plant.health < 60
          ? COLOR_WARNING
          : COLOR_POSITIVE;

  return (
    <div style={{ ...FONT, padding: '4px 6px' }}>
      <Bar label={`💧 ${t('stat.water')}`} value={plant.stats.water} color={waterColor} warning={waterWarning} />
      <Bar
        label={`☀️ ${t('stat.sun')} (${sunMin}-${sunMax})`}
        value={plant.stats.sun}
        color={sunColor}
      />
      <Bar label={`🌱 ${t('stat.nutrients')}`} value={plant.stats.nutrients} color={nutrientsColor} />
      <Bar label={`😊 ${t('stat.mood')}`} value={plant.stats.mood} color={moodColor} />
      <div
        style={{
          ...FONT,
          marginTop: 2,
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>❤️ {t('stat.health')}</span>
        <span style={{ color: healthColor }}>{Math.round(plant.health)}</span>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { FONT, COLOR_LINK, COLOR_NEGATIVE } from '@/lib/theme/win98';
import { usePlantitaT } from '@/lib/i18n';
import { usePlantitaStore } from '@/lib/store/plantita-store';
import { useGameLoop } from './useGameLoop';
import { PlantAvatar } from './PlantAvatar';
import { PlantStats } from './PlantStats';
import { PlantActions } from './PlantActions';
import { PlantLog } from './PlantLog';
import { SpeciesPicker } from './SpeciesPicker';
import { pickCauseOfDeath, HOURS_PER_DAY } from './engine';

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function PlantitaWidget() {
  useGameLoop();
  const t = usePlantitaT();
  const now = useNow(1000);

  const current = usePlantitaStore((s) => s.current);
  const inventory = usePlantitaStore((s) => s.inventory);
  const log = usePlantitaStore((s) => s.log);
  const acknowledgeDeath = usePlantitaStore((s) => s.acknowledgeDeath);
  const resetAll = usePlantitaStore((s) => s.resetAll);

  if (!current) {
    return (
      <div style={{ ...FONT, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <SpeciesPicker />
      </div>
    );
  }

  const isDead = current.health === 0;

  if (isDead) {
    const cause = pickCauseOfDeath(current);
    return (
      <div
        style={{
          ...FONT,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 12, transform: 'rotate(90deg)', filter: 'grayscale(100%)' }}>
          🥀
        </div>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{t('death.title')}</div>
        <div style={{ color: COLOR_NEGATIVE, marginBottom: 12 }}>
          {t('death.cause', { cause: t(`cemetery.cause.${cause}`) })}
        </div>
        <button onClick={acknowledgeDeath} style={{ ...FONT, fontWeight: 'bold', minWidth: 140 }}>
          🌰 {t('death.acknowledge')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...FONT, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PlantAvatar plant={current} />
      <PlantStats plant={current} />
      <PlantLog log={log} />
      <PlantActions plant={current} inventory={inventory} now={now} />
      <div
        style={{
          ...FONT,
          padding: '0 6px 4px 6px',
          textAlign: 'right',
        }}
      >
        <a
          href="#reset"
          onClick={(e) => {
            e.preventDefault();
            if (window.confirm(t('button.confirm_reset'))) resetAll();
          }}
          style={{ color: COLOR_LINK, fontSize: 10, textDecoration: 'underline' }}
        >
          {t('button.reset_all')}
        </a>
      </div>
    </div>
  );
}

export function getStatusBarText(
  current: ReturnType<typeof usePlantitaStore.getState>['current'],
  t: ReturnType<typeof usePlantitaT>,
): string {
  if (!current) return t('statusbar.empty');
  if (current.health === 0) return t('statusbar.dead');
  const days = current.ageHours / HOURS_PER_DAY;
  const age = days >= 1
    ? t('statusbar.age.days', { n: Math.floor(days) })
    : t('statusbar.age.hours', { n: Math.floor(current.ageHours) });
  return t('statusbar.alive', {
    name: current.name,
    species: t(`species.${current.species}.name`),
    age,
  });
}

import React from 'react';
import { FONT } from '@/lib/theme/win98';
import { usePlantitaT } from '@/lib/i18n';
import { usePlantitaStore } from '@/lib/store/plantita-store';
import type { ActionId, InventoryState, PlantInstance } from './types';

interface ActionDef {
  id: ActionId;
  emoji: string;
  badge?: (inv: InventoryState, plant: PlantInstance) => string | null;
  available?: (inv: InventoryState, plant: PlantInstance) => boolean;
}

const ACTIONS: ActionDef[] = [
  { id: 'water_small', emoji: '💧' },
  { id: 'water_large', emoji: '🌊' },
  {
    id: 'fertilize',
    emoji: '🌱',
    badge: (inv) => `×${inv.fertilizer}`,
    available: (inv) => inv.fertilizer > 0,
  },
  { id: 'sing', emoji: '🎵' },
  {
    id: 'prune',
    emoji: '✂️',
    badge: (inv) => (inv.pruningShears ? null : '🚫'),
    available: (inv) => inv.pruningShears,
  },
  {
    id: 'repel_pests',
    emoji: '🧪',
    badge: (inv) => `×${inv.repellent}`,
    available: (inv) => inv.repellent > 0,
  },
  {
    id: 'harvest',
    emoji: '🍎',
    badge: (_inv, plant) => (plant.pendingHarvest > 0 ? `×${plant.pendingHarvest}` : null),
    available: (_inv, plant) => plant.pendingHarvest > 0,
  },
  { id: 'toggle_light', emoji: '☀️' },
];

interface Props {
  plant: PlantInstance;
  inventory: InventoryState;
  now: number;
}

export function PlantActions({ plant, inventory, now }: Props) {
  const t = usePlantitaT();
  const performAction = usePlantitaStore((s) => s.performAction);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 3,
        padding: '4px 6px 6px 6px',
      }}
    >
      {ACTIONS.map((a) => {
        const cdUntil = plant.cooldowns[a.id] ?? 0;
        const remaining = Math.max(0, cdUntil - now);
        const onCooldown = remaining > 0;
        const hasResource = a.available ? a.available(inventory, plant) : true;
        const disabled = plant.health === 0 || onCooldown || !hasResource;
        const badge = a.badge ? a.badge(inventory, plant) : null;
        const labelText = a.id === 'toggle_light'
          ? plant.lightMode === 'sun'
            ? `🌑 ${t('stat.lightmode.shade')}`
            : `☀️ ${t('stat.lightmode.sun')}`
          : `${a.emoji} ${t(`action.${a.id}` as Parameters<typeof t>[0])}`;

        const cdLabel = onCooldown
          ? remaining > 60_000
            ? `${Math.ceil(remaining / 60_000)}m`
            : `${Math.ceil(remaining / 1000)}s`
          : null;

        return (
          <button
            key={a.id}
            onClick={() => performAction(a.id)}
            disabled={disabled}
            style={{
              ...FONT,
              minHeight: 28,
              padding: '2px 4px',
              textAlign: 'center',
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled && !onCooldown ? 0.55 : 1,
              position: 'relative',
              overflow: 'hidden',
            }}
            title={cdLabel ? t('action.cooldown', { n: cdLabel }) : undefined}
          >
            <span>{labelText}</span>
            {badge && (
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 10,
                  color: '#444',
                }}
              >
                {badge}
              </span>
            )}
            {cdLabel && (
              <span style={{ marginLeft: 4, fontSize: 10, color: '#a04040' }}>{cdLabel}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

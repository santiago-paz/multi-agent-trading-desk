import React from 'react';
import type { PlantInstance } from './types';
import { SPECIES_PROFILES } from './species';

const KEYFRAMES = `
@keyframes plantita-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
@keyframes plantita-wilt {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(-5deg); }
}
@keyframes plantita-glow {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(255,200,80,0.6)); }
  50% { filter: drop-shadow(0 0 8px rgba(255,200,80,0.95)); }
}
`;

const STYLE_TAG_ID = 'plantita-avatar-keyframes';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_TAG_ID;
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
}

interface Props {
  plant: PlantInstance;
}

export function PlantAvatar({ plant }: Props) {
  ensureKeyframes();
  const profile = SPECIES_PROFILES[plant.species];
  const isDead = plant.health === 0;
  const emoji = profile.emoji[plant.stage];

  let animation: string | undefined;
  let extraFilter: string | undefined;
  if (isDead) {
    animation = undefined;
  } else if (plant.stage === 'flowering' || plant.stage === 'fruiting') {
    animation = 'plantita-glow 2.4s ease-in-out infinite';
  } else if (plant.stats.water < 20) {
    animation = 'plantita-wilt 1.4s ease-in-out infinite';
    extraFilter = 'saturate(0.6)';
  } else if (plant.stats.mood > 70 && plant.health > 60) {
    animation = 'plantita-pulse 2.2s ease-in-out infinite';
  }

  const eventBadges: { id: string; emoji: string }[] = plant.activeEvents.map((e) => {
    const badgeMap: Record<string, string> = {
      aphids: '🐛',
      cloudy: '☁',
      drought: '🥵',
      heatwave: '🔥',
      butterfly: '🦋',
      bloom: '🌸',
      fruit_ripens: '🍎',
    };
    return { id: e.id, emoji: badgeMap[e.id] ?? '✨' };
  });

  return (
    <div
      style={{
        position: 'relative',
        height: 96,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        aria-label={isDead ? 'planta-muerta' : `planta-${plant.stage}`}
        style={{
          fontSize: 64,
          lineHeight: 1,
          animation,
          filter: isDead ? 'grayscale(100%)' : extraFilter,
          transform: isDead ? 'rotate(90deg)' : undefined,
          transition: 'transform 0.5s ease, filter 0.4s ease',
          userSelect: 'none',
        }}
      >
        {isDead ? '🥀' : emoji}
      </div>
      {plant.lightMode === 'sun' && !isDead && (
        <div style={{ position: 'absolute', top: 4, left: 8, fontSize: 18 }}>☀️</div>
      )}
      {plant.lightMode === 'shade' && !isDead && (
        <div style={{ position: 'absolute', top: 4, left: 8, fontSize: 18 }}>🌑</div>
      )}
      {plant.pendingHarvest > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 8,
            fontSize: 11,
            background: '#ffffe1',
            border: '1px solid #000',
            padding: '0 4px',
          }}
        >
          🍅×{plant.pendingHarvest}
        </div>
      )}
      {eventBadges.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 4,
            display: 'flex',
            gap: 2,
            fontSize: 18,
          }}
        >
          {eventBadges.map((b) => (
            <span key={b.id}>{b.emoji}</span>
          ))}
        </div>
      )}
    </div>
  );
}

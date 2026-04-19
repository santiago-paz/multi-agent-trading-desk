// ─── AI Model Configuration ─────────────────────────────────────────────────

export const AI_MODELS = [
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5',
    descriptionKey: 'model.haiku',
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    descriptionKey: 'model.sonnet',
  },
  {
    id: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    descriptionKey: 'model.opus',
  },
] as const;

export type AIModelId = typeof AI_MODELS[number]['id'];

export const DEFAULT_MODEL: AIModelId = 'claude-haiku-4-5-20251001';

// ─── BYMA Market Hours ─────────────────────────────────────────────────────
//
// BYMA (Bolsas y Mercados Argentinos) operates Monday–Friday:
//   Pre-apertura: 10:00 – 11:00 ART
//   Rueda continua: 11:00 – 17:00 ART
// ART = UTC-3 (Argentina does not observe daylight saving time)

const BYMA_OPEN_HOUR = 11;
const BYMA_CLOSE_HOUR = 17;
const ART_UTC_OFFSET = -3;

export interface MarketStatus {
  open: boolean;
  /** i18n key under 'market.' namespace */
  reasonKey: string;
  /** interpolation params for the reason key */
  reasonParams?: Record<string, string | number>;
}

export function isMarketOpen(now: Date = new Date()): MarketStatus {
  // Convert to ART (UTC-3)
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const artMinutesTotal = (utcHours * 60 + utcMinutes) + ART_UTC_OFFSET * 60;
  // Wrap around midnight
  const artMinutes = ((artMinutesTotal % 1440) + 1440) % 1440;
  const artHour = Math.floor(artMinutes / 60);
  const artMin = artMinutes % 60;

  // Get day of week in ART
  const artDate = new Date(now.getTime() + ART_UTC_OFFSET * 60 * 60 * 1000);
  const dayOfWeek = artDate.getUTCDay(); // 0=Sun, 6=Sat

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { open: false, reasonKey: 'market.weekend' };
  }

  if (artHour < BYMA_OPEN_HOUR) {
    return { open: false, reasonKey: 'market.opensAt', reasonParams: { hour: `${BYMA_OPEN_HOUR}:00` } };
  }

  if (artHour >= BYMA_CLOSE_HOUR) {
    return { open: false, reasonKey: 'market.closedAt', reasonParams: { hour: `${BYMA_CLOSE_HOUR}:00` } };
  }

  return { open: true, reasonKey: 'market.continuous', reasonParams: { time: `${artHour}:${artMin.toString().padStart(2, '0')}` } };
}

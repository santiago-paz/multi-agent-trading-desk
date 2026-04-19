// ─── AI Model Configuration ─────────────────────────────────────────────────

export const AI_MODELS = [
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5',
    description: 'Rápido y económico',
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    description: 'Equilibrio entre velocidad y calidad',
  },
  {
    id: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    description: 'Máxima capacidad de razonamiento',
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

export function isMarketOpen(now: Date = new Date()): { open: boolean; reason: string } {
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
    return { open: false, reason: 'fin de semana' };
  }

  if (artHour < BYMA_OPEN_HOUR) {
    return { open: false, reason: `abre a las ${BYMA_OPEN_HOUR}:00 ART` };
  }

  if (artHour >= BYMA_CLOSE_HOUR) {
    return { open: false, reason: `cerró a las ${BYMA_CLOSE_HOUR}:00 ART` };
  }

  return { open: true, reason: `rueda continua (${artHour}:${artMin.toString().padStart(2, '0')} ART)` };
}

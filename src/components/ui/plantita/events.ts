import type { ActiveEvent, EventId, PlantInstance, Rng } from './types';
import { SPECIES_PROFILES } from './species';

export interface EventConfig {
  id: EventId;
  durationMs: number;
  baseProbability: number;
  isBad: boolean;
}

const HOUR = 60 * 60 * 1000;

export const EVENT_CONFIG: Record<EventId, EventConfig> = {
  aphids: { id: 'aphids', durationMs: 6 * HOUR, baseProbability: 0.005, isBad: true },
  cloudy: { id: 'cloudy', durationMs: 30 * 60 * 1000, baseProbability: 0.015, isBad: false },
  butterfly: { id: 'butterfly', durationMs: 0, baseProbability: 0.012, isBad: false },
  drought: { id: 'drought', durationMs: HOUR, baseProbability: 0.004, isBad: true },
  heatwave: { id: 'heatwave', durationMs: 45 * 60 * 1000, baseProbability: 0.003, isBad: true },
  bloom: { id: 'bloom', durationMs: 0, baseProbability: 0.02, isBad: false },
  fruit_ripens: { id: 'fruit_ripens', durationMs: 0, baseProbability: 0.025, isBad: false },
};

const MAX_ACTIVE_EVENTS = 2;

const CONFLICTS: Partial<Record<EventId, EventId[]>> = {
  drought: ['heatwave', 'cloudy'],
  heatwave: ['drought', 'cloudy'],
  cloudy: ['drought', 'heatwave'],
};

function isActive(events: ActiveEvent[], id: EventId): boolean {
  return events.some((e) => e.id === id);
}

function conflicts(events: ActiveEvent[], candidate: EventId): boolean {
  const list = CONFLICTS[candidate];
  if (!list) return false;
  return list.some((id) => isActive(events, id));
}

function adjustedProbability(plant: PlantInstance, id: EventId): number {
  const cfg = EVENT_CONFIG[id];
  let p = cfg.baseProbability;

  if (id === 'aphids') {
    if (plant.stats.nutrients > 80) p *= 1.6;
    if (plant.stats.mood < 30) p *= 1.4;
  }

  if (id === 'butterfly' && plant.stats.mood > 70) p *= 1.3;

  const profile = SPECIES_PROFILES[plant.species];
  const onlyForFruit = id === 'fruit_ripens';
  const onlyForFlower = id === 'bloom';
  if (onlyForFruit && profile.yields !== 'fruit') return 0;
  if (onlyForFlower && profile.yields !== 'flower') return 0;
  if (onlyForFruit || onlyForFlower) {
    if (plant.stage !== 'adult') return 0;
    if (plant.health < 70) return 0;
    if (plant.comfortStreak < 12) return 0;
  }

  return p;
}

export function rollEvents(plant: PlantInstance, now: number, rng: Rng): EventId[] {
  if (plant.activeEvents.length >= MAX_ACTIVE_EVENTS) return [];
  const triggered: EventId[] = [];
  const ids = Object.keys(EVENT_CONFIG) as EventId[];

  for (const id of ids) {
    if (isActive(plant.activeEvents, id)) continue;
    if (conflicts(plant.activeEvents, id)) continue;
    const p = adjustedProbability(plant, id);
    if (p <= 0) continue;
    if (rng() < p) {
      triggered.push(id);
      if (plant.activeEvents.length + triggered.length >= MAX_ACTIVE_EVENTS) break;
    }
  }
  void now;
  return triggered;
}

export function expireEvents(plant: PlantInstance, now: number): { kept: ActiveEvent[]; expired: EventId[] } {
  const kept: ActiveEvent[] = [];
  const expired: EventId[] = [];
  for (const e of plant.activeEvents) {
    if (e.durationMs > 0 && now - e.startedAt >= e.durationMs) {
      expired.push(e.id);
    } else {
      kept.push(e);
    }
  }
  return { kept, expired };
}

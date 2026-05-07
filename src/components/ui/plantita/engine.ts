import type {
  ActionId,
  ApplyActionResult,
  DeathCause,
  EngineEvent,
  InventoryState,
  PlantInstance,
  Rng,
  SpeciesId,
  StageId,
  TickResult,
} from './types';
import { SPECIES_PROFILES } from './species';
import { EVENT_CONFIG, expireEvents, rollEvents } from './events';

export const TICK_INTERVAL_MS = 2500;
export const MAX_CATCHUP_TICKS = 168;
export const HOURS_PER_TICK = 1;
export const HOURS_PER_DAY = 24;

const HEALTH_DELTA_CAP = 3;
const HEALTH_CRITICAL_THRESHOLD = 15;

export const ACTION_COOLDOWN_MS: Record<ActionId, number> = {
  water_small: 8_000,
  water_large: 8_000,
  fertilize: 6 * 60 * 60 * 1000,
  sing: 30_000,
  prune: 24 * 60 * 60 * 1000,
  repel_pests: 30_000,
  harvest: 0,
  toggle_light: 0,
};

const STAGE_ORDER: StageId[] = ['seed', 'sprout', 'sapling', 'young', 'adult'];

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function cooldownActive(plant: PlantInstance, action: ActionId, now: number): boolean {
  const until = plant.cooldowns[action] ?? 0;
  return now < until;
}

function setCooldown(plant: PlantInstance, action: ActionId, now: number): PlantInstance {
  const ms = ACTION_COOLDOWN_MS[action];
  if (ms <= 0) return plant;
  return { ...plant, cooldowns: { ...plant.cooldowns, [action]: now + ms } };
}

export function deriveHealthDelta(plant: PlantInstance): number {
  const profile = SPECIES_PROFILES[plant.species];
  let d = 0;

  if (plant.stats.water === 0) d -= 3;
  else if (plant.stats.water < 15) d -= 1;
  if (plant.stats.water > profile.drowningThreshold) d -= 2;

  if (plant.stats.nutrients < 10) d -= 1;

  const [sunMin, sunMax] = profile.preferredSun;
  if (plant.stats.sun < sunMin || plant.stats.sun > sunMax) d -= 1;

  if (plant.activeEvents.some((e) => e.id === 'aphids')) d -= 2;
  if (plant.activeEvents.some((e) => e.id === 'heatwave') && plant.stats.water < 40) d -= 2;

  const isComfy =
    plant.stats.water >= 25 &&
    plant.stats.water <= profile.drowningThreshold &&
    plant.stats.nutrients > 25 &&
    plant.stats.sun >= sunMin &&
    plant.stats.sun <= sunMax;

  if (isComfy && plant.stats.mood > 60) d += 2;
  else if (isComfy) d += 1;

  return Math.max(-HEALTH_DELTA_CAP, Math.min(HEALTH_DELTA_CAP, d));
}

export function pickCauseOfDeath(plant: PlantInstance): DeathCause {
  const profile = SPECIES_PROFILES[plant.species];
  if (plant.stats.water === 0) return 'thirst';
  if (plant.stats.water > profile.drowningThreshold) return 'drowned';
  if (plant.stats.nutrients < 10) return 'starved';
  if (plant.activeEvents.some((e) => e.id === 'aphids')) return 'pests';
  const ageDays = plant.ageHours / HOURS_PER_DAY;
  if (ageDays > profile.longevityDays) return 'old_age';
  return 'thirst';
}

function nextStage(stage: StageId, profile = SPECIES_PROFILES.cactus): StageId | null {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx >= 0 && idx < STAGE_ORDER.length - 1) return STAGE_ORDER[idx + 1];
  if (stage === 'adult') return profile.finalStage;
  return null;
}

export function checkStageUp(
  plant: PlantInstance,
  hasShears: boolean,
): { stage: StageId; advanced: boolean } {
  const profile = SPECIES_PROFILES[plant.species];
  const next = nextStage(plant.stage, profile);
  if (!next) return { stage: plant.stage, advanced: false };
  if (plant.health < 70) return { stage: plant.stage, advanced: false };

  const requiredHours = profile.growthHoursPerStage[plant.stage] ?? 0;
  if (plant.ageHours < requiredHours) return { stage: plant.stage, advanced: false };

  if ((next === 'flowering' || next === 'fruiting') && !hasShears) {
    return { stage: plant.stage, advanced: false };
  }

  return { stage: next, advanced: true };
}

function decayWater(plant: PlantInstance): number {
  const profile = SPECIES_PROFILES[plant.species];
  let decay = profile.waterDecayPerTick;
  if (plant.activeEvents.some((e) => e.id === 'drought')) decay *= 2;
  if (plant.activeEvents.some((e) => e.id === 'heatwave')) decay *= 3;
  return clamp(plant.stats.water - decay);
}

function changeSun(plant: PlantInstance): number {
  const profile = SPECIES_PROFILES[plant.species];
  let delta = profile.sunGainPerTick;
  if (plant.activeEvents.some((e) => e.id === 'cloudy')) delta *= 0.3;
  return plant.lightMode === 'sun'
    ? clamp(plant.stats.sun + delta)
    : clamp(plant.stats.sun - delta);
}

function decayNutrients(plant: PlantInstance): number {
  const profile = SPECIES_PROFILES[plant.species];
  return clamp(plant.stats.nutrients - profile.nutrientDecayPerTick);
}

function decayMood(plant: PlantInstance): number {
  const profile = SPECIES_PROFILES[plant.species];
  let delta = -0.3;
  const [sunMin, sunMax] = profile.preferredSun;
  const sunHappy = plant.stats.sun >= sunMin && plant.stats.sun <= sunMax;
  if (sunHappy) delta += 0.4;
  if (profile.moodLovesSun && plant.lightMode === 'sun' && sunHappy) delta += 0.3;
  if (plant.stats.water === 0 || plant.stats.water > profile.drowningThreshold) delta -= 0.5;
  if (plant.activeEvents.some((e) => e.id === 'aphids')) delta -= 0.6;
  return clamp(plant.stats.mood + delta);
}

function isComfortable(plant: PlantInstance): boolean {
  const profile = SPECIES_PROFILES[plant.species];
  const [sunMin, sunMax] = profile.preferredSun;
  return (
    plant.stats.water >= 25 &&
    plant.stats.water <= profile.drowningThreshold &&
    plant.stats.nutrients > 25 &&
    plant.stats.sun >= sunMin &&
    plant.stats.sun <= sunMax &&
    plant.health > 50
  );
}

export function tick(
  plant: PlantInstance,
  inventory: InventoryState,
  now: number,
  rng: Rng,
): TickResult {
  const events: EngineEvent[] = [];
  let next: PlantInstance = plant;

  const { kept, expired } = expireEvents(next, now);
  if (expired.length > 0) {
    next = { ...next, activeEvents: kept };
    for (const id of expired) events.push({ kind: 'event_end', event: id });
  }

  const triggered = rollEvents(next, now, rng);
  if (triggered.length > 0) {
    const newActive = [
      ...next.activeEvents,
      ...triggered.map((id) => ({
        id,
        startedAt: now,
        durationMs: EVENT_CONFIG[id].durationMs,
      })),
    ];
    next = { ...next, activeEvents: newActive };
    for (const id of triggered) events.push({ kind: 'event_start', event: id });

    for (const id of triggered) {
      if (id === 'butterfly') {
        next = { ...next, stats: { ...next.stats, mood: clamp(next.stats.mood + 10) } };
      } else if (id === 'fruit_ripens') {
        next = { ...next, pendingHarvest: next.pendingHarvest + 1 };
      } else if (id === 'bloom') {
        if (!inventory.pruningShears) {
          events.push({ kind: 'pruning_shears_acquired' });
        }
      }
    }
  }

  const water = decayWater(next);
  const sun = changeSun(next);
  const nutrients = decayNutrients(next);
  const mood = decayMood(next);
  next = { ...next, stats: { water, sun, nutrients, mood } };

  const delta = deriveHealthDelta(next);
  const newHealth = clamp(next.health + delta);
  next = { ...next, health: newHealth };

  if (newHealth > 0 && newHealth <= HEALTH_CRITICAL_THRESHOLD && plant.health > HEALTH_CRITICAL_THRESHOLD) {
    events.push({ kind: 'health_critical' });
  }

  next = {
    ...next,
    ageHours: next.ageHours + HOURS_PER_TICK,
    comfortStreak: isComfortable(next) ? next.comfortStreak + 1 : 0,
    lastTickAt: now,
  };

  if (newHealth === 0) {
    const cause = pickCauseOfDeath(next);
    events.push({ kind: 'death', cause });
    return { state: next, events };
  }

  const stageCheck = checkStageUp(next, inventory.pruningShears);
  if (stageCheck.advanced) {
    events.push({ kind: 'stage_up', from: next.stage, to: stageCheck.stage });
    next = { ...next, stage: stageCheck.stage };
  }

  return { state: next, events };
}

export function applyAction(
  plant: PlantInstance,
  inventory: InventoryState,
  action: ActionId,
  now: number,
): ApplyActionResult {
  const noop = (): ApplyActionResult => ({
    state: plant,
    inventory,
    events: [{ kind: 'action', action, result: 'no_effect' }],
    applied: false,
  });

  if (cooldownActive(plant, action, now)) return noop();

  const events: EngineEvent[] = [];
  let next = plant;
  let nextInv = inventory;

  switch (action) {
    case 'water_small': {
      const newWater = clamp(plant.stats.water + 12);
      next = { ...plant, stats: { ...plant.stats, water: newWater } };
      next = setCooldown(next, 'water_small', now);
      next = setCooldown(next, 'water_large', now);
      events.push({ kind: 'action', action, result: 'ok' });
      break;
    }
    case 'water_large': {
      const wasHigh = plant.stats.water > 70;
      const newWater = clamp(plant.stats.water + 30);
      next = { ...plant, stats: { ...plant.stats, water: newWater } };
      if (wasHigh) next = { ...next, health: clamp(next.health - 2) };
      next = setCooldown(next, 'water_small', now);
      next = setCooldown(next, 'water_large', now);
      events.push({ kind: 'action', action, result: wasHigh ? 'too_much' : 'ok' });
      break;
    }
    case 'fertilize': {
      if (inventory.fertilizer <= 0) return noop();
      next = {
        ...plant,
        stats: { ...plant.stats, nutrients: clamp(plant.stats.nutrients + 50) },
      };
      next = setCooldown(next, 'fertilize', now);
      nextInv = { ...inventory, fertilizer: inventory.fertilizer - 1 };
      events.push({ kind: 'action', action, result: 'ok' });
      break;
    }
    case 'sing': {
      next = { ...plant, stats: { ...plant.stats, mood: clamp(plant.stats.mood + 15) } };
      next = setCooldown(next, 'sing', now);
      events.push({ kind: 'action', action, result: 'ok' });
      break;
    }
    case 'prune': {
      if (!inventory.pruningShears) return noop();
      next = { ...plant, prunedOnce: true };
      next = setCooldown(next, 'prune', now);
      events.push({ kind: 'action', action, result: 'ok' });
      break;
    }
    case 'repel_pests': {
      if (inventory.repellent <= 0) return noop();
      const hasAphids = plant.activeEvents.some((e) => e.id === 'aphids');
      if (!hasAphids) {
        nextInv = { ...inventory, repellent: inventory.repellent - 1 };
        next = setCooldown(plant, 'repel_pests', now);
        events.push({ kind: 'action', action, result: 'no_effect' });
        return { state: next, inventory: nextInv, events, applied: true };
      }
      const filtered = plant.activeEvents.filter((e) => e.id !== 'aphids');
      next = { ...plant, activeEvents: filtered };
      next = setCooldown(next, 'repel_pests', now);
      nextInv = { ...inventory, repellent: inventory.repellent - 1 };
      events.push({ kind: 'event_end', event: 'aphids' });
      events.push({ kind: 'action', action, result: 'ok' });
      break;
    }
    case 'harvest': {
      if (plant.pendingHarvest <= 0) return noop();
      const count = plant.pendingHarvest;
      next = {
        ...plant,
        pendingHarvest: 0,
        stats: { ...plant.stats, mood: clamp(plant.stats.mood + 5) },
      };
      const fertGain = count;
      const repelGain = Math.floor(count / 2);
      nextInv = {
        ...inventory,
        fertilizer: inventory.fertilizer + fertGain,
        repellent: inventory.repellent + repelGain,
      };
      events.push({ kind: 'harvest', count });
      events.push({ kind: 'action', action, result: 'ok' });
      break;
    }
    case 'toggle_light': {
      next = { ...plant, lightMode: plant.lightMode === 'sun' ? 'shade' : 'sun' };
      events.push({ kind: 'action', action, result: 'ok' });
      break;
    }
  }

  return { state: next, inventory: nextInv, events, applied: true };
}

export function newPlant(species: SpeciesId, name: string, now: number, id: string): PlantInstance {
  return {
    id,
    name,
    species,
    stage: 'seed',
    bornAt: now,
    lastTickAt: now,
    ageHours: 0,
    comfortStreak: 0,
    prunedOnce: false,
    stats: { water: 60, sun: 50, nutrients: 60, mood: 60 },
    health: 70,
    lightMode: 'sun',
    cooldowns: {},
    activeEvents: [],
    pendingHarvest: 0,
  };
}

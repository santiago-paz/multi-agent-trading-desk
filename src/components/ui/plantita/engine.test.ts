import { describe, expect, it } from 'vitest';
import {
  applyAction,
  checkStageUp,
  deriveHealthDelta,
  newPlant,
  pickCauseOfDeath,
  tick,
} from './engine';
import { rollEvents } from './events';
import { SPECIES_PROFILES } from './species';
import type { InventoryState, PlantInstance, SpeciesId } from './types';

const T0 = 1_700_000_000_000;

function freshInventory(): InventoryState {
  return { fertilizer: 0, repellent: 0, pruningShears: false };
}

function makePlant(species: SpeciesId, overrides: Partial<PlantInstance> = {}): PlantInstance {
  const p = newPlant(species, 'Test', T0, 'id-1');
  return { ...p, ...overrides, stats: { ...p.stats, ...(overrides.stats ?? {}) } };
}

const noEventsRng = () => 0.999;

describe('engine.tick — water decay by species', () => {
  it('cactus decays water slower than baseline', () => {
    const plant = makePlant('cactus');
    const { state } = tick(plant, freshInventory(), T0 + 2500, noEventsRng);
    expect(state.stats.water).toBe(60 - SPECIES_PROFILES.cactus.waterDecayPerTick);
  });

  it('tomato decays water faster than baseline', () => {
    const plant = makePlant('tomato');
    const { state } = tick(plant, freshInventory(), T0 + 2500, noEventsRng);
    expect(state.stats.water).toBe(60 - SPECIES_PROFILES.tomato.waterDecayPerTick);
  });
});

describe('engine.tick — sun depends on lightMode', () => {
  it('sun rises when lightMode is sun', () => {
    const plant = makePlant('sunflower', { lightMode: 'sun', stats: { water: 60, sun: 50, nutrients: 60, mood: 60 } });
    const { state } = tick(plant, freshInventory(), T0 + 2500, noEventsRng);
    expect(state.stats.sun).toBeGreaterThan(50);
  });

  it('sun drops when lightMode is shade', () => {
    const plant = makePlant('sunflower', { lightMode: 'shade', stats: { water: 60, sun: 50, nutrients: 60, mood: 60 } });
    const { state } = tick(plant, freshInventory(), T0 + 2500, noEventsRng);
    expect(state.stats.sun).toBeLessThan(50);
  });
});

describe('engine.deriveHealthDelta', () => {
  it('penalizes drowning (water above species threshold)', () => {
    const plant = makePlant('cactus', { stats: { water: 90, sun: 80, nutrients: 60, mood: 60 } });
    expect(deriveHealthDelta(plant)).toBeLessThan(0);
  });

  it('rewards comfort with positive delta', () => {
    const plant = makePlant('sunflower', {
      stats: { water: 50, sun: 80, nutrients: 60, mood: 80 },
    });
    expect(deriveHealthDelta(plant)).toBeGreaterThan(0);
  });

  it('penalizes aphids', () => {
    const comfy = makePlant('sunflower', { stats: { water: 50, sun: 80, nutrients: 60, mood: 80 } });
    const withAphids = {
      ...comfy,
      activeEvents: [{ id: 'aphids' as const, startedAt: T0, durationMs: 1_000_000 }],
    };
    expect(deriveHealthDelta(withAphids)).toBeLessThan(deriveHealthDelta(comfy));
  });
});

describe('engine.applyAction', () => {
  it('water_small clamps water to 100 and sets cooldown', () => {
    const plant = makePlant('sunflower', { stats: { water: 95, sun: 80, nutrients: 60, mood: 60 } });
    const r = applyAction(plant, freshInventory(), 'water_small', T0);
    expect(r.applied).toBe(true);
    expect(r.state.stats.water).toBe(100);
    expect(r.state.cooldowns.water_small).toBe(T0 + 8000);
  });

  it('blocks second water_small while on cooldown', () => {
    const plant = makePlant('sunflower');
    const r1 = applyAction(plant, freshInventory(), 'water_small', T0);
    const r2 = applyAction(r1.state, freshInventory(), 'water_small', T0 + 1000);
    expect(r2.applied).toBe(false);
  });

  it('water_large with already-high water hurts health', () => {
    const plant = makePlant('sunflower', { stats: { water: 80, sun: 80, nutrients: 60, mood: 60 }, health: 90 });
    const r = applyAction(plant, freshInventory(), 'water_large', T0);
    expect(r.applied).toBe(true);
    expect(r.state.health).toBe(88);
    expect(r.events.find((e) => e.kind === 'action')).toMatchObject({ result: 'too_much' });
  });

  it('fertilize consumes 1 fertilizer', () => {
    const plant = makePlant('sunflower', { stats: { water: 60, sun: 60, nutrients: 20, mood: 60 } });
    const inv = { fertilizer: 2, repellent: 0, pruningShears: false };
    const r = applyAction(plant, inv, 'fertilize', T0);
    expect(r.applied).toBe(true);
    expect(r.inventory.fertilizer).toBe(1);
    expect(r.state.stats.nutrients).toBe(70);
  });

  it('fertilize without inventory is no-op', () => {
    const plant = makePlant('sunflower');
    const r = applyAction(plant, freshInventory(), 'fertilize', T0);
    expect(r.applied).toBe(false);
  });

  it('toggle_light flips lightMode', () => {
    const plant = makePlant('sunflower', { lightMode: 'sun' });
    const r = applyAction(plant, freshInventory(), 'toggle_light', T0);
    expect(r.state.lightMode).toBe('shade');
  });

  it('harvest with pendingHarvest grants fertilizer reward', () => {
    const plant = makePlant('tomato', { pendingHarvest: 4 });
    const r = applyAction(plant, freshInventory(), 'harvest', T0);
    expect(r.applied).toBe(true);
    expect(r.state.pendingHarvest).toBe(0);
    expect(r.inventory.fertilizer).toBe(4);
    expect(r.inventory.repellent).toBe(2);
  });
});

describe('engine.checkStageUp', () => {
  it('does not advance below required hours', () => {
    const plant = makePlant('sunflower', { stage: 'seed', ageHours: 1, health: 90 });
    const r = checkStageUp(plant, false);
    expect(r.advanced).toBe(false);
  });

  it('advances seed → sprout when health and age suffice', () => {
    const plant = makePlant('sunflower', { stage: 'seed', ageHours: 999, health: 90 });
    const r = checkStageUp(plant, false);
    expect(r.advanced).toBe(true);
    expect(r.stage).toBe('sprout');
  });

  it('blocks adult → final without pruning shears', () => {
    const plant = makePlant('sunflower', { stage: 'adult', ageHours: 999, health: 95 });
    const noShears = checkStageUp(plant, false);
    expect(noShears.advanced).toBe(false);
    const withShears = checkStageUp(plant, true);
    expect(withShears.advanced).toBe(true);
    expect(withShears.stage).toBe('flowering');
  });
});

describe('engine.pickCauseOfDeath', () => {
  it('thirst when water is 0', () => {
    const plant = makePlant('sunflower', { stats: { water: 0, sun: 60, nutrients: 60, mood: 60 } });
    expect(pickCauseOfDeath(plant)).toBe('thirst');
  });

  it('drowned when water above species threshold', () => {
    const plant = makePlant('cactus', { stats: { water: 95, sun: 80, nutrients: 60, mood: 60 } });
    expect(pickCauseOfDeath(plant)).toBe('drowned');
  });

  it('starved when nutrients depleted', () => {
    const plant = makePlant('sunflower', { stats: { water: 50, sun: 80, nutrients: 5, mood: 60 } });
    expect(pickCauseOfDeath(plant)).toBe('starved');
  });

  it('pests when aphids active', () => {
    const plant = makePlant('sunflower', {
      stats: { water: 50, sun: 80, nutrients: 60, mood: 60 },
      activeEvents: [{ id: 'aphids', startedAt: T0, durationMs: 1_000_000 }],
    });
    expect(pickCauseOfDeath(plant)).toBe('pests');
  });
});

describe('events.rollEvents', () => {
  it('with high-rng never triggers', () => {
    const plant = makePlant('sunflower');
    const ids = rollEvents(plant, T0, () => 0.999);
    expect(ids).toHaveLength(0);
  });

  it('with low-rng triggers events', () => {
    const plant = makePlant('sunflower');
    const ids = rollEvents(plant, T0, () => 0.0001);
    expect(ids.length).toBeGreaterThan(0);
  });

  it('does not trigger fruit_ripens on non-fruit species', () => {
    const plant = makePlant('cactus', { stage: 'adult', health: 90, comfortStreak: 50 });
    const ids = rollEvents(plant, T0, () => 0.0001);
    expect(ids).not.toContain('fruit_ripens');
  });

  it('respects max active events cap', () => {
    const plant = makePlant('sunflower', {
      activeEvents: [
        { id: 'cloudy', startedAt: T0, durationMs: 1_000_000 },
        { id: 'butterfly', startedAt: T0, durationMs: 0 },
      ],
    });
    const ids = rollEvents(plant, T0, () => 0.0001);
    expect(ids).toHaveLength(0);
  });
});

describe('engine.tick — integration: death by thirst', () => {
  it('eventually kills the plant when never watered', () => {
    let plant = makePlant('sunflower', { stats: { water: 5, sun: 80, nutrients: 60, mood: 60 }, health: 30 });
    let died = false;
    let cause: string | undefined;
    for (let i = 0; i < 200; i++) {
      const r = tick(plant, freshInventory(), T0 + i * 2500, noEventsRng);
      plant = r.state;
      const death = r.events.find((e) => e.kind === 'death');
      if (death && death.kind === 'death') {
        died = true;
        cause = death.cause;
        break;
      }
    }
    expect(died).toBe(true);
    expect(cause).toBe('thirst');
  });
});

describe('engine.tick — bloom grants pruning shears event', () => {
  it('emits pruning_shears_acquired when bloom triggers and shears not owned', () => {
    const plant = makePlant('sunflower', {
      stage: 'adult',
      health: 90,
      comfortStreak: 50,
      stats: { water: 60, sun: 80, nutrients: 60, mood: 80 },
    });
    let calls = 0;
    const onlyBloomRng = () => {
      calls += 1;
      return calls === 6 ? 0.001 : 0.999;
    };
    const r = tick(plant, freshInventory(), T0 + 2500, onlyBloomRng);
    const grantedShears = r.events.some((e) => e.kind === 'pruning_shears_acquired');
    const bloomStarted = r.events.some((e) => e.kind === 'event_start' && e.event === 'bloom');
    expect(bloomStarted).toBe(true);
    expect(grantedShears).toBe(true);
  });
});

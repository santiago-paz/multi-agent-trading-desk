// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearLegacyKeys, usePlantitaStore } from './plantita-store';

function resetStore() {
  usePlantitaStore.getState().resetAll();
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  resetStore();
});

describe('plantita-store.plantSeed', () => {
  it('creates current plant with sane defaults', () => {
    usePlantitaStore.getState().plantSeed('sunflower', 'Margarita');
    const { current } = usePlantitaStore.getState();
    expect(current).not.toBeNull();
    expect(current?.species).toBe('sunflower');
    expect(current?.name).toBe('Margarita');
    expect(current?.stage).toBe('seed');
    expect(current?.health).toBeGreaterThan(0);
  });

  it('falls back to default name when input is blank', () => {
    usePlantitaStore.getState().plantSeed('cactus', '   ');
    expect(usePlantitaStore.getState().current?.name).toBe('Plantita');
  });

  it('pushes a seed_planted log entry', () => {
    usePlantitaStore.getState().plantSeed('cactus', 'Spike');
    const log = usePlantitaStore.getState().log;
    expect(log.length).toBe(1);
    expect(log[0].kind).toBe('good');
  });
});

describe('plantita-store.performAction', () => {
  it('water_small updates water and respects cooldown', () => {
    const store = usePlantitaStore.getState();
    store.plantSeed('sunflower', 'Sol');
    const before = usePlantitaStore.getState().current!.stats.water;
    const ok = store.performAction('water_small');
    expect(ok).toBe(true);
    const after = usePlantitaStore.getState().current!.stats.water;
    expect(after).toBeGreaterThan(before);

    const blocked = usePlantitaStore.getState().performAction('water_small');
    expect(blocked).toBe(false);
  });

  it('fertilize without inventory returns false', () => {
    usePlantitaStore.setState({
      inventory: { fertilizer: 0, repellent: 0, pruningShears: false },
    });
    usePlantitaStore.getState().plantSeed('sunflower', 'Sol');
    const ok = usePlantitaStore.getState().performAction('fertilize');
    expect(ok).toBe(false);
  });

  it('toggle_light flips lightMode', () => {
    usePlantitaStore.getState().plantSeed('sunflower', 'Sol');
    const before = usePlantitaStore.getState().current!.lightMode;
    usePlantitaStore.getState().toggleLight();
    const after = usePlantitaStore.getState().current!.lightMode;
    expect(after).not.toBe(before);
  });
});

describe('plantita-store.acknowledgeDeath', () => {
  it('moves dead plant to graveyard and clears current', () => {
    usePlantitaStore.getState().plantSeed('sunflower', 'Sol');
    const cur = usePlantitaStore.getState().current!;
    usePlantitaStore.setState({
      current: { ...cur, health: 0, stats: { ...cur.stats, water: 0 } },
    });
    usePlantitaStore.getState().acknowledgeDeath();
    const s = usePlantitaStore.getState();
    expect(s.current).toBeNull();
    expect(s.graveyard).toHaveLength(1);
    expect(s.graveyard[0].name).toBe('Sol');
    expect(s.graveyard[0].causeOfDeath).toBe('thirst');
  });

  it('is no-op when current is alive', () => {
    usePlantitaStore.getState().plantSeed('cactus', 'Pinchos');
    usePlantitaStore.getState().acknowledgeDeath();
    expect(usePlantitaStore.getState().current).not.toBeNull();
    expect(usePlantitaStore.getState().graveyard).toHaveLength(0);
  });
});

describe('plantita-store.resetAll', () => {
  it('wipes everything and restores initial inventory', () => {
    usePlantitaStore.getState().plantSeed('sunflower', 'Sol');
    usePlantitaStore.setState({ totalHarvests: 7, totalDaysAlive: 4 });
    usePlantitaStore.getState().resetAll();
    const s = usePlantitaStore.getState();
    expect(s.current).toBeNull();
    expect(s.totalHarvests).toBe(0);
    expect(s.totalDaysAlive).toBe(0);
    expect(s.inventory.fertilizer).toBe(1);
    expect(s.log).toHaveLength(0);
    expect(s.graveyard).toHaveLength(0);
  });
});

describe('plantita-store.applyTick', () => {
  it('does nothing if elapsed time is below one tick interval', () => {
    usePlantitaStore.getState().plantSeed('sunflower', 'Sol');
    const before = usePlantitaStore.getState().current!.stats.water;
    usePlantitaStore.getState().applyTick();
    const after = usePlantitaStore.getState().current!.stats.water;
    expect(after).toBe(before);
  });

  it('advances stats after simulated time elapses', () => {
    usePlantitaStore.getState().plantSeed('sunflower', 'Sol');
    const cur = usePlantitaStore.getState().current!;
    usePlantitaStore.setState({
      current: { ...cur, lastTickAt: Date.now() - 60_000 },
    });
    usePlantitaStore.getState().applyTick();
    const after = usePlantitaStore.getState().current!;
    expect(after.stats.water).toBeLessThan(cur.stats.water);
    expect(after.ageHours).toBeGreaterThan(0);
  });
});

describe('plantita-store legacy migration', () => {
  it('clearLegacyKeys removes the four legacy localStorage keys', () => {
    localStorage.setItem('plantita-water', '50');
    localStorage.setItem('plantita-health', '40');
    localStorage.setItem('plantita-stage', '2');
    localStorage.setItem('plantita-dead', 'true');
    clearLegacyKeys();
    expect(localStorage.getItem('plantita-water')).toBeNull();
    expect(localStorage.getItem('plantita-health')).toBeNull();
    expect(localStorage.getItem('plantita-stage')).toBeNull();
    expect(localStorage.getItem('plantita-dead')).toBeNull();
  });
});

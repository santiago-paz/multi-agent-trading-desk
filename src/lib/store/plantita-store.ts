import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  applyAction,
  newPlant,
  pickCauseOfDeath,
  tick,
  TICK_INTERVAL_MS,
  HOURS_PER_DAY,
  MAX_CATCHUP_TICKS,
} from '@/components/ui/plantita/engine';
import type {
  ActionId,
  DeadPlant,
  EngineEvent,
  InventoryState,
  LogEntry,
  LogKind,
  PlantInstance,
  SpeciesId,
} from '@/components/ui/plantita/types';
import { getPlantitaText } from '@/lib/i18n/locales/plantita';
import type { Locale } from '@/lib/i18n/context';

const LOG_CAP = 100;
const GRAVEYARD_CAP = 50;
const LEGACY_KEYS = ['plantita-water', 'plantita-health', 'plantita-stage', 'plantita-dead'];

export function clearLegacyKeys(): void {
  if (typeof window === 'undefined') return;
  for (const k of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore quota / privacy errors */
    }
  }
}

clearLegacyKeys();

function readLocale(): Locale {
  if (typeof window === 'undefined') return 'es';
  const stored = window.localStorage.getItem('locale');
  return stored === 'en' ? 'en' : 'es';
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function logKindFor(event: EngineEvent): LogKind {
  switch (event.kind) {
    case 'stage_up':
    case 'harvest':
    case 'pruning_shears_acquired':
      return 'good';
    case 'event_start':
      return event.event === 'butterfly' || event.event === 'bloom' || event.event === 'fruit_ripens'
        ? 'good'
        : 'bad';
    case 'event_end':
      return 'info';
    case 'health_critical':
      return 'warn';
    case 'death':
      return 'bad';
    case 'action':
      return event.result === 'too_much' ? 'warn' : 'info';
  }
}

function eventToLogEntry(event: EngineEvent, locale: Locale, plantName: string): LogEntry | null {
  const t = (key: string, params?: Record<string, string | number>) =>
    getPlantitaText(locale, key, params);

  let text: string | null = null;
  switch (event.kind) {
    case 'stage_up':
      text = t('log.stage_up', { name: plantName, to: t(`stage.${event.to}`) });
      break;
    case 'event_start':
      text = t(`log.event_start.${event.event}`);
      break;
    case 'event_end':
      text = t(`log.event_end.${event.event}`);
      break;
    case 'action':
      if (event.result === 'no_effect') return null;
      text = t(`log.action.${event.action}.${event.result}`);
      break;
    case 'health_critical':
      text = t('log.health_critical', { name: plantName });
      break;
    case 'death':
      text = t(`log.death.${event.cause}`, { name: plantName });
      break;
    case 'harvest':
      text = t('log.harvest', { count: event.count });
      break;
    case 'pruning_shears_acquired':
      text = t('log.pruning_shears_acquired');
      break;
  }
  if (!text) return null;
  return {
    id: makeId('log'),
    ts: Date.now(),
    text,
    kind: logKindFor(event),
  };
}

interface PlantitaState {
  current: PlantInstance | null;
  inventory: InventoryState;
  graveyard: DeadPlant[];
  log: LogEntry[];
  totalHarvests: number;
  totalDaysAlive: number;

  plantSeed: (species: SpeciesId, name: string) => void;
  applyTick: () => void;
  performAction: (action: ActionId) => boolean;
  toggleLight: () => void;
  acknowledgeDeath: () => void;
  pushLog: (entry: LogEntry) => void;
  clearLog: () => void;
  resetAll: () => void;
}

const INITIAL_INVENTORY: InventoryState = {
  fertilizer: 1,
  repellent: 0,
  pruningShears: false,
};

const INITIAL_STATE = {
  current: null as PlantInstance | null,
  inventory: INITIAL_INVENTORY,
  graveyard: [] as DeadPlant[],
  log: [] as LogEntry[],
  totalHarvests: 0,
  totalDaysAlive: 0,
};

export const usePlantitaStore = create<PlantitaState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      plantSeed: (species, name) => {
        const trimmed = name.trim() || 'Plantita';
        const now = Date.now();
        const plant = newPlant(species, trimmed, now, makeId('plant'));
        const locale = readLocale();
        const entry: LogEntry = {
          id: makeId('log'),
          ts: now,
          text: getPlantitaText(locale, 'log.seed_planted', {
            name: trimmed,
            species: getPlantitaText(locale, `species.${species}.name`),
          }),
          kind: 'good',
        };
        set((s) => ({
          current: plant,
          log: [...s.log, entry].slice(-LOG_CAP),
        }));
      },

      applyTick: () => {
        const { current, inventory } = get();
        if (!current) return;
        if (current.health === 0) return;

        const now = Date.now();
        const elapsed = Math.max(0, now - current.lastTickAt);
        const ticksDue = Math.min(MAX_CATCHUP_TICKS, Math.floor(elapsed / TICK_INTERVAL_MS));
        if (ticksDue <= 0) return;

        const locale = readLocale();
        let plant = current;
        let inv = inventory;
        let totalHarvests = get().totalHarvests;
        const newLogs: LogEntry[] = [];
        let died = false;

        for (let i = 0; i < ticksDue; i++) {
          const stepNow = current.lastTickAt + (i + 1) * TICK_INTERVAL_MS;
          const r = tick(plant, inv, stepNow, Math.random);
          plant = r.state;
          for (const e of r.events) {
            if (e.kind === 'pruning_shears_acquired') {
              inv = { ...inv, pruningShears: true };
            }
            if (e.kind === 'harvest') {
              totalHarvests += e.count;
            }
            const entry = eventToLogEntry(e, locale, plant.name);
            if (entry) newLogs.push(entry);
            if (e.kind === 'death') died = true;
          }
          if (died) break;
        }

        set((s) => ({
          current: plant,
          inventory: inv,
          totalHarvests,
          log: [...s.log, ...newLogs].slice(-LOG_CAP),
        }));
      },

      performAction: (action) => {
        const { current, inventory } = get();
        if (!current || current.health === 0) return false;
        const now = Date.now();
        const r = applyAction(current, inventory, action, now);
        if (!r.applied) return false;

        const locale = readLocale();
        const newLogs: LogEntry[] = [];
        let totalHarvests = get().totalHarvests;
        for (const e of r.events) {
          if (e.kind === 'harvest') totalHarvests += e.count;
          const entry = eventToLogEntry(e, locale, current.name);
          if (entry) newLogs.push(entry);
        }

        set((s) => ({
          current: r.state,
          inventory: r.inventory,
          totalHarvests,
          log: [...s.log, ...newLogs].slice(-LOG_CAP),
        }));
        return true;
      },

      toggleLight: () => {
        get().performAction('toggle_light');
      },

      acknowledgeDeath: () => {
        const { current, graveyard, totalDaysAlive } = get();
        if (!current || current.health > 0) return;
        const dead: DeadPlant = {
          id: current.id,
          name: current.name,
          species: current.species,
          ageHours: current.ageHours,
          causeOfDeath: pickCauseOfDeath(current),
          diedAt: Date.now(),
        };
        const days = current.ageHours / HOURS_PER_DAY;
        set({
          current: null,
          graveyard: [dead, ...graveyard].slice(0, GRAVEYARD_CAP),
          totalDaysAlive: totalDaysAlive + days,
        });
      },

      pushLog: (entry) => set((s) => ({ log: [...s.log, entry].slice(-LOG_CAP) })),

      clearLog: () => set({ log: [] }),

      resetAll: () =>
        set({
          ...INITIAL_STATE,
          inventory: { ...INITIAL_INVENTORY },
        }),
    }),
    {
      name: 'plantita-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: () => ({
        ...INITIAL_STATE,
        inventory: { ...INITIAL_INVENTORY },
      }),
    },
  ),
);

export type SpeciesId = 'cactus' | 'sunflower' | 'fern' | 'tomato' | 'bonsai';

export type StageId =
  | 'seed'
  | 'sprout'
  | 'sapling'
  | 'young'
  | 'adult'
  | 'flowering'
  | 'fruiting';

export type LightMode = 'sun' | 'shade';

export type ActionId =
  | 'water_small'
  | 'water_large'
  | 'fertilize'
  | 'sing'
  | 'prune'
  | 'repel_pests'
  | 'harvest'
  | 'toggle_light';

export type EventId =
  | 'aphids'
  | 'cloudy'
  | 'butterfly'
  | 'drought'
  | 'heatwave'
  | 'bloom'
  | 'fruit_ripens';

export type DeathCause =
  | 'thirst'
  | 'drowned'
  | 'starved'
  | 'pests'
  | 'old_age';

export type ActionResult = 'ok' | 'too_much' | 'no_effect';

export type LogKind = 'info' | 'warn' | 'good' | 'bad';

export interface ActiveEvent {
  id: EventId;
  startedAt: number;
  durationMs: number;
}

export interface Stats {
  water: number;
  sun: number;
  nutrients: number;
  mood: number;
}

export type Cooldowns = Partial<Record<ActionId, number>>;

export interface SpeciesProfile {
  id: SpeciesId;
  emoji: Record<StageId, string>;
  waterDecayPerTick: number;
  drowningThreshold: number;
  preferredSun: [number, number];
  nutrientDecayPerTick: number;
  sunGainPerTick: number;
  growthHoursPerStage: Partial<Record<StageId, number>>;
  finalStage: Extract<StageId, 'flowering' | 'fruiting'>;
  longevityDays: number;
  yields: 'fruit' | 'flower' | null;
  moodLovesSun: boolean;
}

export interface PlantInstance {
  id: string;
  name: string;
  species: SpeciesId;
  stage: StageId;
  bornAt: number;
  lastTickAt: number;
  ageHours: number;
  comfortStreak: number;
  prunedOnce: boolean;
  stats: Stats;
  health: number;
  lightMode: LightMode;
  cooldowns: Cooldowns;
  activeEvents: ActiveEvent[];
  pendingHarvest: number;
}

export interface InventoryState {
  fertilizer: number;
  repellent: number;
  pruningShears: boolean;
}

export interface DeadPlant {
  id: string;
  name: string;
  species: SpeciesId;
  ageHours: number;
  causeOfDeath: DeathCause;
  diedAt: number;
}

export interface LogEntry {
  id: string;
  ts: number;
  text: string;
  kind: LogKind;
}

export type EngineEvent =
  | { kind: 'stage_up'; from: StageId; to: StageId }
  | { kind: 'event_start'; event: EventId }
  | { kind: 'event_end'; event: EventId }
  | { kind: 'action'; action: ActionId; result: ActionResult }
  | { kind: 'health_critical' }
  | { kind: 'death'; cause: DeathCause }
  | { kind: 'harvest'; count: number }
  | { kind: 'pruning_shears_acquired' };

export interface TickResult {
  state: PlantInstance;
  events: EngineEvent[];
}

export interface ApplyActionResult {
  state: PlantInstance;
  inventory: InventoryState;
  events: EngineEvent[];
  applied: boolean;
}

export type Rng = () => number;

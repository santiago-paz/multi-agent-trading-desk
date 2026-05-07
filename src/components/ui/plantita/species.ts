import type { SpeciesId, SpeciesProfile, StageId } from './types';

const STAGES: StageId[] = ['seed', 'sprout', 'sapling', 'young', 'adult'];

function emojiSet(seq: string[], finalStage: StageId, finalEmoji: string): Record<StageId, string> {
  const map = {} as Record<StageId, string>;
  STAGES.forEach((s, i) => {
    map[s] = seq[i] ?? seq[seq.length - 1];
  });
  map.flowering = finalStage === 'flowering' ? finalEmoji : map.adult;
  map.fruiting = finalStage === 'fruiting' ? finalEmoji : map.adult;
  return map;
}

export const SPECIES_PROFILES: Record<SpeciesId, SpeciesProfile> = {
  cactus: {
    id: 'cactus',
    emoji: emojiSet(['🌰', '🌱', '🌿', '🪴', '🌵'], 'flowering', '🌺'),
    waterDecayPerTick: 0.5,
    drowningThreshold: 55,
    preferredSun: [60, 100],
    nutrientDecayPerTick: 0.2,
    sunGainPerTick: 4,
    growthHoursPerStage: { seed: 6, sprout: 18, sapling: 30, young: 48 },
    finalStage: 'flowering',
    longevityDays: 60,
    yields: 'flower',
    moodLovesSun: false,
  },
  sunflower: {
    id: 'sunflower',
    emoji: emojiSet(['🌰', '🌱', '🌿', '🪴', '☀️'], 'flowering', '🌻'),
    waterDecayPerTick: 1.0,
    drowningThreshold: 80,
    preferredSun: [70, 100],
    nutrientDecayPerTick: 0.5,
    sunGainPerTick: 5,
    growthHoursPerStage: { seed: 4, sprout: 12, sapling: 20, young: 30 },
    finalStage: 'flowering',
    longevityDays: 25,
    yields: 'flower',
    moodLovesSun: true,
  },
  fern: {
    id: 'fern',
    emoji: emojiSet(['🌰', '🌱', '🌿', '🪴', '🌿'], 'flowering', '🪷'),
    waterDecayPerTick: 1.2,
    drowningThreshold: 90,
    preferredSun: [10, 40],
    nutrientDecayPerTick: 0.4,
    sunGainPerTick: 5,
    growthHoursPerStage: { seed: 5, sprout: 14, sapling: 24, young: 36 },
    finalStage: 'flowering',
    longevityDays: 35,
    yields: 'flower',
    moodLovesSun: false,
  },
  tomato: {
    id: 'tomato',
    emoji: emojiSet(['🌰', '🌱', '🌿', '🪴', '🪴'], 'fruiting', '🍅'),
    waterDecayPerTick: 1.5,
    drowningThreshold: 85,
    preferredSun: [50, 90],
    nutrientDecayPerTick: 0.6,
    sunGainPerTick: 5,
    growthHoursPerStage: { seed: 4, sprout: 10, sapling: 18, young: 28 },
    finalStage: 'fruiting',
    longevityDays: 30,
    yields: 'fruit',
    moodLovesSun: true,
  },
  bonsai: {
    id: 'bonsai',
    emoji: emojiSet(['🌰', '🌱', '🌿', '🪴', '🎋'], 'flowering', '🌸'),
    waterDecayPerTick: 0.7,
    drowningThreshold: 70,
    preferredSun: [40, 70],
    nutrientDecayPerTick: 0.3,
    sunGainPerTick: 3,
    growthHoursPerStage: { seed: 12, sprout: 36, sapling: 60, young: 96 },
    finalStage: 'flowering',
    longevityDays: 120,
    yields: 'flower',
    moodLovesSun: false,
  },
};

export const ALL_SPECIES: SpeciesId[] = ['cactus', 'sunflower', 'fern', 'tomato', 'bonsai'];

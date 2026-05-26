import type { BiomeId } from '../config/constants';

export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  groundColor: number;
  groundAccent: number;
  fogColor: number;
  fogDensity: number;
  ambientColor: number;
  sunColor: number;
  treeDensity: number;
  rockDensity: number;
  enemyTypes: string[];
  ambientCreatures: string[];
  musicMood: string;
}

export const BIOME_DEFINITIONS: Record<BiomeId, BiomeDefinition> = {
  forest: {
    id: 'forest',
    name: 'Verdant Expanse',
    groundColor: 0x3d6b42,
    groundAccent: 0x2a5230,
    fogColor: 0x4a6a55,
    fogDensity: 0.012,
    ambientColor: 0x6a9a78,
    sunColor: 0xffe8c0,
    treeDensity: 0.35,
    rockDensity: 0.08,
    enemyTypes: ['grove_wisp', 'thorn_stalker', 'wild_boar'],
    ambientCreatures: ['butterfly', 'deer'],
    musicMood: 'peaceful',
  },
  swamp: {
    id: 'swamp',
    name: 'Mire of Whispers',
    groundColor: 0x3a4a38,
    groundAccent: 0x2a3830,
    fogColor: 0x3a4540,
    fogDensity: 0.028,
    ambientColor: 0x5a7068,
    sunColor: 0xc8d8b0,
    treeDensity: 0.2,
    rockDensity: 0.05,
    enemyTypes: ['bog_shade', 'leech_lord'],
    ambientCreatures: ['firefly'],
    musicMood: 'eerie',
  },
  frozen: {
    id: 'frozen',
    name: 'Frostveil Tundra',
    groundColor: 0xc8dce8,
    groundAccent: 0xa0b8c8,
    fogColor: 0xb0c8d8,
    fogDensity: 0.018,
    ambientColor: 0x9ab8cc,
    sunColor: 0xe8f4ff,
    treeDensity: 0.12,
    rockDensity: 0.15,
    enemyTypes: ['ice_wraith', 'frost_titan'],
    ambientCreatures: ['snow_owl'],
    musicMood: 'cold',
  },
  mountain: {
    id: 'mountain',
    name: 'Stormcrag Peaks',
    groundColor: 0x6a6a72,
    groundAccent: 0x505058,
    fogColor: 0x788090,
    fogDensity: 0.015,
    ambientColor: 0x8898a8,
    sunColor: 0xfff0d0,
    treeDensity: 0.08,
    rockDensity: 0.35,
    enemyTypes: ['stone_golem', 'harpy'],
    ambientCreatures: ['eagle'],
    musicMood: 'epic',
  },
  volcanic: {
    id: 'volcanic',
    name: 'Emberfall Caldera',
    groundColor: 0x4a2820,
    groundAccent: 0x2a1810,
    fogColor: 0x4a2828,
    fogDensity: 0.022,
    ambientColor: 0x8a5040,
    sunColor: 0xff8844,
    treeDensity: 0.02,
    rockDensity: 0.25,
    enemyTypes: ['magma_spawn', 'ash_demon'],
    ambientCreatures: [],
    musicMood: 'intense',
  },
  desert: {
    id: 'desert',
    name: 'Sunscar Dunes',
    groundColor: 0xc8a868,
    groundAccent: 0xa88848,
    fogColor: 0xd8c090,
    fogDensity: 0.01,
    ambientColor: 0xe8c898,
    sunColor: 0xffe0a0,
    treeDensity: 0.03,
    rockDensity: 0.12,
    enemyTypes: ['sand_phantom', 'scorpion_king'],
    ambientCreatures: ['lizard'],
    musicMood: 'mystic',
  },
  hell: {
    id: 'hell',
    name: 'Chasm of Eternal Flame',
    groundColor: 0x2a1018,
    groundAccent: 0x1a0808,
    fogColor: 0x3a1820,
    fogDensity: 0.035,
    ambientColor: 0x6a2830,
    sunColor: 0xff4422,
    treeDensity: 0,
    rockDensity: 0.2,
    enemyTypes: ['infernal_knight', 'pit_horror'],
    ambientCreatures: [],
    musicMood: 'boss',
  },
  magical: {
    id: 'magical',
    name: 'Luminarch Sanctum',
    groundColor: 0x5a4a8a,
    groundAccent: 0x4a3a70,
    fogColor: 0x6a5a9a,
    fogDensity: 0.02,
    ambientColor: 0x8a7aba,
    sunColor: 0xc8b0ff,
    treeDensity: 0.15,
    rockDensity: 0.1,
    enemyTypes: ['arcane_sentinel', 'mana_leech'],
    ambientCreatures: ['spirit_wisp'],
    musicMood: 'magical',
  },
  corrupted: {
    id: 'corrupted',
    name: 'Blighted Wastes',
    groundColor: 0x3a2848,
    groundAccent: 0x281830,
    fogColor: 0x2a2038,
    fogDensity: 0.03,
    ambientColor: 0x5a4068,
    sunColor: 0x8866aa,
    treeDensity: 0.05,
    rockDensity: 0.18,
    enemyTypes: ['void_abomination', 'corrupted_titan'],
    ambientCreatures: [],
    musicMood: 'dark',
  },
};

export function getBiomeAt(noiseValue: number, moisture: number, temperature: number): BiomeId {
  if (noiseValue > 0.72) return 'mountain';
  if (noiseValue < -0.55) return temperature < 0.35 ? 'frozen' : 'swamp';
  if (temperature > 0.75 && moisture < 0.35) return 'desert';
  if (temperature > 0.85 && noiseValue > 0.4) return 'volcanic';
  if (moisture > 0.7 && temperature < 0.5) return 'swamp';
  if (noiseValue < -0.35 && moisture > 0.45) return 'frozen';
  if (moisture < 0.25 && temperature > 0.6) return 'desert';
  if (noiseValue > 0.55 && temperature > 0.65) return 'hell';
  if (moisture > 0.55 && temperature > 0.55 && noiseValue > 0.2) return 'magical';
  if (noiseValue < -0.2 && moisture < 0.3) return 'corrupted';
  return 'forest';
}

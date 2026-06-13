/** Aetherfall Chronicles global constants. Developed by n1ckar */

export const GAME_TITLE = 'Aetherfall Chronicles';
export const DEVELOPER_CREDIT = 'Developed by n1ckar';
export const GAME_VERSION = '1.0.0';

export const CHUNK_SIZE = 64;
export const CHUNK_VIEW_DISTANCE = 4;
export const TILE_SIZE = 2;
export const WORLD_SEED_KEY = 'aetherfall_world_seed';
export const SESSION_CLASS_KEY = 'aetherfall_class';
export const SESSION_NAME_KEY = 'aetherfall_name';
export const SESSION_MODE_KEY = 'aetherfall_mode';
export const SESSION_SERVER_KEY = 'aetherfall_server';
export const DISPLAY_NAME_STORAGE_KEY = 'aetherfall_display_name';

export const PLAYER_BASE_SPEED = 14;
export const DODGE_SPEED = 32;
export const DODGE_DURATION = 0.28;
export const DODGE_COOLDOWN = 0.85;
export const HIT_STOP_LIGHT = 0.04;
export const HIT_STOP_HEAVY = 0.09;

export const RARITIES = [
  'common',
  'rare',
  'epic',
  'legendary',
  'mythical',
] as const;

export type Rarity = (typeof RARITIES)[number];

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#b8b4a8',
  rare: '#4a9eff',
  epic: '#a855f7',
  legendary: '#ff8c00',
  mythical: '#ff3366',
};

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 58,
  rare: 25,
  epic: 11,
  legendary: 4.5,
  mythical: 1.5,
};

export function normalizeRarity(rarity: string): Rarity {
  if (rarity === 'magic') return 'rare';
  if (rarity === 'mythic' || rarity === 'ancient' || rarity === 'divine') return 'mythical';
  return RARITIES.includes(rarity as Rarity) ? rarity as Rarity : 'common';
}

export function getRarityColor(rarity: string): string {
  return RARITY_COLORS[normalizeRarity(rarity)];
}

export const BIOMES = [
  'forest',
  'swamp',
  'frozen',
  'mountain',
  'volcanic',
  'desert',
  'hell',
  'magical',
  'corrupted',
] as const;

export type BiomeId = (typeof BIOMES)[number];

export const WEAPON_TYPES = [
  'sword',
  'greatsword',
  'bow',
  'staff',
  'dual_blades',
  'hammer',
  'spear',
  'gauntlets',
] as const;

export type WeaponType = (typeof WEAPON_TYPES)[number];

export const CLASS_IDS = [
  'sentinel',
  'arcanist',
  'ranger',
  'reaver',
  'templar',
] as const;

export type ClassId = (typeof CLASS_IDS)[number];

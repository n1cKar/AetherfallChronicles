/** Aetherfall Chronicles — global constants. Developed by n1ckar */

export const GAME_TITLE = 'Aetherfall Chronicles';
export const DEVELOPER_CREDIT = 'Developed by n1ckar';
export const GAME_VERSION = '1.0.0';

export const CHUNK_SIZE = 64;
export const CHUNK_VIEW_DISTANCE = 4;
export const TILE_SIZE = 2;
export const WORLD_SEED_KEY = 'aetherfall_world_seed';

export const PLAYER_BASE_SPEED = 14;
export const DODGE_SPEED = 32;
export const DODGE_DURATION = 0.28;
export const DODGE_COOLDOWN = 0.85;
export const HIT_STOP_LIGHT = 0.04;
export const HIT_STOP_HEAVY = 0.09;

export const RARITIES = [
  'common',
  'magic',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'ancient',
  'divine',
] as const;

export type Rarity = (typeof RARITIES)[number];

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#b8b4a8',
  magic: '#4a9eff',
  rare: '#ffd700',
  epic: '#a855f7',
  legendary: '#ff8c00',
  mythic: '#ff3366',
  ancient: '#00e5cc',
  divine: '#fff5a0',
};

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  magic: 25,
  rare: 12,
  epic: 6,
  legendary: 4,
  mythic: 2,
  ancient: 0.8,
  divine: 0.2,
};

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

/** Gatherable and craft materials — Developed by n1ckar */

export type MaterialId =
  | 'wood'
  | 'herb'
  | 'ore'
  | 'raw_meat'
  | 'cooked_meat'
  | 'fish'
  | 'hide'
  | 'feather'
  | 'water_vial'
  | 'bait'
  | 'crystal_shard'
  | 'ancient_relic';

export interface MaterialDef {
  id: MaterialId;
  name: string;
  icon: string;
  color: string;
  stackMax: number;
}

export const MATERIALS: Record<MaterialId, MaterialDef> = {
  wood: { id: 'wood', name: 'Timber', icon: '🪵', color: '#8a6840', stackMax: 99 },
  herb: { id: 'herb', name: 'Sunleaf Herb', icon: '🌿', color: '#4a9a5a', stackMax: 99 },
  ore: { id: 'ore', name: 'Iron Ore', icon: '⛏', color: '#7a8a9a', stackMax: 99 },
  raw_meat: { id: 'raw_meat', name: 'Raw Meat', icon: '🥩', color: '#c46a5a', stackMax: 20 },
  cooked_meat: { id: 'cooked_meat', name: 'Roast Meat', icon: '🍖', color: '#d48a50', stackMax: 20 },
  fish: { id: 'fish', name: 'Silverfin', icon: '🐟', color: '#6a9acc', stackMax: 30 },
  hide: { id: 'hide', name: 'Hide', icon: '🦌', color: '#9a7a5a', stackMax: 99 },
  feather: { id: 'feather', name: 'Plume', icon: '🪶', color: '#b8a878', stackMax: 99 },
  water_vial: { id: 'water_vial', name: 'Spring Water', icon: '💧', color: '#5a9acc', stackMax: 20 },
  bait: { id: 'bait', name: 'Fishing Bait', icon: '🪱', color: '#6a5a40', stackMax: 20 },
  crystal_shard: { id: 'crystal_shard', name: 'Crystal Shard', icon: '💎', color: '#88ccff', stackMax: 30 },
  ancient_relic: { id: 'ancient_relic', name: 'Ancient Relic', icon: '🏺', color: '#d4a84b', stackMax: 10 },
};

export type MaterialBag = Partial<Record<MaterialId, number>>;

export function addMaterial(bag: MaterialBag, id: MaterialId, amount: number): MaterialBag {
  const next = { ...bag };
  next[id] = Math.min(MATERIALS[id].stackMax, (next[id] ?? 0) + amount);
  return next;
}

export function hasMaterials(bag: MaterialBag, req: Partial<Record<MaterialId, number>>): boolean {
  for (const [id, need] of Object.entries(req)) {
    if ((bag[id as MaterialId] ?? 0) < (need ?? 0)) return false;
  }
  return true;
}

export function consumeMaterials(bag: MaterialBag, req: Partial<Record<MaterialId, number>>): MaterialBag {
  const next = { ...bag };
  for (const [id, need] of Object.entries(req)) {
    const mid = id as MaterialId;
    next[mid] = Math.max(0, (next[mid] ?? 0) - (need ?? 0));
  }
  return next;
}

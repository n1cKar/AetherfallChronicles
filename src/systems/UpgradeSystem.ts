/**
 * Character upgrades — attributes, perks, life mastery.
 * Developed by n1ckar
 */

export type AttributeId = 'str' | 'dex' | 'int' | 'vit';

export interface UpgradeSave {
  perks: string[];
  lifeMastery: Record<string, number>;
  arenaBestWave: number;
  buffs?: ActiveBuff[];
}

export interface PerkDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  requires?: string;
  minLevel?: number;
}

export const ATTRIBUTE_UPGRADES: Record<AttributeId, { label: string; effect: string }> = {
  str: { label: 'Strength', effect: '+3% damage per point' },
  dex: { label: 'Dexterity', effect: '+2% attack speed, +1% dodge' },
  int: { label: 'Intelligence', effect: '+4 max mana, +2% skill power' },
  vit: { label: 'Vitality', effect: '+10 max HP, +1 defense' },
};

export const PERK_TREE: PerkDef[] = [
  { id: 'vault_leap', name: 'Vault Leap', description: 'Press V to leap over terrain (physics jump).', cost: 1, minLevel: 2 },
  { id: 'air_control', name: 'Aerial Grace', description: 'Better mid-air movement control.', cost: 1, requires: 'vault_leap' },
  { id: 'fall_guard', name: 'Fall Guard', description: 'Take 50% less fall damage.', cost: 1, requires: 'vault_leap' },
  { id: 'momentum', name: 'Momentum', description: '+8% sprint speed when chaining movement.', cost: 2, minLevel: 4 },
  { id: 'iron_skin', name: 'Iron Skin', description: '+12% damage reduction.', cost: 2, minLevel: 5 },
  { id: 'life_sense', name: 'Life Sense', description: '+25% gather/fish/hunt yields.', cost: 1, minLevel: 3 },
  { id: 'master_crafter', name: 'Master Crafter', description: 'Crafted items grant +20% effect.', cost: 2, requires: 'life_sense', minLevel: 6 },
  { id: 'arena_heart', name: 'Arena Heart', description: 'Heal 5 HP per arena wave cleared.', cost: 1, minLevel: 4 },
];

export interface ActiveBuff {
  id: string;
  name: string;
  remaining: number;
  damageMult?: number;
  speedMult?: number;
  regen?: number;
}

export class UpgradeSystem {
  perks = new Set<string>();
  lifeMastery: Record<string, number> = {
    gather: 0, fish: 0, hunt: 0, craft: 0, mine: 0,
  };
  arenaBestWave = 0;
  buffs: ActiveBuff[] = [];

  load(data?: UpgradeSave): void {
    if (!data) return;
    this.perks = new Set(data.perks ?? []);
    this.lifeMastery = { ...this.lifeMastery, ...data.lifeMastery };
    this.arenaBestWave = data.arenaBestWave ?? 0;
    this.buffs = (data.buffs ?? []).filter((b) => b.remaining > 0);
  }

  toSave(): UpgradeSave {
    return {
      perks: [...this.perks],
      lifeMastery: { ...this.lifeMastery },
      arenaBestWave: this.arenaBestWave,
      buffs: this.buffs.filter((b) => b.remaining > 0).map((b) => ({ ...b })),
    };
  }

  hasPerk(id: string): boolean {
    return this.perks.has(id);
  }

  canBuyPerk(id: string, skillPoints: number, level: number): boolean {
    const def = PERK_TREE.find((p) => p.id === id);
    if (!def || this.perks.has(id)) return false;
    if (skillPoints < def.cost) return false;
    if (def.minLevel && level < def.minLevel) return false;
    if (def.requires && !this.perks.has(def.requires)) return false;
    return true;
  }

  buyPerk(id: string): boolean {
    const def = PERK_TREE.find((p) => p.id === id);
    if (!def) return false;
    this.perks.add(id);
    return true;
  }

  addLifeXp(skill: keyof typeof this.lifeMastery, amount = 1): boolean {
    const cur = this.lifeMastery[skill] ?? 0;
    const next = cur + amount;
    const leveled = Math.floor(next / 10) > Math.floor(cur / 10);
    this.lifeMastery[skill] = next;
    return leveled;
  }

  getLifeLevel(skill: string): number {
    return 1 + Math.floor((this.lifeMastery[skill] ?? 0) / 10);
  }

  getYieldBonus(): number {
    return this.hasPerk('life_sense') ? 0.25 : 0;
  }

  getCraftBonus(): number {
    return this.hasPerk('master_crafter') ? 0.2 : 0;
  }

  getDamageReduction(): number {
    return this.hasPerk('iron_skin') ? 0.12 : 0;
  }

  getSpeedBonus(moving: boolean): number {
    return moving && this.hasPerk('momentum') ? 0.08 : 0;
  }

  getFallDamageMult(): number {
    return this.hasPerk('fall_guard') ? 0.5 : 1;
  }

  applyBuff(buff: Omit<ActiveBuff, 'remaining'>, duration: number): void {
    this.buffs = this.buffs.filter((b) => b.id !== buff.id);
    this.buffs.push({ ...buff, remaining: duration });
  }

  update(dt: number): { regen: number } {
    let regen = 0;
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const b = this.buffs[i];
      b.remaining -= dt;
      regen += b.regen ?? 0;
      if (b.remaining <= 0) this.buffs.splice(i, 1);
    }
    return { regen: regen * dt };
  }

  getDamageMult(): number {
    let m = 1;
    for (const b of this.buffs) m *= b.damageMult ?? 1;
    return m;
  }

  getSpeedMult(): number {
    let m = 1;
    for (const b of this.buffs) m *= b.speedMult ?? 1;
    return m;
  }

  getActiveBuffLabels(): string[] {
    return this.buffs.map((b) => `${b.name} ${Math.ceil(b.remaining)}s`);
  }
}

import type { ClassId, WeaponType } from '../config/constants';

export interface ClassDefinition {
  id: ClassId;
  name: string;
  title: string;
  description: string;
  primaryColor: number;
  accentColor: number;
  defaultWeapon: WeaponType;
  baseStats: { str: number; dex: number; int: number; vit: number };
  skills: SkillDefinition[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  manaCost: number;
  damageMult: number;
  type: 'melee' | 'ranged' | 'aoe' | 'ultimate' | 'buff';
  key: string;
}

export const CLASS_DEFINITIONS: Record<ClassId, ClassDefinition> = {
  sentinel: {
    id: 'sentinel',
    name: 'Sentinel',
    title: 'Shield of Aetherfall',
    description: 'Unyielding frontline warrior with crushing combos and iron defense.',
    primaryColor: 0x4a6a9a,
    accentColor: 0xc0a050,
    defaultWeapon: 'sword',
    baseStats: { str: 14, dex: 8, int: 4, vit: 16 },
    skills: [
      { id: 'slash', name: 'Aether Slash', description: 'Quick sword strike.', cooldown: 0.4, manaCost: 0, damageMult: 1, type: 'melee', key: '1' },
      { id: 'cleave', name: 'Cleave', description: 'Wide arc attack.', cooldown: 2.5, manaCost: 15, damageMult: 1.8, type: 'aoe', key: '2' },
      { id: 'shield_bash', name: 'Shield Bash', description: 'Stun and knockback.', cooldown: 5, manaCost: 20, damageMult: 1.2, type: 'melee', key: '3' },
      { id: 'aether_fury', name: 'Aether Fury', description: 'Ultimate barrage.', cooldown: 30, manaCost: 50, damageMult: 4, type: 'ultimate', key: '4' },
    ],
  },
  arcanist: {
    id: 'arcanist',
    name: 'Arcanist',
    title: 'Weaver of the Rift',
    description: 'Devastating elemental magic and arcane explosions.',
    primaryColor: 0x6a4a9a,
    accentColor: 0x88ccff,
    defaultWeapon: 'staff',
    baseStats: { str: 4, dex: 8, int: 18, vit: 8 },
    skills: [
      { id: 'arc_bolt', name: 'Arc Bolt', description: 'Ranged magic projectile.', cooldown: 0.5, manaCost: 8, damageMult: 1.1, type: 'ranged', key: '1' },
      { id: 'nova', name: 'Arcane Nova', description: 'Explosive AoE.', cooldown: 4, manaCost: 25, damageMult: 2.2, type: 'aoe', key: '2' },
      { id: 'blink', name: 'Phase Shift', description: 'Short teleport.', cooldown: 6, manaCost: 30, damageMult: 0, type: 'buff', key: '3' },
      { id: 'meteor', name: 'Starfall', description: 'Meteor ultimate.', cooldown: 35, manaCost: 60, damageMult: 5, type: 'ultimate', key: '4' },
    ],
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    title: 'Windpiercer',
    description: 'Mobile bow master with traps and piercing volleys.',
    primaryColor: 0x3a7a4a,
    accentColor: 0x8a6840,
    defaultWeapon: 'bow',
    baseStats: { str: 8, dex: 16, int: 6, vit: 10 },
    skills: [
      { id: 'shot', name: 'Piercing Shot', description: 'Fast arrow.', cooldown: 0.35, manaCost: 5, damageMult: 1, type: 'ranged', key: '1' },
      { id: 'volley', name: 'Sky Volley', description: 'Rain of arrows.', cooldown: 5, manaCost: 30, damageMult: 2, type: 'aoe', key: '2' },
      { id: 'trap', name: 'Spirit Trap', description: 'Root enemies.', cooldown: 8, manaCost: 25, damageMult: 0.8, type: 'aoe', key: '3' },
      { id: 'eagle_strike', name: 'Eagle Strike', description: 'Ultimate pierce.', cooldown: 28, manaCost: 45, damageMult: 3.5, type: 'ultimate', key: '4' },
    ],
  },
  reaver: {
    id: 'reaver',
    name: 'Reaver',
    title: 'Blade Dancer',
    description: 'Dual-wield frenzy with lifesteal and dodge chains.',
    primaryColor: 0x8a3a4a,
    accentColor: 0xff4466,
    defaultWeapon: 'dual_blades',
    baseStats: { str: 12, dex: 14, int: 4, vit: 10 },
    skills: [
      { id: 'flurry', name: 'Flurry', description: 'Dual strike combo.', cooldown: 0.3, manaCost: 0, damageMult: 0.85, type: 'melee', key: '1' },
      { id: 'whirl', name: 'Crimson Whirl', description: 'Spin attack.', cooldown: 3, manaCost: 20, damageMult: 1.6, type: 'aoe', key: '2' },
      { id: 'dash_strike', name: 'Shadow Lunge', description: 'Dash damage.', cooldown: 4, manaCost: 15, damageMult: 1.4, type: 'melee', key: '3' },
      { id: 'blood_moon', name: 'Blood Moon', description: 'Ultimate frenzy.', cooldown: 25, manaCost: 40, damageMult: 4.5, type: 'ultimate', key: '4' },
    ],
  },
  templar: {
    id: 'templar',
    name: 'Templar',
    title: 'Hammer of Dawn',
    description: 'Slow, devastating hammer blows and holy shockwaves.',
    primaryColor: 0x9a8a4a,
    accentColor: 0xffdd88,
    defaultWeapon: 'hammer',
    baseStats: { str: 16, dex: 6, int: 8, vit: 14 },
    skills: [
      { id: 'smash', name: 'Smash', description: 'Heavy hammer hit.', cooldown: 0.7, manaCost: 0, damageMult: 1.3, type: 'melee', key: '1' },
      { id: 'quake', name: 'Seismic Quake', description: 'Ground AoE.', cooldown: 6, manaCost: 25, damageMult: 2.5, type: 'aoe', key: '2' },
      { id: 'bless', name: 'Dawn Blessing', description: 'Heal and armor.', cooldown: 12, manaCost: 35, damageMult: 0, type: 'buff', key: '3' },
      { id: 'judgment', name: 'Judgment', description: 'Holy ultimate.', cooldown: 40, manaCost: 55, damageMult: 5.5, type: 'ultimate', key: '4' },
    ],
  },
};

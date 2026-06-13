import * as THREE from 'three';
import {
  createHumanoidEnemy,
  animateHumanoid,
  type HumanoidRig,
} from '../render/HumanCharacter';
import { distance2D, angleTo } from '../utils/math';

export type EnemyTier = 'normal' | 'elite' | 'boss';

export interface EnemyConfig {
  id: string;
  name: string;
  color: number;
  healthMult: number;
  damageMult: number;
  speed: number;
  xpReward: number;
  tier: EnemyTier;
  scale?: number;
}

export const ENEMY_TYPES: Record<string, EnemyConfig> = {
  void_spawn: { id: 'void_spawn', name: 'Void Spawn', color: 0x6540a8, healthMult: 1.15, damageMult: 1.15, speed: 7.2, xpReward: 42, tier: 'normal' },
  skeleton: { id: 'skeleton', name: 'Crypt Skeleton', color: 0xd8d0c0, healthMult: 1, damageMult: 1, speed: 7, xpReward: 28, tier: 'normal' },
  zombie: { id: 'zombie', name: 'Rot Zombie', color: 0x5f7a4c, healthMult: 1.6, damageMult: 1.05, speed: 4.5, xpReward: 34, tier: 'normal' },
  goblin: { id: 'goblin', name: 'Aether Goblin', color: 0x5aa35a, healthMult: 0.9, damageMult: 0.9, speed: 9, xpReward: 30, tier: 'normal' },
  spider: { id: 'spider', name: 'Cave Spider', color: 0x303038, healthMult: 0.8, damageMult: 1.25, speed: 10, xpReward: 32, tier: 'normal' },
  mage: { id: 'mage', name: 'Runebound Mage', color: 0x7d55c7, healthMult: 1.2, damageMult: 1.6, speed: 5, xpReward: 58, tier: 'elite' },
  dungeon_golem: { id: 'dungeon_golem', name: 'Dungeon Golem', color: 0x7f858c, healthMult: 3.4, damageMult: 1.65, speed: 3.8, xpReward: 135, tier: 'elite', scale: 1.6 },
  ember_dragon: { id: 'ember_dragon', name: 'Ember Drake', color: 0xdd4a20, healthMult: 4.2, damageMult: 2.2, speed: 7, xpReward: 260, tier: 'elite', scale: 1.8 },
  frost_dragon: { id: 'frost_dragon', name: 'Frost Drake', color: 0x91d8ff, healthMult: 4.1, damageMult: 2.05, speed: 6.5, xpReward: 260, tier: 'elite', scale: 1.8 },
  grove_wisp: { id: 'grove_wisp', name: 'Grove Wisp', color: 0x4a9a5a, healthMult: 1, damageMult: 0.8, speed: 6, xpReward: 25, tier: 'normal' },
  thorn_stalker: { id: 'thorn_stalker', name: 'Thorn Stalker', color: 0x2a6a3a, healthMult: 1.4, damageMult: 1.1, speed: 8, xpReward: 40, tier: 'normal' },
  wild_boar: { id: 'wild_boar', name: 'Wild Boar', color: 0x6a5040, healthMult: 1.8, damageMult: 1.2, speed: 10, xpReward: 35, tier: 'normal' },
  bog_shade: { id: 'bog_shade', name: 'Bog Shade', color: 0x3a5a4a, healthMult: 1.2, damageMult: 1, speed: 5, xpReward: 45, tier: 'normal' },
  leech_lord: { id: 'leech_lord', name: 'Leech Lord', color: 0x315245, healthMult: 2.4, damageMult: 1.45, speed: 5, xpReward: 110, tier: 'elite', scale: 1.35 },
  ice_wraith: { id: 'ice_wraith', name: 'Ice Wraith', color: 0x88ccee, healthMult: 1.3, damageMult: 1.3, speed: 7, xpReward: 55, tier: 'elite' },
  frost_titan: { id: 'frost_titan', name: 'Frost Titan', color: 0xb7e6ff, healthMult: 5.6, damageMult: 2.25, speed: 4, xpReward: 420, tier: 'boss', scale: 2.35 },
  stone_golem: { id: 'stone_golem', name: 'Stone Golem', color: 0x7a7a82, healthMult: 3, damageMult: 1.5, speed: 4, xpReward: 120, tier: 'elite', scale: 1.5 },
  harpy: { id: 'harpy', name: 'Storm Harpy', color: 0x8c93a6, healthMult: 1.15, damageMult: 1.25, speed: 9, xpReward: 52, tier: 'normal' },
  magma_spawn: { id: 'magma_spawn', name: 'Magma Spawn', color: 0xff4422, healthMult: 2, damageMult: 1.8, speed: 6, xpReward: 80, tier: 'elite' },
  ash_demon: { id: 'ash_demon', name: 'Ash Demon', color: 0x8f2d18, healthMult: 2.5, damageMult: 1.9, speed: 6.2, xpReward: 120, tier: 'elite', scale: 1.35 },
  sand_phantom: { id: 'sand_phantom', name: 'Sand Phantom', color: 0xc8a668, healthMult: 1.2, damageMult: 1.2, speed: 7.5, xpReward: 50, tier: 'normal' },
  scorpion_king: { id: 'scorpion_king', name: 'Scorpion King', color: 0xa46a2c, healthMult: 4.8, damageMult: 2.1, speed: 5.2, xpReward: 360, tier: 'boss', scale: 2.1 },
  infernal_knight: { id: 'infernal_knight', name: 'Infernal Knight', color: 0xb33724, healthMult: 2.7, damageMult: 1.9, speed: 5.5, xpReward: 135, tier: 'elite', scale: 1.35 },
  pit_horror: { id: 'pit_horror', name: 'Pit Horror', color: 0x501018, healthMult: 6.5, damageMult: 2.75, speed: 4.2, xpReward: 560, tier: 'boss', scale: 2.45 },
  arcane_sentinel: { id: 'arcane_sentinel', name: 'Arcane Sentinel', color: 0x6c63d8, healthMult: 2.2, damageMult: 1.7, speed: 5.8, xpReward: 112, tier: 'elite', scale: 1.25 },
  mana_leech: { id: 'mana_leech', name: 'Mana Leech', color: 0x3fd6c6, healthMult: 1.1, damageMult: 1.25, speed: 8, xpReward: 55, tier: 'normal' },
  dragon_lord: { id: 'dragon_lord', name: 'Dragon Lord Varkon', color: 0xff6933, healthMult: 9.5, damageMult: 3.2, speed: 5.2, xpReward: 900, tier: 'boss', scale: 3 },
  void_abomination: { id: 'void_abomination', name: 'Void Abomination', color: 0x4a2a6a, healthMult: 5, damageMult: 2.5, speed: 5, xpReward: 500, tier: 'boss', scale: 2.2 },
  corrupted_titan: { id: 'corrupted_titan', name: 'Corrupted Titan', color: 0x6a2a4a, healthMult: 8, damageMult: 3, speed: 4, xpReward: 800, tier: 'boss', scale: 2.8 },
};

export class Enemy {
  mesh: THREE.Group;
  rig: HumanoidRig;
  id: string;
  name: string;
  position = new THREE.Vector3();
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  xpReward: number;
  tier: EnemyTier;
  healthBarOffset: number;
  alive = true;
  stagger = 0;
  attackCooldown = 0;
  aiState: 'idle' | 'chase' | 'attack' | 'stagger' = 'idle';
  phase = 1;
  private config: EnemyConfig;
  private animPhase = 0;
  private knockbackVel = new THREE.Vector3();

  constructor(configKey: string, x: number, z: number, y: number, level = 1) {
    const config = ENEMY_TYPES[configKey] ?? ENEMY_TYPES.grove_wisp;
    this.config = config;
    this.id = `${config.id}_${Math.random().toString(36).slice(2, 8)}`;
    this.name = config.name;
    this.tier = config.tier;
    const scale = config.scale ?? 1;
    this.healthBarOffset = 2.25 * scale + (config.tier === 'boss' ? 1.2 : config.tier === 'elite' ? 0.35 : 0);
    this.rig = createHumanoidEnemy(config.color, config.tier, scale);
    this.mesh = this.rig.root;
    this.position.set(x, y, z);
    this.mesh.position.copy(this.position);
    const lvlMult = 1 + level * 0.08;
    this.maxHealth = 30 * config.healthMult * lvlMult * (config.tier === 'boss' ? 3 : config.tier === 'elite' ? 1.8 : 1);
    this.health = this.maxHealth;
    this.damage = 5 * config.damageMult * lvlMult;
    this.speed = config.speed;
    this.xpReward = Math.floor(config.xpReward * lvlMult);
  }

  update(dt: number, playerPos: THREE.Vector3, worldHeight: (x: number, z: number) => number): void {
    if (!this.alive) return;

    this.knockbackVel.multiplyScalar(Math.max(0, 1 - dt * 6));
    this.position.addScaledVector(this.knockbackVel, dt);

    if (this.stagger > 0) {
      this.stagger -= dt;
      this.aiState = 'stagger';
      animateHumanoid(this.rig, 'hurt', this.animPhase, 0);
      this.animPhase += dt;
      this.position.y = worldHeight(this.position.x, this.position.z);
      this.mesh.position.copy(this.position);
      return;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const dist = distance2D(this.position.x, this.position.z, playerPos.x, playerPos.z);
    const aggroRange = this.tier === 'boss' ? 40 : 22;
    let moving = false;

    if (dist < aggroRange) {
      if (dist < 2.5 && this.attackCooldown <= 0) {
        this.aiState = 'attack';
        this.attackCooldown = this.tier === 'boss' ? 1.2 : 1.8;
      } else if (dist > 2.8) {
        this.aiState = 'chase';
        const angle = angleTo(this.position.x, this.position.z, playerPos.x, playerPos.z);
        this.position.x += Math.sin(angle) * this.speed * dt;
        this.position.z += Math.cos(angle) * this.speed * dt;
        this.mesh.rotation.y = angle;
        moving = true;
      }
    } else {
      this.aiState = 'idle';
    }

    this.position.y = worldHeight(this.position.x, this.position.z);
    this.mesh.position.copy(this.position);
    this.animPhase += dt;
    animateHumanoid(
      this.rig,
      this.aiState === 'attack' ? 'attack' : moving ? 'move' : 'idle',
      this.animPhase,
      moving ? 1 : 0,
    );
  }

  takeDamage(amount: number, knockbackX = 0, knockbackZ = 0): number {
    if (!this.alive) return 0;
    const actual = Math.max(1, amount);
    this.health -= actual;
    this.stagger = 0.2;
    this.knockbackVel.x += knockbackX * 4;
    this.knockbackVel.z += knockbackZ * 4;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.mesh.visible = false;
    }
    if (this.tier === 'boss' && this.health < this.maxHealth * 0.5) this.phase = 2;
    return actual;
  }

  canAttackPlayer(playerPos: THREE.Vector3): boolean {
    return (
      this.alive &&
      this.aiState === 'attack' &&
      distance2D(this.position.x, this.position.z, playerPos.x, playerPos.z) < 2.8
    );
  }
}

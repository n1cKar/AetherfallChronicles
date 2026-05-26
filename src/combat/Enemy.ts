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
  grove_wisp: { id: 'grove_wisp', name: 'Grove Wisp', color: 0x4a9a5a, healthMult: 1, damageMult: 0.8, speed: 6, xpReward: 25, tier: 'normal' },
  thorn_stalker: { id: 'thorn_stalker', name: 'Thorn Stalker', color: 0x2a6a3a, healthMult: 1.4, damageMult: 1.1, speed: 8, xpReward: 40, tier: 'normal' },
  wild_boar: { id: 'wild_boar', name: 'Wild Boar', color: 0x6a5040, healthMult: 1.8, damageMult: 1.2, speed: 10, xpReward: 35, tier: 'normal' },
  bog_shade: { id: 'bog_shade', name: 'Bog Shade', color: 0x3a5a4a, healthMult: 1.2, damageMult: 1, speed: 5, xpReward: 45, tier: 'normal' },
  ice_wraith: { id: 'ice_wraith', name: 'Ice Wraith', color: 0x88ccee, healthMult: 1.3, damageMult: 1.3, speed: 7, xpReward: 55, tier: 'elite' },
  stone_golem: { id: 'stone_golem', name: 'Stone Golem', color: 0x7a7a82, healthMult: 3, damageMult: 1.5, speed: 4, xpReward: 120, tier: 'elite', scale: 1.5 },
  magma_spawn: { id: 'magma_spawn', name: 'Magma Spawn', color: 0xff4422, healthMult: 2, damageMult: 1.8, speed: 6, xpReward: 80, tier: 'elite' },
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

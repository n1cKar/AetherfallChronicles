import * as THREE from 'three';
import {
  DODGE_COOLDOWN,
  DODGE_DURATION,
  DODGE_SPEED,
  PLAYER_BASE_SPEED,
  type ClassId,
} from '../config/constants';
import { CLASS_DEFINITIONS } from './ClassDefinitions';
import {
  createHumanCharacter,
  animateHumanoid,
  type HumanoidRig,
} from '../render/HumanCharacter';
import { PhysicsSystem, type PhysicsBody } from '../physics/PhysicsSystem';
import { clamp } from '../utils/math';
import type { ItemInstance } from '../loot/ItemGenerator';

export type PlayerState = 'idle' | 'move' | 'attack' | 'dodge' | 'hurt' | 'dead';

export class Player {
  mesh: THREE.Group;
  rig: HumanoidRig;
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  rotation = 0;
  state: PlayerState = 'idle';
  classId: ClassId;
  level = 1;
  xp = 0;
  xpToNext = 100;
  health = 100;
  maxHealth = 100;
  mana = 100;
  maxMana = 100;
  gold = 0;
  combo = 0;
  comboTimer = 0;
  dodgeTimer = 0;
  dodgeCooldown = 0;
  invulnerable = false;
  inventory: ItemInstance[] = [];
  skillCooldowns = new Map<string, number>();
  attackCooldown = 0;
  attributes = { str: 10, dex: 10, int: 10, vit: 10 };
  skillPoints = 0;
  body: PhysicsBody;

  private animPhase = 0;
  private moveBlend = 0;
  private physics = new PhysicsSystem();

  constructor(classId: ClassId) {
    this.classId = classId;
    const def = CLASS_DEFINITIONS[classId];
    this.attributes = { ...def.baseStats };
    this.maxHealth = 80 + this.attributes.vit * 8;
    this.health = this.maxHealth;
    this.maxMana = 50 + this.attributes.int * 6;
    this.mana = this.maxMana;
    this.rig = createHumanCharacter(def.primaryColor, def.accentColor, 0xd4a574, def.defaultWeapon);
    this.mesh = this.rig.root;
    this.body = this.physics.createBody(this.position);
  }

  get damage(): number {
    return 8 + this.attributes.str * 1.2 + this.level * 2 + this.combo * 0.5;
  }

  get defense(): number {
    return this.attributes.vit * 0.8 + this.level;
  }

  setPhysicsSubSteps(steps: number): void {
    this.physics.setSubSteps(steps);
  }

  setColliders(boxes: THREE.Box3[]): void {
    this.physics.setColliders(boxes);
  }

  update(dt: number, worldHeight: (x: number, z: number) => number): void {
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      if (this.dodgeTimer <= 0 && this.state === 'dodge') this.state = 'idle';
    }
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    for (const [id, cd] of this.skillCooldowns) {
      if (cd > 0) this.skillCooldowns.set(id, cd - dt);
    }

    if (this.state !== 'dodge' && this.state !== 'dead') {
      this.position.copy(this.body.position);
      this.velocity.copy(this.body.velocity);
    } else if (this.state === 'dodge') {
      this.body.position.copy(this.position);
      this.body.velocity.copy(this.velocity);
    }

    const groundY = worldHeight(this.position.x, this.position.z);
    if (this.body.onGround) this.position.y = groundY;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    this.moveBlend = clamp(this.moveBlend + (this.state === 'move' ? dt * 8 : -dt * 6), 0, 1);
    this.animPhase += dt;
    animateHumanoid(this.rig, this.state, this.animPhase, this.moveBlend);

    this.mana = clamp(this.mana + dt * (4 + this.attributes.int * 0.2), 0, this.maxMana);
  }

  applyMovement(
    dirX: number,
    dirZ: number,
    sprint: boolean,
    dt: number,
    worldHeight: (x: number, z: number) => number,
  ): void {
    if (this.state === 'dodge' || this.state === 'dead') return;

    const speed = sprint ? PLAYER_BASE_SPEED * 1.35 : PLAYER_BASE_SPEED;
    const { moving } = this.physics.move(this.body, dirX, dirZ, speed, dt, worldHeight, sprint);
    this.position.copy(this.body.position);
    this.velocity.copy(this.body.velocity);

    if (moving) {
      this.rotation = Math.atan2(dirX, dirZ);
      this.state = 'move';
    } else if (this.state === 'move') {
      this.state = 'idle';
    }
  }

  dodge(): boolean {
    if (this.dodgeCooldown > 0 || this.state === 'dead') return false;
    this.dodgeTimer = DODGE_DURATION;
    this.dodgeCooldown = DODGE_COOLDOWN;
    this.invulnerable = true;
    this.state = 'dodge';
    const fwdX = Math.sin(this.rotation);
    const fwdZ = Math.cos(this.rotation);
    this.physics.applyImpulse(this.body, fwdX * DODGE_SPEED, 0, fwdZ * DODGE_SPEED);
    this.position.copy(this.body.position);
    this.velocity.copy(this.body.velocity);
    setTimeout(() => { this.invulnerable = false; }, DODGE_DURATION * 1000);
    return true;
  }

  attack(): boolean {
    if (this.attackCooldown > 0 || this.state === 'dodge' || this.state === 'dead') return false;
    this.attackCooldown = Math.max(0.2, 0.38 - this.attributes.dex * 0.008);
    this.state = 'attack';
    this.combo = Math.min(5, this.combo + 1);
    this.comboTimer = 2;
    setTimeout(() => {
      if (this.state === 'attack') this.state = 'idle';
    }, 280);
    return true;
  }

  useSkill(skillId: string): boolean {
    const def = CLASS_DEFINITIONS[this.classId].skills.find((s) => s.id === skillId);
    if (!def) return false;
    const cd = this.skillCooldowns.get(skillId) ?? 0;
    if (cd > 0 || this.mana < def.manaCost) return false;
    this.mana -= def.manaCost;
    this.skillCooldowns.set(skillId, def.cooldown);
    this.state = 'attack';
    return true;
  }

  takeDamage(amount: number, fromX?: number, fromZ?: number): number {
    if (this.invulnerable || this.state === 'dead') return 0;
    const actual = Math.max(1, amount - this.defense * 0.3);
    this.health -= actual;
    this.state = 'hurt';
    if (fromX !== undefined && fromZ !== undefined) {
      this.physics.knockback(this.body, fromX, fromZ, 6);
      this.position.copy(this.body.position);
    }
    setTimeout(() => {
      if (this.state === 'hurt') this.state = 'idle';
    }, 200);
    if (this.health <= 0) {
      this.health = 0;
      this.state = 'dead';
    }
    return actual;
  }

  heal(amount: number): void {
    this.health = clamp(this.health + amount, 0, this.maxHealth);
  }

  gainXp(amount: number): boolean {
    this.xp += amount;
    this.gold += Math.floor(amount * 0.4);
    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(this.xpToNext * 1.25);
      this.maxHealth += 12;
      this.health = this.maxHealth;
      this.maxMana += 8;
      this.mana = this.maxMana;
      this.skillPoints += 1;
      return true;
    }
    return false;
  }

  addItem(item: ItemInstance): void {
    if (this.inventory.length < 48) this.inventory.push(item);
  }

  respawn(x: number, z: number, worldHeight: (x: number, z: number) => number): void {
    const y = worldHeight(x, z);
    this.position.set(x, y, z);
    this.body.position.set(x, y, z);
    this.body.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.mana = this.maxMana;
    this.state = 'idle';
    this.mesh.visible = true;
  }
}

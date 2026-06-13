import * as THREE from 'three';
import { HIT_STOP_HEAVY, HIT_STOP_LIGHT } from '../config/constants';
import type { Player } from '../character/Player';
import type { Enemy } from './Enemy';
import { CLASS_DEFINITIONS } from '../character/ClassDefinitions';
import { ItemGenerator } from '../loot/ItemGenerator';
import type { ParticleSystem } from '../effects/ParticleSystem';
import type { DamageNumberSystem } from '../ui/DamageNumbers';
import type { EventBus } from '../utils/EventBus';

export class CombatSystem {
  hitStop = 0;
  screenShake = 0;
  killStreak = 0;
  killStreakTimer = 0;
  lastCrit = false;

  constructor(
    private bus: EventBus,
    private particles: ParticleSystem,
    private damageNumbers: DamageNumberSystem,
  ) {}

  update(dt: number): void {
    if (this.hitStop > 0) {
      this.hitStop -= dt;
    }
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 4);
    }
    if (this.killStreakTimer > 0) {
      this.killStreakTimer -= dt;
      if (this.killStreakTimer <= 0) this.killStreak = 0;
    }
  }

  get timeScale(): number {
    return this.hitStop > 0 ? 0.05 : 1;
  }

  processPlayerAttack(
    player: Player,
    enemies: Enemy[],
    skillId?: string,
  ): { hits: Enemy[]; totalDamage: number } {
    const def = CLASS_DEFINITIONS[player.classId];
    const skill = skillId
      ? def.skills.find((s) => s.id === skillId)
      : def.skills[0];
    const mult = skill?.damageMult ?? 1;
    const range = skill?.type === 'ranged' ? 14 : skill?.type === 'aoe' ? 6 : 2.8;
    const hits: Enemy[] = [];
    let totalDamage = 0;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.position.x - player.position.x;
      const dz = enemy.position.z - player.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > range) continue;

      const crit = Math.random() < player.critChance;
      const element = this.resolveElement(player, skillId);
      let dmg = player.damage * mult * (0.9 + Math.random() * 0.2);
      if (element.bonus > 0) dmg *= 1 + element.bonus;
      if (crit) dmg *= 2.1;
      this.lastCrit = crit;
      const kbX = dx / (dist || 1);
      const kbZ = dz / (dist || 1);
      const actual = enemy.takeDamage(dmg, kbX, kbZ);
      totalDamage += actual;
      player.applyLifesteal(actual);
      hits.push(enemy);

      this.particles.emitHit(enemy.position, crit ? 0xffee44 : element.color);
      if (crit || element.bonus > 0) this.particles.emitMagic(enemy.position, crit ? 0xffdd66 : element.color);
      this.damageNumbers.spawn(enemy.position, actual, crit || enemy.tier !== 'normal');
      this.applyHitFeel(
        crit ? HIT_STOP_HEAVY * 0.7 : enemy.tier === 'boss' ? HIT_STOP_HEAVY : HIT_STOP_LIGHT,
        crit ? 0.35 : enemy.tier === 'boss' ? 0.4 : 0.15,
      );

      if (!enemy.alive) {
        this.killStreak++;
        this.killStreakTimer = 4;
        if (player.gainXp(enemy.xpReward)) {
          this.bus.emit('level_up');
        }
        if (enemy.tier === 'boss') this.bus.emit('boss_killed', enemy);
        else if (enemy.tier === 'elite') this.bus.emit('elite_killed', enemy);
        const loot = ItemGenerator.generateLootBurst(
          player.level,
          enemy.tier === 'boss' ? 4 : enemy.tier === 'elite' ? 2 : 1,
        );
        this.bus.emit('enemy_killed', enemy, loot);
      }
    }

    if (hits.length > 0) {
      this.bus.emit('combat_hit', hits.length, totalDamage, this.lastCrit);
    }

    return { hits, totalDamage };
  }

  processEnemyAttack(enemy: Enemy, player: Player): number {
    if (!enemy.canAttackPlayer(player.position)) return 0;
    const dmg = enemy.damage * (enemy.phase === 2 ? 1.3 : 1);
    const actual = player.takeDamage(dmg, enemy.position.x, enemy.position.z);
    if (actual > 0) {
      this.particles.emitHit(player.position.clone(), 0xff4444);
      this.damageNumbers.spawn(player.position, actual, false, true);
      this.applyHitFeel(HIT_STOP_LIGHT, 0.25);
      this.bus.emit('player_hurt', actual);
    }
    return actual;
  }

  private applyHitFeel(stop: number, shake: number): void {
    this.hitStop = Math.max(this.hitStop, stop);
    this.screenShake = Math.max(this.screenShake, shake);
  }

  private resolveElement(player: Player, skillId?: string): { color: number; bonus: number } {
    const skillElement = skillId?.includes('fire') || skillId === 'meteor' ? 'fire'
      : skillId?.includes('frost') ? 'frost'
        : skillId?.includes('arc') || skillId?.includes('storm') ? 'storm'
          : skillId?.includes('poison') || skillId === 'trap' ? 'poison'
            : '';
    const totals: Record<string, number> = { fire: 0, frost: 0, storm: 0, poison: 0 };
    for (const item of Object.values(player.equipped)) {
      for (const aff of item?.affixes ?? []) {
        if (aff.stat === 'elemental_fire') totals.fire += aff.value;
        if (aff.stat === 'elemental_frost') totals.frost += aff.value;
        if (aff.stat === 'elemental_storm') totals.storm += aff.value;
        if (aff.stat === 'elemental_poison') totals.poison += aff.value;
      }
    }
    const best = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    const element = skillElement || (best?.[1] > 0 ? best[0] : '');
    const colors: Record<string, number> = {
      fire: 0xff5a2e,
      frost: 0x8fd8ff,
      storm: 0xd4b6ff,
      poison: 0x7dff71,
    };
    const bonus = Math.min(0.45, ((element ? totals[element] : 0) || 0) * 0.003);
    return { color: colors[element] ?? 0xffcc66, bonus };
  }
}

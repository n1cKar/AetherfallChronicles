import * as THREE from 'three';
import { Enemy, ENEMY_TYPES } from './Enemy';
import type { BiomeDefinition } from '../world/BiomeConfig';
import type { PerformanceProfile } from '../core/PerformanceProfile';

export class EnemyManager {
  enemies: Enemy[] = [];
  private scene: THREE.Scene;
  private spawnTimer = 0;
  private maxEnemies = 24;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  applyPerformance(profile: PerformanceProfile): void {
    this.maxEnemies = profile.maxEnemies;
  }

  spawn(typeKey: string, x: number, z: number, y: number, level = 1): Enemy {
    const enemy = new Enemy(typeKey, x, z, y, level);
    this.scene.add(enemy.mesh);
    this.enemies.push(enemy);
    return enemy;
  }

  spawnPack(biome: BiomeDefinition, x: number, z: number, y: number, level: number): void {
    const types = biome.enemyTypes.length ? biome.enemyTypes : ['grove_wisp'];
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const ox = (Math.random() - 0.5) * 8;
      const oz = (Math.random() - 0.5) * 8;
      if (this.enemies.filter((e) => e.alive).length < this.maxEnemies) {
        this.spawn(type, x + ox, z + oz, y, level);
      }
    }
  }

  update(
    dt: number,
    playerPos: THREE.Vector3,
    worldHeight: (x: number, z: number) => number,
    biome: BiomeDefinition,
    playerLevel: number,
    isNight = false,
    aggroMult = 1,
  ): void {
    this.spawnTimer -= dt;
    const alive = this.enemies.filter((e) => e.alive);
    const cap = Math.min(15, this.maxEnemies);
    const spawnInterval = (isNight ? 5.5 : 8) + Math.random() * (isNight ? 4 : 6);
    if (this.spawnTimer <= 0 && alive.length < cap) {
      this.spawnTimer = spawnInterval / Math.max(0.85, aggroMult);
      const angle = Math.random() * Math.PI * 2;
      const dist = 25 + Math.random() * 15;
      const sx = playerPos.x + Math.sin(angle) * dist;
      const sz = playerPos.z + Math.cos(angle) * dist;
      const type = biome.enemyTypes[Math.floor(Math.random() * biome.enemyTypes.length)] ?? 'grove_wisp';
      if (Math.random() < 0.05 && ENEMY_TYPES.void_abomination) {
        if (alive.length < this.maxEnemies) this.spawn('void_abomination', sx, sz, worldHeight(sx, sz), playerLevel);
      } else {
        if (alive.length < this.maxEnemies) this.spawn(type, sx, sz, worldHeight(sx, sz), playerLevel);
      }
    }

    for (const enemy of this.enemies) {
      enemy.update(dt, playerPos, worldHeight);
    }

    this.enemies = this.enemies.filter((e) => {
      if (!e.alive) {
        this.scene.remove(e.mesh);
        return false;
      }
      return true;
    });
  }

  getAlive(): Enemy[] {
    return this.enemies.filter((e) => e.alive);
  }

  dispose(): void {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
  }
}

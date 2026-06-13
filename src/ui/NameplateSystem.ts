import * as THREE from 'three';
import type { NetworkPlayerState } from '../network/NetworkClient';
import type { EnemyTier } from '../combat/Enemy';

interface Plate {
  el: HTMLElement;
  target: THREE.Vector3;
  label: string;
  isLocal?: boolean;
  type: 'player' | 'enemy';
  fill?: HTMLElement;
  healthPct?: number;
  tier?: EnemyTier;
}

interface EnemyPlateTarget {
  id: string;
  name: string;
  tier: EnemyTier;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  healthBarOffset: number;
}

export class NameplateSystem {
  private container: HTMLElement;
  private plates = new Map<string, Plate>();
  private projector: ((pos: THREE.Vector3) => { x: number; y: number }) | null = null;

  constructor() {
    this.container = document.getElementById('nameplates') ?? this.createContainer();
  }

  private createContainer(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'nameplates';
    el.className = 'nameplates-layer';
    document.body.appendChild(el);
    return el;
  }

  setProjector(fn: (pos: THREE.Vector3) => { x: number; y: number }): void {
    this.projector = fn;
  }

  setLocalPlayer(name: string, position: THREE.Vector3): void {
    this.upsert('__local__', name, position, true);
  }

  syncRemotes(players: (NetworkPlayerState & { y?: number })[]): void {
    const ids = new Set(players.map((p) => p.id));
    for (const id of this.plates.keys()) {
      if (!id.startsWith('enemy:') && id !== '__local__' && !ids.has(id)) this.remove(id);
    }
    for (const p of players) {
      const pos = new THREE.Vector3(p.x, (p.y ?? 0) + 2.1, p.z);
      this.upsert(p.id, p.name, pos, false, p.level);
    }
  }

  syncEnemies(enemies: EnemyPlateTarget[], playerPosition: THREE.Vector3): void {
    const visibleEnemies = enemies.filter((enemy) => {
      if (enemy.health <= 0 || enemy.maxHealth <= 0) return false;
      const maxDistance = enemy.tier === 'boss' ? 96 : enemy.tier === 'elite' ? 62 : 48;
      return enemy.position.distanceTo(playerPosition) <= maxDistance;
    });
    const ids = new Set(visibleEnemies.map((enemy) => `enemy:${enemy.id}`));

    for (const id of this.plates.keys()) {
      if (id.startsWith('enemy:') && !ids.has(id)) this.remove(id);
    }

    for (const enemy of visibleEnemies) {
      const pos = enemy.position.clone();
      pos.y += enemy.healthBarOffset;
      this.upsertEnemy(
        `enemy:${enemy.id}`,
        enemy.name,
        pos,
        enemy.tier,
        enemy.health / enemy.maxHealth,
      );
    }
  }

  private upsert(
    id: string,
    name: string,
    position: THREE.Vector3,
    isLocal: boolean,
    level?: number,
  ): void {
    let plate = this.plates.get(id);
    const text = level ? `${name}  Lv.${level}` : name;
    if (!plate) {
      const el = document.createElement('div');
      el.className = `nameplate${isLocal ? ' local' : ''}`;
      this.container.appendChild(el);
      plate = { el, target: position.clone(), label: text, isLocal, type: 'player' };
      this.plates.set(id, plate);
    }
    plate.target.copy(position);
    plate.label = text;
    plate.el.textContent = text;
    plate.el.classList.toggle('local', isLocal);
  }

  private upsertEnemy(
    id: string,
    name: string,
    position: THREE.Vector3,
    tier: EnemyTier,
    healthPct: number,
  ): void {
    let plate = this.plates.get(id);
    const pct = THREE.MathUtils.clamp(healthPct, 0, 1);
    if (!plate) {
      const el = document.createElement('div');
      el.className = `enemy-healthplate ${tier}`;

      const label = document.createElement('div');
      label.className = 'enemy-health-name';
      el.appendChild(label);

      const bar = document.createElement('div');
      bar.className = 'enemy-health-bar';
      const fill = document.createElement('div');
      fill.className = 'enemy-health-fill';
      bar.appendChild(fill);
      el.appendChild(bar);

      this.container.appendChild(el);
      plate = { el, target: position.clone(), label: name, type: 'enemy', fill, healthPct: pct, tier };
      this.plates.set(id, plate);
    }

    plate.target.copy(position);
    plate.label = name;
    plate.healthPct = pct;
    plate.tier = tier;
    plate.el.className = `enemy-healthplate ${tier}`;
    const label = plate.el.querySelector('.enemy-health-name');
    if (label) label.textContent = tier === 'normal' ? name : `${name} ${Math.ceil(pct * 100)}%`;
    if (plate.fill) plate.fill.style.transform = `scaleX(${pct})`;
  }

  remove(id: string): void {
    const plate = this.plates.get(id);
    if (!plate) return;
    plate.el.remove();
    this.plates.delete(id);
  }

  update(): void {
    if (!this.projector) return;
    for (const plate of this.plates.values()) {
      const screen = this.projector(plate.target);
      plate.el.style.left = `${screen.x}px`;
      plate.el.style.top = `${screen.y}px`;
      if (plate.type === 'player') plate.el.textContent = plate.label;
    }
  }

  dispose(): void {
    for (const plate of this.plates.values()) plate.el.remove();
    this.plates.clear();
  }
}

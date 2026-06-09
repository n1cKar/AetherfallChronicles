import * as THREE from 'three';
import { createStylizedMaterial } from '../render/shaders/StylizedMaterial';
import { createLowPolyRock } from '../render/LowPolyMeshes';
import { distance2D } from '../utils/math';
import type { EventBus } from '../utils/EventBus';
import type { MapPOI } from '../world/WorldManager';

export interface MineNode {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  depth: number;
  depleted: boolean;
  respawn: number;
}

export interface DigSpot {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  dug: boolean;
}

export interface ArenaState {
  active: boolean;
  wave: number;
  timer: number;
  enemiesToSpawn: number;
  center: THREE.Vector3;
}

export class ActivityManager {
  mineNodes: MineNode[] = [];
  digSpots: DigSpot[] = [];
  arena: ArenaState = {
    active: false,
    wave: 0,
    timer: 0,
    enemiesToSpawn: 0,
    center: new THREE.Vector3(),
  };
  shrineBlessed = false;
  private miningProgress = 0;
  private miningNodeId: string | null = null;

  constructor(private scene: THREE.Scene, private bus: EventBus) {}

  spawnWorldContent(wx: number, wz: number, getHeight: (x: number, z: number) => number): void {
    this.spawnArena(wx + 22, wz - 18, getHeight);
    this.spawnMineNode(wx + 30, wz + 12, getHeight, 'deep');
    this.spawnMineNode(wx - 18, wz + 20, getHeight, 'surface');
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.5;
      this.spawnDigSpot(wx + Math.cos(a) * 22, wz + Math.sin(a) * 22, getHeight);
    }
  }

  spawnArena(x: number, z: number, getHeight: (x: number, z: number) => number): void {
    const y = getHeight(x, z);
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4, 5.5, 24),
      new THREE.MeshStandardMaterial({ color: 0xc87840, emissive: 0x884420, emissiveIntensity: 0.4 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    g.add(ring);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2, 0.4), createStylizedMaterial(0x6a5040));
    post.position.set(0, 1, -5);
    g.add(post);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.8), createStylizedMaterial(0xaa4422));
    banner.position.set(0, 2.2, -5.01);
    g.add(banner);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.arena.center.set(x, y, z);
  }

  spawnMineNode(x: number, z: number, getHeight: (x: number, z: number) => number, depth: 'surface' | 'deep'): void {
    const y = getHeight(x, z);
    const g = new THREE.Group();
    const rock = createLowPolyRock(depth === 'deep' ? 1.1 : 0.7);
    rock.position.y = 0.4;
    g.add(rock);
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35, 0),
      createStylizedMaterial(depth === 'deep' ? 0x88aaff : 0xaaaaaa, { emissive: 0x4466aa, emissiveIntensity: 0.5 }),
    );
    crystal.position.y = 1.1;
    g.add(crystal);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.mineNodes.push({
      id: `mine_${x}_${z}`,
      mesh: g,
      position: new THREE.Vector3(x, y, z),
      depth: depth === 'deep' ? 3 : 1,
      depleted: false,
      respawn: 0,
    });
  }

  spawnDigSpot(x: number, z: number, getHeight: (x: number, z: number) => number): void {
    const y = getHeight(x, z);
    const g = new THREE.Group();
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      createStylizedMaterial(0x6a5a40),
    );
    mound.position.y = 0.1;
    g.add(mound);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.digSpots.push({ id: `dig_${x}_${z}`, mesh: g, position: new THREE.Vector3(x, y, z), dug: false });
  }

  update(
    dt: number,
    px: number,
    pz: number,
    getHeight: (x: number, z: number) => number,
    useAction: boolean,
  ): {
    hint: string;
    miningPct: number;
    inArena: boolean;
  } {
    let hint = '';
    let miningPct = 0;

    for (const m of this.mineNodes) {
      if (m.depleted) {
        m.respawn -= dt;
        if (m.respawn <= 0) {
          m.depleted = false;
          m.mesh.visible = true;
        }
        continue;
      }
      m.mesh.rotation.y += dt * 0.3;
    }

    const mine = this.getNearestMine(px, pz);
    const dig = this.getNearestDig(px, pz);
    const inArena = distance2D(px, pz, this.arena.center.x, this.arena.center.z) < 6;

    if (inArena && !this.arena.active) {
      hint = 'Press F to enter Void Arena';
      if (useAction) {
        this.startArena();
        this.bus.emit('arena_start');
      }
    } else if (mine && !this.arena.active) {
      hint = `Press F to mine (${mine.depth} strikes)`;
      if (useAction) {
        if (!this.miningNodeId) this.miningNodeId = mine.id;
        if (this.miningNodeId === mine.id) {
          this.miningProgress += dt;
          miningPct = Math.min(1, this.miningProgress / (0.8 * mine.depth));
          if (this.miningProgress >= 0.8 * mine.depth) {
            this.completeMine(mine);
            this.miningProgress = 0;
            this.miningNodeId = null;
          }
        }
      } else {
        this.miningProgress = 0;
        this.miningNodeId = null;
      }
    } else if (dig && !this.arena.active) {
      hint = 'Press F to dig for treasure';
      if (useAction) {
        dig.dug = true;
        dig.mesh.visible = false;
        this.bus.emit('treasure_dug');
        setTimeout(() => {
          dig.dug = false;
          dig.mesh.visible = true;
        }, 90000);
      }
    }

    if (this.arena.active) {
      this.arena.timer -= dt;
      if (this.arena.timer <= 0 && this.arena.enemiesToSpawn <= 0) {
        this.arena.wave++;
        this.arena.enemiesToSpawn = 2 + this.arena.wave;
        this.arena.timer = 45;
        this.bus.emit('arena_wave', this.arena.wave);
      }
      hint = `Arena Wave ${this.arena.wave} — clear foes!`;
    }

    return { hint, miningPct, inArena };
  }

  private completeMine(node: MineNode): void {
    node.depth -= 1;
    if (node.depth <= 0) {
      node.depleted = true;
      node.mesh.visible = false;
      node.respawn = 60;
      node.depth = node.id.includes('30') ? 3 : 1;
    }
    this.bus.emit('ore_mined', node.depth <= 0 ? 2 : 1);
  }

  startArena(): void {
    this.arena.active = true;
    this.arena.wave = 1;
    this.arena.timer = 30;
    this.arena.enemiesToSpawn = 3;
    this.bus.emit('arena_wave', 1);
  }

  onArenaKill(): void {
    if (!this.arena.active) return;
    this.arena.enemiesToSpawn = Math.max(0, this.arena.enemiesToSpawn - 1);
    if (this.arena.enemiesToSpawn <= 0 && this.arena.wave >= 5) {
      this.arena.active = false;
      this.bus.emit('arena_complete', this.arena.wave);
    }
  }

  blessShrine(): void {
    if (this.shrineBlessed) return;
    this.shrineBlessed = true;
    this.bus.emit('shrine_blessed');
    setTimeout(() => { this.shrineBlessed = false; }, 120000);
  }

  getNearestMine(px: number, pz: number, max = 3.5): MineNode | null {
    let best: MineNode | null = null;
    let bestD = max * max;
    for (const n of this.mineNodes) {
      if (n.depleted) continue;
      const d = distance2D(n.position.x, n.position.z, px, pz);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  getNearestDig(px: number, pz: number, max = 2.8): DigSpot | null {
    let best: DigSpot | null = null;
    let bestD = max * max;
    for (const d of this.digSpots) {
      if (d.dug) continue;
      const dist = distance2D(d.position.x, d.position.z, px, pz);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return best;
  }

  getMapPOIs(): MapPOI[] {
    const pois: MapPOI[] = [{ type: 'ruin', x: this.arena.center.x, z: this.arena.center.z, meta: 'Void Arena' }];
    for (const m of this.mineNodes) {
      if (!m.depleted) pois.push({ type: 'gather', x: m.position.x, z: m.position.z, meta: 'mine' });
    }
    for (const d of this.digSpots) {
      if (!d.dug) pois.push({ type: 'chest', x: d.position.x, z: d.position.z, meta: 'dig' });
    }
    return pois;
  }

  dispose(): void {
    for (const m of this.mineNodes) this.scene.remove(m.mesh);
    for (const d of this.digSpots) this.scene.remove(d.mesh);
    this.mineNodes = [];
    this.digSpots = [];
  }
}

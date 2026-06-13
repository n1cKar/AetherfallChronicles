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

export interface SpireState {
  active: boolean;
  floor: number;
  timer: number;
  enemiesToSpawn: number;
  center: THREE.Vector3;
}

export interface RiftObelisk {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  cooldown: number;
}

export interface RiftTrialState {
  active: boolean;
  tier: number;
  timer: number;
  enemiesToSpawn: number;
  center: THREE.Vector3;
}

interface VectorSave {
  x: number;
  y: number;
  z: number;
}

interface TimedActivitySave {
  active: boolean;
  step: number;
  timer: number;
  enemiesToSpawn: number;
  center: VectorSave;
}

export interface ActivitySave {
  mineNodes: { id: string; depth: number; depleted: boolean; respawn: number }[];
  digSpots: { id: string; dug: boolean }[];
  riftObelisks: { id: string; cooldown: number }[];
  arena: TimedActivitySave;
  spire: TimedActivitySave;
  rift: TimedActivitySave;
  shrineBlessed: boolean;
  miningProgress: number;
  miningNodeId: string | null;
}

export class ActivityManager {
  mineNodes: MineNode[] = [];
  digSpots: DigSpot[] = [];
  riftObelisks: RiftObelisk[] = [];
  arena: ArenaState = {
    active: false,
    wave: 0,
    timer: 0,
    enemiesToSpawn: 0,
    center: new THREE.Vector3(),
  };
  spire: SpireState = {
    active: false,
    floor: 0,
    timer: 0,
    enemiesToSpawn: 0,
    center: new THREE.Vector3(),
  };
  rift: RiftTrialState = {
    active: false,
    tier: 0,
    timer: 0,
    enemiesToSpawn: 0,
    center: new THREE.Vector3(),
  };
  shrineBlessed = false;
  private miningProgress = 0;
  private miningNodeId: string | null = null;

  constructor(private scene: THREE.Scene, private bus: EventBus) {}

  spawnWorldContent(wx: number, wz: number, getHeight: (x: number, z: number) => number): void {
    this.spawnSpire(wx - 28, wz + 8, getHeight);
    this.spawnArena(wx + 22, wz - 18, getHeight);
    this.spawnMineNode(wx + 30, wz + 12, getHeight, 'deep');
    this.spawnMineNode(wx - 18, wz + 20, getHeight, 'surface');
    this.spawnMineNode(wx + 48, wz - 6, getHeight, 'deep');
    this.spawnMineNode(wx - 42, wz - 18, getHeight, 'surface');
    this.spawnMineNode(wx + 8, wz + 38, getHeight, 'surface');
    this.spawnRiftObelisk(wx + 34, wz - 34, getHeight);
    this.spawnRiftObelisk(wx - 38, wz + 34, getHeight);
    this.spawnRiftObelisk(wx + 56, wz + 26, getHeight);
    this.spawnRiftObelisk(wx - 58, wz - 36, getHeight);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.5;
      const dist = 20 + (i % 4) * 8;
      this.spawnDigSpot(wx + Math.cos(a) * dist, wz + Math.sin(a) * dist, getHeight);
    }
  }

  loadFromSave(data?: ActivitySave): void {
    if (!data) return;

    const savedMines = new Map(data.mineNodes?.map((m) => [m.id, m]) ?? []);
    for (const node of this.mineNodes) {
      const saved = savedMines.get(node.id);
      if (!saved) continue;
      node.depth = Math.max(1, saved.depth ?? node.depth);
      node.depleted = Boolean(saved.depleted);
      node.respawn = Math.max(0, saved.respawn ?? 0);
      node.mesh.visible = !node.depleted;
    }

    const savedDigSpots = new Map(data.digSpots?.map((d) => [d.id, d]) ?? []);
    for (const spot of this.digSpots) {
      const saved = savedDigSpots.get(spot.id);
      if (!saved) continue;
      spot.dug = Boolean(saved.dug);
      spot.mesh.visible = !spot.dug;
    }

    const savedRifts = new Map(data.riftObelisks?.map((r) => [r.id, r]) ?? []);
    for (const obelisk of this.riftObelisks) {
      const saved = savedRifts.get(obelisk.id);
      if (!saved) continue;
      obelisk.cooldown = Math.max(0, saved.cooldown ?? 0);
    }

    this.restoreTimedActivity(this.arena, data.arena, 'wave');
    this.restoreTimedActivity(this.spire, data.spire, 'floor');
    this.restoreTimedActivity(this.rift, data.rift, 'tier');
    this.shrineBlessed = Boolean(data.shrineBlessed);
    this.miningProgress = data.miningProgress ?? 0;
    this.miningNodeId = data.miningNodeId ?? null;
  }

  toSave(): ActivitySave {
    return {
      mineNodes: this.mineNodes.map((m) => ({
        id: m.id,
        depth: m.depth,
        depleted: m.depleted,
        respawn: m.respawn,
      })),
      digSpots: this.digSpots.map((d) => ({
        id: d.id,
        dug: d.dug,
      })),
      riftObelisks: this.riftObelisks.map((r) => ({
        id: r.id,
        cooldown: r.cooldown,
      })),
      arena: this.saveTimedActivity(this.arena, this.arena.wave),
      spire: this.saveTimedActivity(this.spire, this.spire.floor),
      rift: this.saveTimedActivity(this.rift, this.rift.tier),
      shrineBlessed: this.shrineBlessed,
      miningProgress: this.miningProgress,
      miningNodeId: this.miningNodeId,
    };
  }

  spawnRiftObelisk(x: number, z: number, getHeight: (x: number, z: number) => number): void {
    const y = getHeight(x, z);
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.45, 7),
      createStylizedMaterial(0x3e4054),
    );
    base.position.y = 0.22;
    g.add(base);
    const obelisk = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 2.8, 0.7),
      createStylizedMaterial(0x5960a8, { emissive: 0x333dff, emissiveIntensity: 0.35 }),
    );
    obelisk.position.y = 1.65;
    obelisk.rotation.y = Math.PI / 4;
    g.add(obelisk);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.05, 6, 24),
      createStylizedMaterial(0x88ccff, { emissive: 0x4488ff, emissiveIntensity: 0.8 }),
    );
    ring.position.y = 2.35;
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const light = new THREE.PointLight(0x6688ff, 1.15, 12);
    light.position.y = 2.3;
    g.add(light);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.riftObelisks.push({ id: `rift_${x}_${z}`, mesh: g, position: new THREE.Vector3(x, y, z), cooldown: 0 });
  }

  spawnSpire(x: number, z: number, getHeight: (x: number, z: number) => number): void {
    const y = getHeight(x, z);
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const tier = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2 - i * 0.25, 2.5 - i * 0.25, 1.2, 6),
        createStylizedMaterial(0x6a7aaa, { emissive: 0x3344aa, emissiveIntensity: 0.25 }),
      );
      tier.position.y = 0.6 + i * 1.1;
      g.add(tier);
    }
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.6, 0),
      createStylizedMaterial(0xaaccff, { emissive: 0x6688ff, emissiveIntensity: 0.8 }),
    );
    crystal.position.y = 7.2;
    g.add(crystal);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.spire.center.set(x, y, z);
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
    playerLevel = 1,
  ): {
    hint: string;
    miningPct: number;
    inArena: boolean;
    inSpire: boolean;
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
    for (const r of this.riftObelisks) {
      if (r.cooldown > 0) r.cooldown -= dt;
      r.mesh.rotation.y += dt * 0.25;
      const ring = r.mesh.children[2] as THREE.Mesh | undefined;
      if (ring) ring.rotation.z += dt * 1.4;
    }

    const mine = this.getNearestMine(px, pz);
    const dig = this.getNearestDig(px, pz);
    const rift = this.getNearestRift(px, pz);
    const inArena = distance2D(px, pz, this.arena.center.x, this.arena.center.z) < 6;
    const inSpire = distance2D(px, pz, this.spire.center.x, this.spire.center.z) < 5;

    if (rift && !this.rift.active && !this.arena.active && !this.spire.active) {
      hint = rift.cooldown > 0
        ? `Rift stabilizing - ${Math.ceil(rift.cooldown)}s`
        : 'Press F to open an Aether Rift Trial';
      if (useAction && rift.cooldown <= 0) this.startRift(rift, playerLevel);
    } else if (inSpire && !this.spire.active && !this.arena.active && playerLevel >= 15) {
      hint = 'Press F to ascend the Aether Spire';
      if (useAction) this.startSpire();
    } else if (inSpire && playerLevel < 15) {
      hint = 'Aether Spire - reach level 15 to enter';
    } else if (inArena && !this.arena.active) {
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

    if (this.spire.active) {
      this.spire.timer -= dt;
      if (this.spire.timer <= 0 && this.spire.enemiesToSpawn <= 0) {
        this.spire.floor++;
        this.spire.enemiesToSpawn = 2 + Math.floor(this.spire.floor * 1.2);
        this.spire.timer = 50;
        this.bus.emit('spire_floor', this.spire.floor);
        if (this.spire.floor >= 8) {
          this.spire.active = false;
          this.bus.emit('spire_complete', this.spire.floor);
        }
      }
      hint = `Aether Spire - Floor ${this.spire.floor}`;
    }

    if (this.rift.active) {
      this.rift.timer -= dt;
      if (this.rift.timer <= 0 && this.rift.enemiesToSpawn <= 0) {
        this.rift.tier++;
        if (this.rift.tier > 3) {
          this.rift.active = false;
          this.bus.emit('rift_complete', this.rift.tier);
          const obelisk = this.riftObelisks.find((r) => r.position.distanceTo(this.rift.center) < 1);
          if (obelisk) obelisk.cooldown = 90;
        } else {
          this.rift.enemiesToSpawn = 2 + this.rift.tier * 2;
          this.rift.timer = 34;
          this.bus.emit('rift_tier', this.rift.tier);
        }
      }
      hint = `Aether Rift Trial - Tier ${this.rift.tier}`;
    }

    return { hint, miningPct, inArena, inSpire };
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

  startSpire(): void {
    this.spire.active = true;
    this.spire.floor = 1;
    this.spire.timer = 35;
    this.spire.enemiesToSpawn = 3;
    this.bus.emit('spire_floor', 1);
  }

  startRift(obelisk: RiftObelisk, playerLevel: number): void {
    this.rift.active = true;
    this.rift.tier = Math.max(1, Math.floor(playerLevel / 6));
    this.rift.timer = 30;
    this.rift.enemiesToSpawn = 4;
    this.rift.center.copy(obelisk.position);
    this.bus.emit('rift_start', this.rift.tier);
  }

  onSpireKill(): void {
    if (!this.spire.active) return;
    this.spire.enemiesToSpawn = Math.max(0, this.spire.enemiesToSpawn - 1);
  }

  onRiftKill(): void {
    if (!this.rift.active) return;
    this.rift.enemiesToSpawn = Math.max(0, this.rift.enemiesToSpawn - 1);
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

  getNearestRift(px: number, pz: number, max = 4.5): RiftObelisk | null {
    let best: RiftObelisk | null = null;
    let bestD = max * max;
    for (const r of this.riftObelisks) {
      const dist = distance2D(r.position.x, r.position.z, px, pz);
      if (dist < bestD) { bestD = dist; best = r; }
    }
    return best;
  }

  getMapPOIs(): MapPOI[] {
    const pois: MapPOI[] = [
      { type: 'mountain', x: this.spire.center.x, z: this.spire.center.z, meta: 'Aether Spire' },
      { type: 'ruin', x: this.arena.center.x, z: this.arena.center.z, meta: 'Void Arena' },
    ];
    for (const r of this.riftObelisks) {
      pois.push({ type: 'puzzle', x: r.position.x, z: r.position.z, meta: r.cooldown > 0 ? 'Rift Cooldown' : 'Aether Rift Trial' });
    }
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
    for (const r of this.riftObelisks) this.scene.remove(r.mesh);
    this.mineNodes = [];
    this.digSpots = [];
    this.riftObelisks = [];
  }

  private saveTimedActivity(
    state: ArenaState | SpireState | RiftTrialState,
    step: number,
  ): TimedActivitySave {
    return {
      active: state.active,
      step,
      timer: state.timer,
      enemiesToSpawn: state.enemiesToSpawn,
      center: { x: state.center.x, y: state.center.y, z: state.center.z },
    };
  }

  private restoreTimedActivity(
    state: ArenaState | SpireState | RiftTrialState,
    data: TimedActivitySave | undefined,
    stepKey: 'wave' | 'floor' | 'tier',
  ): void {
    if (!data) return;
    state.active = Boolean(data.active);
    state.timer = Math.max(0, data.timer ?? 0);
    state.enemiesToSpawn = Math.max(0, data.enemiesToSpawn ?? 0);
    if (data.center) state.center.set(data.center.x, data.center.y, data.center.z);
    if (stepKey === 'wave') (state as ArenaState).wave = Math.max(0, data.step ?? 0);
    else if (stepKey === 'floor') (state as SpireState).floor = Math.max(0, data.step ?? 0);
    else (state as RiftTrialState).tier = Math.max(0, data.step ?? 0);
  }
}

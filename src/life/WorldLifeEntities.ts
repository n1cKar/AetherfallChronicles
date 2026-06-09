import * as THREE from 'three';
import { createStylizedMaterial } from '../render/shaders/StylizedMaterial';
import { createLowPolyRock } from '../render/LowPolyMeshes';
import { distance2D } from '../utils/math';
import type { MaterialId } from './Materials';

export interface FishingSpot {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  active: boolean;
}

export interface GatherNode {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  type: 'herb' | 'ore' | 'wood';
  amount: number;
  respawnTimer: number;
}

export interface Wildlife {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  hp: number;
  alive: boolean;
  fleeDir: THREE.Vector3;
  wanderAngle: number;
  type: 'deer' | 'boar';
}

export class WorldLifeEntities {
  fishingSpots: FishingSpot[] = [];
  gatherNodes: GatherNode[] = [];
  wildlife: Wildlife[] = [];

  constructor(private scene: THREE.Scene) {}

  spawnStarterContent(wx: number, wz: number, getHeight: (x: number, z: number) => number): void {
    this.spawnFishingSpot(wx + 18, wz - 8, getHeight);
    this.spawnFishingSpot(wx - 12, wz + 22, getHeight);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 14 + (i % 3) * 4;
      const gx = wx + Math.cos(angle) * dist;
      const gz = wz + Math.sin(angle) * dist;
      this.spawnGatherNode(gx, gz, getHeight, i % 3 === 0 ? 'ore' : i % 3 === 1 ? 'wood' : 'herb');
    }
    for (let i = 0; i < 4; i++) {
      const gx = wx + (Math.random() - 0.5) * 40;
      const gz = wz + (Math.random() - 0.5) * 40;
      this.spawnWildlife(gx, gz, getHeight, i % 2 === 0 ? 'deer' : 'boar');
    }
  }

  spawnFishingSpot(wx: number, wz: number, getHeight: (x: number, z: number) => number): void {
    const y = getHeight(wx, wz);
    const g = new THREE.Group();
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(3.5, 32),
      new THREE.MeshStandardMaterial({
        color: 0x2a5a8a,
        transparent: true,
        opacity: 0.75,
        roughness: 0.2,
        metalness: 0.1,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.05;
    g.add(water);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6),
      createStylizedMaterial(0x5a4030),
    );
    post.position.set(0.6, 0.3, 0);
    g.add(post);
    g.position.set(wx, y, wz);
    this.scene.add(g);
    this.fishingSpots.push({ id: `fish_${wx}_${wz}`, mesh: g, position: new THREE.Vector3(wx, y, wz), active: true });
  }

  spawnGatherNode(wx: number, wz: number, getHeight: (x: number, z: number) => number, type: GatherNode['type']): void {
    const y = getHeight(wx, wz);
    const g = new THREE.Group();
    if (type === 'herb') {
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), createStylizedMaterial(0x3a8a48));
      bush.position.y = 0.4;
      g.add(bush);
      const bush2 = bush.clone();
      bush2.position.set(0.3, 0.5, 0.2);
      g.add(bush2);
    } else if (type === 'ore') {
      const rock = createLowPolyRock(0.6);
      rock.position.y = 0.3;
      g.add(rock);
    } else {
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.5, 6), createStylizedMaterial(0x5a4030));
      stump.position.y = 0.25;
      g.add(stump);
    }
    const light = new THREE.PointLight(type === 'ore' ? 0xffaa66 : 0x66cc88, 0.4, 4);
    light.position.y = 0.8;
    g.add(light);
    g.position.set(wx, y, wz);
    this.scene.add(g);
    this.gatherNodes.push({
      id: `node_${wx}_${wz}`,
      mesh: g,
      position: new THREE.Vector3(wx, y, wz),
      type,
      amount: 1 + Math.floor(Math.random() * 2),
      respawnTimer: 0,
    });
  }

  spawnWildlife(wx: number, wz: number, getHeight: (x: number, z: number) => number, type: Wildlife['type']): void {
    const y = getHeight(wx, wz);
    const g = new THREE.Group();
    const color = type === 'deer' ? 0x8a6a4a : 0x6a4a3a;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.2), createStylizedMaterial(color));
    body.position.y = 0.5;
    g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.5), createStylizedMaterial(color));
    head.position.y = 1.1;
    g.add(head);
    g.position.set(wx, y, wz);
    this.scene.add(g);
    this.wildlife.push({
      id: `wild_${wx}_${wz}`,
      mesh: g,
      position: new THREE.Vector3(wx, y, wz),
      hp: type === 'boar' ? 3 : 2,
      alive: true,
      fleeDir: new THREE.Vector3(),
      wanderAngle: Math.random() * Math.PI * 2,
      type,
    });
  }

  update(dt: number, playerX: number, playerZ: number, getHeight: (x: number, z: number) => number): void {
    for (const w of this.wildlife) {
      if (!w.alive) continue;
      const dist = distance2D(w.position.x, w.position.z, playerX, playerZ);
      if (dist < 4 && dist > 0.5) {
        const awayX = w.position.x - playerX;
        const awayZ = w.position.z - playerZ;
        const len = Math.hypot(awayX, awayZ) || 1;
        w.fleeDir.set(awayX / len, 0, awayZ / len);
        w.position.x += w.fleeDir.x * 10 * dt;
        w.position.z += w.fleeDir.z * 10 * dt;
      } else {
        w.wanderAngle += dt * 0.5;
        w.position.x += Math.cos(w.wanderAngle) * 1.5 * dt;
        w.position.z += Math.sin(w.wanderAngle) * 1.5 * dt;
      }
      w.position.y = getHeight(w.position.x, w.position.z);
      w.mesh.position.copy(w.position);
    }

    for (const n of this.gatherNodes) {
      if (n.amount <= 0) {
        n.respawnTimer -= dt;
        if (n.respawnTimer <= 0) {
          n.amount = 1 + Math.floor(Math.random() * 2);
          n.mesh.visible = true;
        }
        continue;
      }
      n.mesh.rotation.y += dt;
    }
  }

  getNearestFishing(px: number, pz: number, maxDist = 5): FishingSpot | null {
    let best: FishingSpot | null;
    let bestD = maxDist * maxDist;
    for (const s of this.fishingSpots) {
      if (!s.active) continue;
      const d = distance2D(s.position.x, s.position.z, px, pz);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  getNearestGather(px: number, pz: number, maxDist = 3): GatherNode | null {
    let best: GatherNode | null;
    let bestD = maxDist * maxDist;
    for (const n of this.gatherNodes) {
      if (n.amount <= 0) continue;
      const d = distance2D(n.position.x, n.position.z, px, pz);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  getNearestWildlife(px: number, pz: number, maxDist = 3): Wildlife | null {
    let best: Wildlife | null;
    let bestD = maxDist * maxDist;
    for (const w of this.wildlife) {
      if (!w.alive) continue;
      const d = distance2D(w.position.x, w.position.z, px, pz);
      if (d < bestD) { bestD = d; best = w; }
    }
    return best;
  }

  harvestNode(node: GatherNode): { type: MaterialId; amount: number } {
    const mat: Record<GatherNode['type'], MaterialId> = { herb: 'herb', ore: 'ore', wood: 'wood' };
    const type = mat[node.type];
    node.amount -= 1;
    if (node.amount <= 0) {
      node.mesh.visible = false;
      node.respawnTimer = 45 + Math.random() * 30;
    }
    return { type, amount: 1 };
  }

  killWildlife(w: Wildlife): { type: MaterialId; amount: number }[] {
    w.alive = false;
    w.mesh.visible = false;
    const drops: { type: MaterialId; amount: number }[] = [
      { type: 'raw_meat', amount: w.type === 'boar' ? 2 : 1 },
      { type: 'hide', amount: 1 },
    ];
    if (Math.random() < 0.4) drops.push({ type: 'feather', amount: 1 });
    return drops;
  }

  dispose(): void {
    for (const s of this.fishingSpots) this.scene.remove(s.mesh);
    for (const n of this.gatherNodes) this.scene.remove(n.mesh);
    for (const w of this.wildlife) this.scene.remove(w.mesh);
    this.fishingSpots = [];
    this.gatherNodes = [];
    this.wildlife = [];
  }
}

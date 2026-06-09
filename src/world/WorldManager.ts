import * as THREE from 'three';
import { CHUNK_SIZE } from '../config/constants';
import type { PerformanceProfile } from '../core/PerformanceProfile';
import { chunkKey, worldToChunk } from '../utils/math';
import { ChunkGenerator, type ChunkData } from './ChunkGenerator';
import { BIOME_DEFINITIONS } from './BiomeConfig';
import { WorldInteractablesManager } from './WorldInteractables';
import {
  createCaveEntrance,
  createMountainPeak,
  createLargeRuin,
} from '../render/WorldLandmarks';
import { createWorldProp } from '../render/WorldProps';

const NPC_DIALOGUE_ELERA = [
  'The rift tears wider each night. Clear the woods and recover our supplies.',
  'When you are ready, seek Emberroot Cave to the northeast — that is where the void festers.',
];
const NPC_DIALOGUE_THERON = [
  'Fresh stock from the caravan — well, what survived. I buy herbs, fish, and ore.',
  'Press C to craft goods, then sell extras to me with E.',
];
const NPC_DIALOGUE_GARRICK = [
  'My forge is cold until we get ore. Smelt ingots at the camp workbench — key C.',
];
const NPC_DIALOGUE_LINA = [
  'Cast your line at the blue ponds east of camp. Night fishing is slower but rarer catches glow.',
  'Craft bait from herbs and meat — it helps tremendously.',
];
const NPC_DIALOGUE_MORA = [
  'Sunleaf grows on the ring around camp. Gather with F, brew potions with C.',
];
const NPC_DIALOGUE_BRAM = [
  'Deer and boar roam the wilds. Strike them when close — hides and meat feed the outpost.',
];
const NPC_DIALOGUE_SELA = [
  'Rest by my fire for ten gold — I will patch your wounds.',
];

export interface MapPOI {
  type: 'enemy' | 'chest' | 'npc' | 'shrine' | 'cave' | 'mountain' | 'ruin' | 'quest' | 'player' | 'fish' | 'gather' | 'wildlife';
  x: number;
  z: number;
  meta?: string;
}

export interface MinimapSnapshot {
  playerX: number;
  playerZ: number;
  pois: MapPOI[];
  biomeTiles: { x: number; z: number; color: string }[];
}

interface PendingChunk {
  cx: number;
  cz: number;
  key: string;
}

export class WorldManager {
  private chunks = new Map<string, ChunkData>();
  private generator: ChunkGenerator;
  private scene: THREE.Scene;
  private pending: PendingChunk[] = [];
  private viewDistance = 3;
  private maxChunksPerFrame = 2;
  private colliderCache: THREE.Box3[] = [];
  private colliderDirty = true;
  private landmarkPOIs: MapPOI[] = [];
  interactables: WorldInteractablesManager;
  private spawnedProps = new Set<string>();
  starterBuilt = false;

  constructor(scene: THREE.Scene, seed: number, profile: PerformanceProfile) {
    this.scene = scene;
    this.generator = new ChunkGenerator(seed);
    this.generator.applyPerformance(profile);
    this.viewDistance = profile.chunkViewDistance;
    this.maxChunksPerFrame = profile.maxChunksPerFrame;
    this.interactables = new WorldInteractablesManager(scene);
  }

  getHeightAt(wx: number, wz: number): number {
    return this.generator.getHeightAt(wx, wz);
  }

  preloadAround(wx: number, wz: number, radius = 2): void {
    const { cx: pcx, cz: pcz } = worldToChunk(wx, wz, CHUNK_SIZE);
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        this.ensureChunkLoaded(pcx + dx, pcz + dz);
      }
    }
    this.flushPending(999);
    this.buildStarterCamp(wx, wz);
    this.colliderDirty = true;
  }

  /** Guaranteed content at world origin so the game never looks empty */
  buildStarterCamp(wx: number, wz: number): void {
    if (this.starterBuilt) return;
    this.starterBuilt = true;
    const h = (x: number, z: number) => this.getHeightAt(x, z);

    const campfire = createWorldProp('campfire');
    campfire.group.position.set(wx + 6, h(wx + 6, wz + 4), wz + 4);
    this.scene.add(campfire.group);

    const tent = createWorldProp('village_hut');
    tent.group.position.set(wx + 12, h(wx + 12, wz - 2), wz - 2);
    tent.group.rotation.y = 0.4;
    this.scene.add(tent.group);

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const tree = createWorldProp('bush');
      tree.group.position.set(wx + Math.cos(angle) * 10, h(wx + Math.cos(angle) * 10, wz + Math.sin(angle) * 10), wz + Math.sin(angle) * 10);
      this.scene.add(tree.group);
    }

    this.interactables.spawnNpc(wx + 6, wz + 5, h(wx + 6, wz + 5), 'Captain Elara', NPC_DIALOGUE_ELERA);
    this.interactables.spawnNpc(wx + 14, wz + 6, h(wx + 14, wz + 6), 'Merchant Theron', NPC_DIALOGUE_THERON);
    this.interactables.spawnNpc(wx + 10, wz - 4, h(wx + 10, wz - 4), 'Blacksmith Garrick', NPC_DIALOGUE_GARRICK);
    this.interactables.spawnNpc(wx + 2, wz - 6, h(wx + 2, wz - 6), 'Fisher Lina', NPC_DIALOGUE_LINA);
    this.interactables.spawnNpc(wx - 6, wz + 8, h(wx - 6, wz + 8), 'Herbalist Mora', NPC_DIALOGUE_MORA);
    this.interactables.spawnNpc(wx - 8, wz - 2, h(wx - 8, wz - 2), 'Hunter Bram', NPC_DIALOGUE_BRAM);
    this.interactables.spawnNpc(wx + 8, wz + 2, h(wx + 8, wz + 2), 'Innkeeper Sela', NPC_DIALOGUE_SELA);

    const workbench = createWorldProp('village_hut');
    workbench.group.scale.set(0.55, 0.4, 0.55);
    workbench.group.position.set(wx + 11, h(wx + 11, wz + 2), wz + 2);
    this.scene.add(workbench.group);

    this.interactables.spawnChest(wx + 10, wz + 8, h(wx + 10, wz + 8));
    this.interactables.spawnChest(wx + 3, wz + 10, h(wx + 3, wz + 10));

    const cave = createCaveEntrance();
    const caveX = wx + 28;
    const caveZ = wz + 18;
    cave.position.set(caveX, h(caveX, caveZ), caveZ);
    cave.rotation.y = -0.6;
    this.scene.add(cave);
    this.landmarkPOIs.push({ type: 'cave', x: caveX, z: caveZ, meta: 'Emberroot Cave' });

    const mountain = createMountainPeak(1.1);
    const mtX = wx - 32;
    const mtZ = wz - 24;
    mountain.position.set(mtX, h(mtX, mtZ), mtZ);
    this.scene.add(mountain);
    this.landmarkPOIs.push({ type: 'mountain', x: mtX, z: mtZ, meta: 'Crown Peak' });

    const ruin = createLargeRuin();
    const ruinX = wx - 14;
    const ruinZ = wz + 16;
    ruin.position.set(ruinX, h(ruinX, ruinZ), ruinZ);
    this.scene.add(ruin);
    this.landmarkPOIs.push({ type: 'ruin', x: ruinX, z: ruinZ });

    this.interactables.spawnShrine(wx - 22, wz + 30, h(wx - 22, wz + 30));
    const shrine = this.interactables.shrines[this.interactables.shrines.length - 1];
    this.landmarkPOIs.push({ type: 'shrine', x: shrine.position.x, z: shrine.position.z, meta: 'Astral Shrine' });
  }

  private visitedCaves = new Set<string>();
  private visitedRuins = new Set<string>();
  private shrineVisited = false;

  checkVisitTriggers(px: number, pz: number, bus: { emit: (e: string, ...a: unknown[]) => void }): void {
    for (const poi of this.landmarkPOIs) {
      if (poi.type === 'cave') {
        const key = `${Math.floor(poi.x)}_${Math.floor(poi.z)}`;
        const d = (poi.x - px) ** 2 + (poi.z - pz) ** 2;
        if (d < 20 && !this.visitedCaves.has(key)) {
          this.visitedCaves.add(key);
          bus.emit('visit_cave', poi.meta);
        }
      }
      if (poi.type === 'ruin') {
        const key = `${Math.floor(poi.x)}_${Math.floor(poi.z)}`;
        const d = (poi.x - px) ** 2 + (poi.z - pz) ** 2;
        if (d < 18 && !this.visitedRuins.has(key)) {
          this.visitedRuins.add(key);
          bus.emit('visit_ruin', poi.meta);
        }
      }
    }
    if (!this.shrineVisited) {
      for (const s of this.interactables.shrines) {
        const d = (s.position.x - px) ** 2 + (s.position.z - pz) ** 2;
        if (d < 24) {
          this.shrineVisited = true;
          bus.emit('visit_shrine');
          break;
        }
      }
    }
  }

  getMinimapSnapshot(
    px: number,
    pz: number,
    questMarker: { x: number; z: number } | null,
    enemies: MapPOI[],
    extra: MapPOI[] = [],
  ): MinimapSnapshot {
    return this.buildMapSnapshot(px, pz, 56, 8, questMarker, [...enemies, ...extra]);
  }

  getWorldMapSnapshot(
    centerX: number,
    centerZ: number,
    range: number,
    step: number,
    questMarker: { x: number; z: number } | null,
    enemies: MapPOI[],
    extra: MapPOI[] = [],
  ): MinimapSnapshot {
    return this.buildMapSnapshot(centerX, centerZ, range, step, questMarker, [...enemies, ...extra]);
  }

  private buildMapSnapshot(
    centerX: number,
    centerZ: number,
    range: number,
    step: number,
    questMarker: { x: number; z: number } | null,
    enemies: MapPOI[],
  ): MinimapSnapshot {
    const pois: MapPOI[] = [...enemies];
    for (const c of this.interactables.chests) {
      pois.push({ type: 'chest', x: c.position.x, z: c.position.z, meta: c.opened ? 'open' : 'closed' });
    }
    for (const n of this.interactables.npcs) {
      pois.push({ type: 'npc', x: n.position.x, z: n.position.z, meta: n.name });
    }
    for (const s of this.interactables.shrines) {
      pois.push({ type: 'shrine', x: s.position.x, z: s.position.z });
    }
    for (const lm of this.landmarkPOIs) {
      if (!pois.some((p) => p.type === lm.type && Math.abs(p.x - lm.x) < 2)) pois.push(lm);
    }
    if (questMarker) pois.push({ type: 'quest', x: questMarker.x, z: questMarker.z });

    const biomeTiles: MinimapSnapshot['biomeTiles'] = [];
    for (let x = -range; x <= range; x += step) {
      for (let z = -range; z <= range; z += step) {
        const wx = centerX + x;
        const wz = centerZ + z;
        const biome = BIOME_DEFINITIONS[this.generator.getBiomeAtWorld(wx, wz)];
        biomeTiles.push({
          x: wx,
          z: wz,
          color: `#${biome.groundColor.toString(16).padStart(6, '0')}`,
        });
      }
    }

    return { playerX: centerX, playerZ: centerZ, pois, biomeTiles };
  }

  getCollidersNear(px: number, pz: number, radius: number): THREE.Box3[] {
    if (this.colliderDirty) this.rebuildColliderCache();
    const r2 = radius * radius;
    const out: THREE.Box3[] = [];
    for (const box of this.colliderCache) {
      const cx = (box.min.x + box.max.x) * 0.5;
      const cz = (box.min.z + box.max.z) * 0.5;
      const dx = cx - px;
      const dz = cz - pz;
      if (dx * dx + dz * dz <= r2) out.push(box);
    }
    return out;
  }

  private rebuildColliderCache(): void {
    this.colliderCache = [];
    for (const chunk of this.chunks.values()) {
      this.colliderCache.push(...chunk.colliders);
    }
    this.colliderDirty = false;
  }

  update(playerX: number, playerZ: number): void {
    const { cx: pcx, cz: pcz } = worldToChunk(playerX, playerZ, CHUNK_SIZE);
    const needed = new Set<string>();

    for (let dx = -this.viewDistance; dx <= this.viewDistance; dx++) {
      for (let dz = -this.viewDistance; dz <= this.viewDistance; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = chunkKey(cx, cz);
        needed.add(key);
        if (!this.chunks.has(key) && !this.pending.some((p) => p.key === key)) {
          this.pending.push({ cx, cz, key });
        }
      }
    }

    this.flushPending(this.maxChunksPerFrame);

    for (const [key, data] of this.chunks) {
      if (!needed.has(key)) this.unloadChunk(key, data);
    }
  }

  private flushPending(max: number): void {
    let n = 0;
    while (this.pending.length > 0 && n < max) {
      const next = this.pending.shift()!;
      if (!this.chunks.has(next.key)) {
        this.ensureChunkLoaded(next.cx, next.cz);
        n++;
      }
    }
  }

  private ensureChunkLoaded(cx: number, cz: number): void {
    const key = chunkKey(cx, cz);
    if (this.chunks.has(key)) return;

    const data = this.generator.generate(cx, cz);
    this.chunks.set(key, data);
    this.scene.add(data.mesh);
    this.colliderDirty = true;

    for (const lm of data.landmarks) {
      this.landmarkPOIs.push({
        type: lm.type === 'ruin_large' ? 'ruin' : lm.type,
        x: lm.wx,
        z: lm.wz,
      });
    }

    for (const ps of data.propSpawns) {
      const pk = `${ps.type}_${Math.floor(ps.wx)}_${Math.floor(ps.wz)}`;
      if (this.spawnedProps.has(pk)) continue;
      this.spawnedProps.add(pk);
      const y = this.getHeightAt(ps.wx, ps.wz);
      if (ps.type === 'chest') this.interactables.spawnChest(ps.wx, ps.wz, y);
      else if (ps.type === 'shrine') {
        this.interactables.spawnShrine(ps.wx, ps.wz, y);
        this.landmarkPOIs.push({ type: 'shrine', x: ps.wx, z: ps.wz });
      }
    }
  }

  private unloadChunk(key: string, data: ChunkData): void {
    this.scene.remove(data.mesh);
    data.mesh.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry?.dispose();
        const mat = o.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
    this.chunks.delete(key);
    this.colliderDirty = true;
  }

  getBiomeAtPlayer(x: number, z: number) {
    return BIOME_DEFINITIONS[this.generator.getBiomeAtWorld(x, z)];
  }

  dispose(): void {
    for (const data of this.chunks.values()) this.scene.remove(data.mesh);
    this.chunks.clear();
    this.interactables.dispose();
  }
}

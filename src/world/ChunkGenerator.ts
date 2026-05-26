import * as THREE from 'three';
import { CHUNK_SIZE } from '../config/constants';
import type { PerformanceProfile } from '../core/PerformanceProfile';
import { SeededNoise } from '../utils/noise';
import { BIOME_DEFINITIONS, getBiomeAt } from './BiomeConfig';
import type { BiomeId } from '../config/constants';
import {
  createLowPolyTree,
  createLowPolyRock,
  createLowPolyCrystal,
  createStructureRuin,
} from '../render/LowPolyMeshes';
import { createWorldProp, type PropType } from '../render/WorldProps';
import {
  createCaveEntrance,
  createMountainPeak,
  createBoulderCluster,
  createLargeRuin,
  type LandmarkSpawn,
} from '../render/WorldLandmarks';

export interface ChunkPropSpawn {
  type: 'chest' | 'npc' | 'shrine';
  wx: number;
  wz: number;
}

export interface ChunkData {
  cx: number;
  cz: number;
  biome: BiomeId;
  mesh: THREE.Group;
  colliders: THREE.Box3[];
  spawnPoints: { x: number; z: number; type: string }[];
  propSpawns: ChunkPropSpawn[];
  landmarks: LandmarkSpawn[];
  secretChance: number;
}

const PROP_TABLE: { type: PropType; weight: number; biome?: BiomeId[] }[] = [
  { type: 'bush', weight: 22 },
  { type: 'barrel', weight: 8 },
  { type: 'crate', weight: 8 },
  { type: 'torch', weight: 7 },
  { type: 'fence', weight: 5 },
  { type: 'campfire', weight: 5, biome: ['forest', 'mountain', 'frozen'] },
  { type: 'mushroom', weight: 8, biome: ['swamp', 'forest', 'magical'] },
  { type: 'bones', weight: 4, biome: ['corrupted', 'hell', 'swamp'] },
  { type: 'banner', weight: 4 },
  { type: 'village_hut', weight: 4, biome: ['forest', 'desert', 'magical'] },
  { type: 'temple_pillar', weight: 4, biome: ['magical', 'mountain', 'hell'] },
  { type: 'well', weight: 3, biome: ['forest', 'desert'] },
  { type: 'wagon', weight: 3 },
];

export class ChunkGenerator {
  private noise: SeededNoise;
  private moistureNoise: SeededNoise;
  private tempNoise: SeededNoise;
  private perf: Pick<PerformanceProfile, 'terrainSegments' | 'maxPropsPerChunk' | 'treeDensityMult'> = {
    terrainSegments: 16,
    maxPropsPerChunk: 10,
    treeDensityMult: 0.75,
  };

  constructor(seed: number) {
    this.noise = new SeededNoise(seed);
    this.moistureNoise = new SeededNoise(seed + 7919);
    this.tempNoise = new SeededNoise(seed + 104729);
  }

  applyPerformance(profile: PerformanceProfile): void {
    this.perf = profile;
  }

  getHeightAt(wx: number, wz: number): number {
    const elev = this.noise.fbm2D(wx * 0.008, wz * 0.008, 5);
    const detail = this.noise.fbm2D(wx * 0.04, wz * 0.04, 3) * 0.35;
    const mountains = Math.max(0, this.noise.fbm2D(wx * 0.015, wz * 0.015, 4)) ** 2 * 10;
    return (elev * 6 + detail * 2 + mountains) * 2;
  }

  getBiomeAtWorld(wx: number, wz: number): BiomeId {
    const elev = this.noise.fbm2D(wx * 0.008, wz * 0.008, 4);
    const moisture = this.moistureNoise.fbm2D(wx * 0.012, wz * 0.012, 4) * 0.5 + 0.5;
    const temp = this.tempNoise.fbm2D(wx * 0.01, wz * 0.01, 4) * 0.5 + 0.5;
    return getBiomeAt(elev, moisture, temp);
  }

  generate(cx: number, cz: number): ChunkData {
    const group = new THREE.Group();
    group.name = `chunk_${cx}_${cz}`;
    const originX = cx * CHUNK_SIZE;
    const originZ = cz * CHUNK_SIZE;
    group.position.set(originX, 0, originZ);

    const colliders: THREE.Box3[] = [];
    const spawnPoints: ChunkData['spawnPoints'] = [];
    const propSpawns: ChunkPropSpawn[] = [];
    const landmarks: LandmarkSpawn[] = [];
    const centerBiome = this.getBiomeAtWorld(originX + CHUNK_SIZE / 2, originZ + CHUNK_SIZE / 2);
    const biomeDef = BIOME_DEFINITIONS[centerBiome];
    const segments = this.perf.terrainSegments;
    const half = CHUNK_SIZE / 2;

    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segments, segments);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors: number[] = [];
    const c1 = new THREE.Color(biomeDef.groundColor);
    const c2 = new THREE.Color(biomeDef.groundAccent);
    const pathColor = new THREE.Color(0x5a5048);

    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = originX + half + lx;
      const wz = originZ + half + lz;
      const h = this.getHeightAt(wx, wz);
      pos.setY(i, h);
      const path = Math.abs(Math.sin(wx * 0.05) * Math.cos(wz * 0.05)) > 0.92;
      const blend = (Math.sin(wx * 0.12) * Math.cos(wz * 0.11) + 1) * 0.5;
      const col = path ? c1.clone().lerp(pathColor, 0.35) : c1.clone().lerp(c2, blend);
      if (h > 14) col.lerp(new THREE.Color(0xd8e4ec), 0.35);
      colors.push(col.r, col.g, col.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrain = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.04,
        flatShading: true,
      }),
    );
    terrain.receiveShadow = true;
    terrain.position.set(half, 0, half);
    group.add(terrain);

    const rng = this.seededRng(cx, cz);
    const treeCount = Math.floor(biomeDef.treeDensity * 32 * this.perf.treeDensityMult);
    for (let t = 0; t < treeCount; t++) {
      const lx = rng() * CHUNK_SIZE;
      const lz = rng() * CHUNK_SIZE;
      const wx = originX + lx;
      const wz = originZ + lz;
      const h = this.getHeightAt(wx, wz);
      const tree = createLowPolyTree(Math.floor(rng() * 3));
      tree.position.set(lx, h, lz);
      group.add(tree);
      if (rng() < 0.55) {
        colliders.push(new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(wx, h + 2, wz),
          new THREE.Vector3(1.2, 4, 1.2),
        ));
      }
    }

    const rockCount = Math.floor(biomeDef.rockDensity * 22);
    for (let r = 0; r < rockCount; r++) {
      const lx = rng() * CHUNK_SIZE;
      const lz = rng() * CHUNK_SIZE;
      const wx = originX + lx;
      const wz = originZ + lz;
      const h = this.getHeightAt(wx, wz);
      const rock = createLowPolyRock(0.5 + rng() * 1.4);
      rock.position.set(lx, h, lz);
      rock.rotation.y = rng() * Math.PI * 2;
      group.add(rock);
    }

    const clusterCount = 2 + Math.floor(rng() * 3);
    for (let c = 0; c < clusterCount; c++) {
      const lx = rng() * CHUNK_SIZE;
      const lz = rng() * CHUNK_SIZE;
      const wx = originX + lx;
      const wz = originZ + lz;
      const cluster = createBoulderCluster();
      cluster.position.set(lx, this.getHeightAt(wx, wz), lz);
      group.add(cluster);
    }

    const propCount = Math.min(this.perf.maxPropsPerChunk, 8 + Math.floor(rng() * this.perf.maxPropsPerChunk));
    for (let p = 0; p < propCount; p++) {
      const propType = this.pickProp(rng, centerBiome);
      const lx = rng() * CHUNK_SIZE;
      const lz = rng() * CHUNK_SIZE;
      const wx = originX + lx;
      const wz = originZ + lz;
      const h = this.getHeightAt(wx, wz);
      const { group: prop, collider } = createWorldProp(propType, biomeDef.groundAccent);
      prop.position.set(lx, h, lz);
      prop.rotation.y = rng() * Math.PI * 2;
      group.add(prop);
      if (collider?.solid) {
        const box = collider.box.clone();
        box.translate(new THREE.Vector3(wx, h, wz));
        colliders.push(box);
      }
    }

    if (rng() < 0.12) {
      const lx = half + (rng() - 0.5) * 20;
      const lz = half + (rng() - 0.5) * 20;
      const wx = originX + lx;
      const wz = originZ + lz;
      const ruin = createLargeRuin();
      ruin.position.set(lx, this.getHeightAt(wx, wz), lz);
      group.add(ruin);
      landmarks.push({ type: 'ruin_large', wx, wz, id: `ruin_${cx}_${cz}` });
      spawnPoints.push({ x: wx, z: wz, type: 'ruin' });
    } else if (rng() < 0.1) {
      const lx = rng() * CHUNK_SIZE;
      const lz = rng() * CHUNK_SIZE;
      const wx = originX + lx;
      const wz = originZ + lz;
      const ruin = createStructureRuin();
      ruin.position.set(lx, this.getHeightAt(wx, wz), lz);
      group.add(ruin);
      spawnPoints.push({ x: wx, z: wz, type: 'ruin' });
    }

    if (rng() < 0.06) {
      const lx = rng() * CHUNK_SIZE;
      const lz = rng() * CHUNK_SIZE;
      const wx = originX + lx;
      const wz = originZ + lz;
      const h = this.getHeightAt(wx, wz);
      const cave = createCaveEntrance();
      cave.position.set(lx, h, lz);
      cave.rotation.y = rng() * Math.PI * 2;
      group.add(cave);
      landmarks.push({ type: 'cave', wx, wz, id: `cave_${cx}_${cz}_${Math.floor(rng() * 999)}` });
      colliders.push(new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(wx, h + 1.5, wz),
        new THREE.Vector3(5, 4, 5),
      ));
    }

    if (rng() < 0.05 || centerBiome === 'mountain') {
      const lx = rng() * CHUNK_SIZE;
      const lz = rng() * CHUNK_SIZE;
      const wx = originX + lx;
      const wz = originZ + lz;
      const h = this.getHeightAt(wx, wz);
      const mountain = createMountainPeak(0.7 + rng() * 0.5);
      mountain.position.set(lx, h, lz);
      group.add(mountain);
      landmarks.push({ type: 'mountain', wx, wz, id: `mt_${cx}_${cz}` });
    }

    if (centerBiome === 'magical' && rng() < 0.15) {
      const lx = rng() * CHUNK_SIZE;
      const lz = rng() * CHUNK_SIZE;
      const crystal = createLowPolyCrystal();
      crystal.position.set(lx, this.getHeightAt(originX + lx, originZ + lz), lz);
      group.add(crystal);
    }

    if (rng() < 0.07) {
      propSpawns.push({ type: 'chest', wx: originX + rng() * CHUNK_SIZE, wz: originZ + rng() * CHUNK_SIZE });
    }
    if (rng() < 0.025) {
      propSpawns.push({ type: 'shrine', wx: originX + rng() * CHUNK_SIZE, wz: originZ + rng() * CHUNK_SIZE });
    }

    for (let e = 0; e < 3 + Math.floor(rng() * 3); e++) {
      spawnPoints.push({
        x: originX + rng() * CHUNK_SIZE,
        z: originZ + rng() * CHUNK_SIZE,
        type: 'enemy_pack',
      });
    }

    return { cx, cz, biome: centerBiome, mesh: group, colliders, spawnPoints, propSpawns, landmarks, secretChance: rng() };
  }

  private pickProp(rng: () => number, biome: BiomeId): PropType {
    const pool = PROP_TABLE.filter((p) => !p.biome || p.biome.includes(biome));
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = rng() * total;
    for (const p of pool) {
      r -= p.weight;
      if (r <= 0) return p.type;
    }
    return 'bush';
  }

  private seededRng(cx: number, cz: number): () => number {
    let s = (cx * 374761393 + cz * 668265263) | 0;
    return () => {
      s = (s ^ (s << 13)) | 0;
      s = (s ^ (s >> 17)) | 0;
      s = (s ^ (s << 5)) | 0;
      return ((s >>> 0) % 10000) / 10000;
    };
  }
}

import * as THREE from 'three';
import { ItemGenerator } from '../loot/ItemGenerator';
import { createLowPolyCrystal, createLowPolyRock } from '../render/LowPolyMeshes';
import { createStylizedMaterial } from '../render/shaders/StylizedMaterial';
import { createWorldProp } from '../render/WorldProps';
import type { EventBus } from '../utils/EventBus';
import { distance2D } from '../utils/math';
import type { WorldInteractablesManager } from '../world/WorldInteractables';
import type { MapPOI } from '../world/WorldManager';

export interface DungeonUpdateResult {
  hint: string;
  pois: MapPOI[];
  spawnRequests: { type: string; x: number; z: number; levelBoost: number }[];
}

interface DungeonTheme {
  id: string;
  name: string;
  floor: number;
  wall: number;
  accent: number;
  emissive: number;
  enemies: string[];
  boss: string;
  radius: number;
  offset: { x: number; z: number };
}

interface DungeonTrap {
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  cooldown: number;
}

interface DungeonPuzzle {
  position: THREE.Vector3;
  mesh: THREE.Group;
  solved: boolean;
}

interface DungeonSite {
  id: string;
  theme: DungeonTheme;
  center: THREE.Vector3;
  rooms: THREE.Vector3[];
  traps: DungeonTrap[];
  puzzle: DungeonPuzzle;
  secretChestSpawned: boolean;
  entered: boolean;
  spawnCooldown: number;
  spawnedCount: number;
  bossSpawned: boolean;
  group: THREE.Group;
}

export interface DungeonSave {
  sites: {
    id: string;
    entered: boolean;
    spawnCooldown: number;
    spawnedCount: number;
    bossSpawned: boolean;
    secretChestSpawned: boolean;
    puzzleSolved: boolean;
    trapCooldowns: number[];
  }[];
}

const THEMES: DungeonTheme[] = [
  {
    id: 'mossvault',
    name: 'Mossvault Dungeon',
    floor: 0x3e5844,
    wall: 0x263a2e,
    accent: 0x6aa85d,
    emissive: 0x6dff83,
    enemies: ['goblin', 'spider', 'skeleton'],
    boss: 'dungeon_golem',
    radius: 28,
    offset: { x: 42, z: 32 },
  },
  {
    id: 'cinderkeep',
    name: 'Cinderkeep Lava Halls',
    floor: 0x3b2520,
    wall: 0x271414,
    accent: 0xe15b24,
    emissive: 0xff4d20,
    enemies: ['magma_spawn', 'ash_demon', 'infernal_knight'],
    boss: 'ember_dragon',
    radius: 30,
    offset: { x: -54, z: 38 },
  },
  {
    id: 'frostcrypt',
    name: 'Frostcrypt Ice Cavern',
    floor: 0x90afbd,
    wall: 0x527287,
    accent: 0xc9f0ff,
    emissive: 0x80d8ff,
    enemies: ['skeleton', 'ice_wraith', 'frost_dragon'],
    boss: 'frost_titan',
    radius: 30,
    offset: { x: 58, z: -46 },
  },
  {
    id: 'ruined-crown',
    name: 'Ruined Crown Castle',
    floor: 0x5c5d67,
    wall: 0x3b3d48,
    accent: 0xc0a45d,
    emissive: 0xe8c869,
    enemies: ['skeleton', 'mage', 'dungeon_golem'],
    boss: 'dragon_lord',
    radius: 34,
    offset: { x: -64, z: -48 },
  },
];

export class DungeonSystem {
  private sites: DungeonSite[] = [];
  private rng: () => number;

  constructor(
    private scene: THREE.Scene,
    private interactables: WorldInteractablesManager,
    private bus: EventBus,
    seed: number,
  ) {
    this.rng = seededRng(seed + 424242);
  }

  spawnStarterDungeons(originX: number, originZ: number, getHeight: (x: number, z: number) => number): void {
    if (this.sites.length > 0) return;
    THEMES.forEach((theme, index) => {
      const centerX = originX + theme.offset.x;
      const centerZ = originZ + theme.offset.z;
      this.sites.push(this.createSite(theme, centerX, centerZ, getHeight, index));
    });
  }

  loadFromSave(data?: DungeonSave, getHeight?: (x: number, z: number) => number): void {
    if (!data) return;
    const savedSites = new Map(data.sites?.map((site) => [site.id, site]) ?? []);
    for (const site of this.sites) {
      const saved = savedSites.get(site.id);
      if (!saved) continue;
      site.entered = Boolean(saved.entered);
      site.spawnCooldown = Math.max(0, saved.spawnCooldown ?? site.spawnCooldown);
      site.spawnedCount = Math.max(0, saved.spawnedCount ?? site.spawnedCount);
      site.bossSpawned = Boolean(saved.bossSpawned);
      site.secretChestSpawned = Boolean(saved.secretChestSpawned);
      if (saved.puzzleSolved) {
        this.markPuzzleSolved(site);
        if (site.secretChestSpawned && getHeight) this.ensureSecretChest(site, getHeight);
      }
      saved.trapCooldowns?.forEach((cooldown, index) => {
        const trap = site.traps[index];
        if (trap) trap.cooldown = Math.max(0, cooldown);
      });
    }
  }

  toSave(): DungeonSave {
    return {
      sites: this.sites.map((site) => ({
        id: site.id,
        entered: site.entered,
        spawnCooldown: site.spawnCooldown,
        spawnedCount: site.spawnedCount,
        bossSpawned: site.bossSpawned,
        secretChestSpawned: site.secretChestSpawned,
        puzzleSolved: site.puzzle.solved,
        trapCooldowns: site.traps.map((trap) => trap.cooldown),
      })),
    };
  }

  update(
    dt: number,
    playerPos: THREE.Vector3,
    getHeight: (x: number, z: number) => number,
    useAction: boolean,
    playerLevel: number,
  ): DungeonUpdateResult {
    const spawnRequests: DungeonUpdateResult['spawnRequests'] = [];
    const pois = this.getMapPOIs();
    let hint = '';

    for (const site of this.sites) {
      const dist = distance2D(playerPos.x, playerPos.z, site.center.x, site.center.z);
      const inside = dist < site.theme.radius;
      site.spawnCooldown -= dt;
      for (const trap of site.traps) {
        trap.cooldown -= dt;
        trap.mesh.rotation.y += dt * 0.8;
        const nearTrap = distance2D(playerPos.x, playerPos.z, trap.position.x, trap.position.z) < 1.4;
        if (nearTrap && trap.cooldown <= 0) {
          trap.cooldown = 2.4;
          this.bus.emit('dungeon_trap', site.theme.name);
        }
      }

      if (!inside) continue;
      if (!site.entered) {
        site.entered = true;
        this.bus.emit('dungeon_entered', site.theme.name);
      }

      hint = `Dungeon: ${site.theme.name}`;

      const puzzleDist = distance2D(playerPos.x, playerPos.z, site.puzzle.position.x, site.puzzle.position.z);
      if (!site.puzzle.solved && puzzleDist < 3.2) {
        hint = 'Press E/F to align the rune puzzle';
        if (useAction) {
          this.solvePuzzle(site, getHeight);
          hint = 'Secret passage opened';
        }
      }

      if (site.spawnCooldown <= 0 && site.spawnedCount < 8) {
        site.spawnCooldown = 4 + this.rng() * 4;
        const room = site.rooms[Math.floor(this.rng() * site.rooms.length)];
        const type = site.theme.enemies[Math.floor(this.rng() * site.theme.enemies.length)];
        spawnRequests.push({
          type,
          x: room.x + (this.rng() - 0.5) * 6,
          z: room.z + (this.rng() - 0.5) * 6,
          levelBoost: Math.max(1, Math.floor(site.spawnedCount / 2)),
        });
        site.spawnedCount++;
      }

      if (!site.bossSpawned && site.spawnedCount >= 5) {
        site.bossSpawned = true;
        spawnRequests.push({
          type: site.theme.boss,
          x: site.center.x,
          z: site.center.z,
          levelBoost: Math.max(2, Math.floor(playerLevel * 0.35)),
        });
        this.bus.emit('boss_arena_opened', site.theme.name);
      }
    }

    return { hint, pois, spawnRequests };
  }

  getMapPOIs(): MapPOI[] {
    const pois: MapPOI[] = [];
    for (const site of this.sites) {
      pois.push({ type: site.bossSpawned ? 'boss' : 'dungeon', x: site.center.x, z: site.center.z, meta: site.theme.name });
      if (!site.puzzle.solved) pois.push({ type: 'puzzle', x: site.puzzle.position.x, z: site.puzzle.position.z, meta: 'Rune Puzzle' });
      for (const trap of site.traps) pois.push({ type: 'trap', x: trap.position.x, z: trap.position.z, meta: 'Trap' });
    }
    return pois;
  }

  dispose(): void {
    for (const site of this.sites) {
      this.scene.remove(site.group);
      site.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
    }
    this.sites = [];
  }

  private createSite(
    theme: DungeonTheme,
    centerX: number,
    centerZ: number,
    getHeight: (x: number, z: number) => number,
    index: number,
  ): DungeonSite {
    const group = new THREE.Group();
    group.name = `dungeon_${theme.id}`;
    this.scene.add(group);

    const rooms = [
      new THREE.Vector3(centerX - 12, getHeight(centerX - 12, centerZ), centerZ - 8),
      new THREE.Vector3(centerX, getHeight(centerX, centerZ), centerZ),
      new THREE.Vector3(centerX + 12, getHeight(centerX + 12, centerZ), centerZ + 8),
      new THREE.Vector3(centerX + (index % 2 === 0 ? 0 : -14), getHeight(centerX, centerZ + 16), centerZ + 16),
    ];

    rooms.forEach((room, i) => this.createRoom(group, theme, room.x, room.z, getHeight, i));
    for (let i = 0; i < rooms.length - 1; i++) {
      this.createCorridor(group, theme, rooms[i], rooms[i + 1], getHeight);
    }

    const entry = createWorldProp('banner', theme.accent).group;
    entry.position.set(centerX - 18, getHeight(centerX - 18, centerZ - 14), centerZ - 14);
    group.add(entry);

    const traps: DungeonTrap[] = rooms.slice(1).map((room, i) => {
      const trap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 0.12, 6),
        createStylizedMaterial(theme.accent, { emissive: theme.emissive, emissiveIntensity: 0.35 }),
      );
      const x = room.x + (i % 2 === 0 ? -3 : 3);
      const z = room.z + (i % 2 === 0 ? 2 : -2);
      trap.position.set(x, getHeight(x, z) + 0.08, z);
      trap.castShadow = true;
      group.add(trap);
      return { position: trap.position.clone(), mesh: trap, cooldown: 0 };
    });

    const puzzlePos = rooms[rooms.length - 1].clone();
    puzzlePos.x += 4;
    puzzlePos.z -= 4;
    const puzzle = this.createPuzzle(group, theme, puzzlePos.x, puzzlePos.z, getHeight);
    this.interactables.spawnChest(rooms[1].x - 4, rooms[1].z + 4, getHeight(rooms[1].x - 4, rooms[1].z + 4));

    return {
      id: theme.id,
      theme,
      center: new THREE.Vector3(centerX, getHeight(centerX, centerZ), centerZ),
      rooms,
      traps,
      puzzle,
      secretChestSpawned: false,
      entered: false,
      spawnCooldown: 1.5,
      spawnedCount: 0,
      bossSpawned: false,
      group,
    };
  }

  private createRoom(
    group: THREE.Group,
    theme: DungeonTheme,
    x: number,
    z: number,
    getHeight: (x: number, z: number) => number,
    index: number,
  ): void {
    const y = getHeight(x, z);
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.18, 11),
      createStylizedMaterial(theme.floor),
    );
    floor.position.set(x, y + 0.02, z);
    floor.receiveShadow = true;
    group.add(floor);

    const wallMat = createStylizedMaterial(theme.wall);
    const wallData = [
      { sx: 11, sz: 0.7, px: x, pz: z - 5.5 },
      { sx: 11, sz: 0.7, px: x, pz: z + 5.5 },
      { sx: 0.7, sz: 11, px: x - 5.5, pz: z },
      { sx: 0.7, sz: 11, px: x + 5.5, pz: z },
    ];
    for (const wall of wallData) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.sx, 2.4, wall.sz), wallMat);
      mesh.position.set(wall.px, getHeight(wall.px, wall.pz) + 1.2, wall.pz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    const pillarCount = index === 0 ? 2 : 4;
    for (let i = 0; i < pillarCount; i++) {
      const px = x + (i % 2 === 0 ? -3.3 : 3.3);
      const pz = z + (i < 2 ? -3.3 : 3.3);
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 2.7, 0.8),
        createStylizedMaterial(theme.wall, { metalness: 0.05 }),
      );
      pillar.position.set(px, getHeight(px, pz) + 1.35, pz);
      group.add(pillar);
    }

    if (index === 2) {
      const crystal = createLowPolyCrystal(theme.accent);
      crystal.position.set(x - 2, y + 0.15, z + 2);
      group.add(crystal);
    }
    if (theme.id.includes('cinder')) {
      const lava = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.08, 1.8),
        createStylizedMaterial(0xff4a18, { emissive: 0xff2e00, emissiveIntensity: 0.8 }),
      );
      lava.position.set(x + 1.2, y + 0.13, z);
      group.add(lava);
    }
    if (theme.id.includes('ruined')) {
      const rock = createLowPolyRock(1.2);
      rock.position.set(x - 2.8, y + 0.5, z - 2.8);
      group.add(rock);
    }
  }

  private createCorridor(
    group: THREE.Group,
    theme: DungeonTheme,
    a: THREE.Vector3,
    b: THREE.Vector3,
    getHeight: (x: number, z: number) => number,
  ): void {
    const midX = (a.x + b.x) * 0.5;
    const midZ = (a.z + b.z) * 0.5;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const corridor = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.14, length),
      createStylizedMaterial(theme.floor),
    );
    corridor.position.set(midX, getHeight(midX, midZ) + 0.04, midZ);
    corridor.rotation.y = Math.atan2(dx, dz);
    corridor.receiveShadow = true;
    group.add(corridor);
  }

  private createPuzzle(
    group: THREE.Group,
    theme: DungeonTheme,
    x: number,
    z: number,
    getHeight: (x: number, z: number) => number,
  ): DungeonPuzzle {
    const mesh = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.35, 6), createStylizedMaterial(theme.wall));
    base.position.y = 0.18;
    mesh.add(base);
    const rune = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      createStylizedMaterial(theme.accent, { emissive: theme.emissive, emissiveIntensity: 0.65 }),
    );
    rune.position.y = 1.1;
    mesh.add(rune);
    mesh.position.set(x, getHeight(x, z), z);
    group.add(mesh);
    return { position: mesh.position.clone(), mesh, solved: false };
  }

  private solvePuzzle(site: DungeonSite, getHeight: (x: number, z: number) => number): void {
    this.markPuzzleSolved(site);
    if (!site.secretChestSpawned) {
      this.ensureSecretChest(site, getHeight);
      site.secretChestSpawned = true;
      this.bus.emit('secret_found', site.theme.name);
    }
  }

  private markPuzzleSolved(site: DungeonSite): void {
    site.puzzle.solved = true;
    site.puzzle.mesh.scale.setScalar(1.2);
    const rune = site.puzzle.mesh.children[1] as THREE.Mesh | undefined;
    if (rune?.material instanceof THREE.MeshStandardMaterial) {
      rune.material.color.setHex(0xffffff);
      rune.material.emissive.setHex(site.theme.emissive);
      rune.material.emissiveIntensity = 1.2;
    }
  }

  private ensureSecretChest(site: DungeonSite, getHeight: (x: number, z: number) => number): void {
    const room = site.rooms[site.rooms.length - 1];
    const x = room.x + 6.8;
    const z = room.z + 6.8;
    const id = `chest_${x}_${z}`;
    if (this.interactables.chests.some((chest) => chest.id === id)) return;
    const chest = this.interactables.spawnChest(x, z, getHeight(x, z));
    chest.loot = [
      ItemGenerator.generate(Math.max(2, Math.floor(site.spawnedCount + 2)), 'legendary'),
      ItemGenerator.generateAccessory(Math.max(2, Math.floor(site.spawnedCount + 2)), this.rng() > 0.8 ? 'mythical' : 'epic'),
    ];
  }
}

function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

import * as THREE from 'three';
import { createChest, createWorldProp } from '../render/WorldProps';
import { createHumanCharacter } from '../render/HumanCharacter';
import { createStylizedMaterial } from '../render/shaders/StylizedMaterial';
import { ItemGenerator } from '../loot/ItemGenerator';
import type { ItemInstance } from '../loot/ItemGenerator';

export interface ChestInstance {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  opened: boolean;
  loot: ItemInstance[];
}

export interface NpcInstance {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  name: string;
  dialogue: string[];
}

export interface WorldInteractablesSave {
  chests: {
    id: string;
    opened: boolean;
    loot: ItemInstance[];
  }[];
}

export class WorldInteractablesManager {
  chests: ChestInstance[] = [];
  npcs: NpcInstance[] = [];
  shrines: THREE.Group[] = [];

  constructor(private scene: THREE.Scene) {}

  spawnChest(wx: number, wz: number, groundY: number): ChestInstance {
    const { group } = createChest(false);
    group.position.set(wx, groundY, wz);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    const chest: ChestInstance = {
      id: `chest_${wx}_${wz}`,
      mesh: group,
      position: new THREE.Vector3(wx, groundY, wz),
      opened: false,
      loot: ItemGenerator.generateLootBurst(1 + Math.floor(Math.random() * 3), 1 + Math.floor(Math.random() * 2)),
    };
    this.chests.push(chest);
    return chest;
  }

  spawnNpc(wx: number, wz: number, groundY: number, name: string, dialogue: string[]): NpcInstance {
    const rig = createHumanCharacter(0x4a5a7a, 0xd4a84b, 0xc8a882, 'staff');
    rig.root.position.set(wx, groundY, wz);
    this.scene.add(rig.root);
    const npc: NpcInstance = {
      id: `npc_${name}`,
      mesh: rig.root,
      position: new THREE.Vector3(wx, groundY, wz),
      name,
      dialogue,
    };
    this.npcs.push(npc);
    return npc;
  }

  spawnShrine(wx: number, wz: number, groundY: number): THREE.Group {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, 0.4, 8),
      createStylizedMaterial(0x5a5a68),
    );
    base.position.y = 0.2;
    g.add(base);
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5, 0),
      createStylizedMaterial(0x88ccff, { emissive: 0x4488ff, emissiveIntensity: 0.6 }),
    );
    crystal.position.y = 1.2;
    g.add(crystal);
    g.position.set(wx, groundY, wz);
    this.scene.add(g);
    this.shrines.push(g);
    return g;
  }

  tryOpenChest(playerPos: THREE.Vector3, range = 2.5): ChestInstance | null {
    for (const chest of this.chests) {
      if (chest.opened) continue;
      if (chest.position.distanceTo(playerPos) < range) {
        chest.opened = true;
        this.applyChestVisual(chest);
        return chest;
      }
    }
    return null;
  }

  loadFromSave(data?: WorldInteractablesSave): void {
    if (!data) return;
    const savedChests = new Map(data.chests?.map((c) => [c.id, c]) ?? []);
    for (const chest of this.chests) {
      const saved = savedChests.get(chest.id);
      if (!saved) continue;
      chest.opened = Boolean(saved.opened);
      chest.loot = saved.loot ?? chest.loot;
      this.applyChestVisual(chest);
    }
  }

  toSave(): WorldInteractablesSave {
    return {
      chests: this.chests.map((c) => ({
        id: c.id,
        opened: c.opened,
        loot: c.loot,
      })),
    };
  }

  tryTalkNpc(playerPos: THREE.Vector3, range = 3): NpcInstance | null {
    for (const npc of this.npcs) {
      if (npc.position.distanceTo(playerPos) < range) return npc;
    }
    return null;
  }

  update(dt: number): void {
    const t = Date.now() * 0.001;
    for (const npc of this.npcs) {
      npc.mesh.rotation.y = Math.sin(t + npc.position.x) * 0.1;
    }
    for (const s of this.shrines) {
      const crystal = s.children[1] as THREE.Mesh;
      if (crystal) {
        crystal.rotation.y += dt;
        crystal.position.y = 1.2 + Math.sin(t * 2) * 0.08;
      }
    }
  }

  dispose(): void {
    for (const c of this.chests) this.scene.remove(c.mesh);
    for (const n of this.npcs) this.scene.remove(n.mesh);
    for (const s of this.shrines) this.scene.remove(s);
    this.chests = [];
    this.npcs = [];
    this.shrines = [];
  }

  private applyChestVisual(chest: ChestInstance): void {
    const lid = chest.mesh.userData.chestLid as THREE.Mesh | undefined;
    if (lid) lid.rotation.x = chest.opened ? -1.2 : 0;
  }
}

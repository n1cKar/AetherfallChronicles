import * as THREE from 'three';
import type { ClassId } from '../config/constants';
import { CLASS_DEFINITIONS } from '../character/ClassDefinitions';
import { createHumanCharacter, animateHumanoid, type HumanoidRig } from '../render/HumanCharacter';
import type { NetworkPlayerState } from './NetworkClient';

interface RemoteEntry {
  state: NetworkPlayerState;
  rig: HumanoidRig;
  animPhase: number;
}

export class RemotePlayerManager {
  private remotes = new Map<string, RemoteEntry>();

  constructor(private scene: THREE.Scene) {}

  syncFromWelcome(players: NetworkPlayerState[], localId: string): void {
    for (const p of players) {
      if (p.id !== localId) this.upsert(p);
    }
  }

  upsert(state: NetworkPlayerState): void {
    let entry = this.remotes.get(state.id);
    if (!entry) {
      const classId = (state.classId in CLASS_DEFINITIONS ? state.classId : 'warrior') as ClassId;
      const def = CLASS_DEFINITIONS[classId];
      const rig = createHumanCharacter(def.primaryColor, def.accentColor, 0xd4a574, def.defaultWeapon);
      this.scene.add(rig.root);
      entry = { state, rig, animPhase: 0 };
      this.remotes.set(state.id, entry);
    }
    entry.state = state;
  }

  remove(id: string): string | null {
    const entry = this.remotes.get(id);
    if (!entry) return null;
    this.scene.remove(entry.rig.root);
    this.remotes.delete(id);
    return entry.state.name;
  }

  update(dt: number, getHeight: (x: number, z: number) => number): NetworkPlayerState[] {
    const list: NetworkPlayerState[] = [];
    for (const entry of this.remotes.values()) {
      const s = entry.state;
      const y = getHeight(s.x, s.z);
      entry.rig.root.position.set(s.x, y, s.z);
      entry.rig.root.rotation.y = s.rotation;
      entry.animPhase += dt;
      const moving = s.animation === 'move' || s.animation === 'run';
      animateHumanoid(entry.rig, s.animation, entry.animPhase, moving ? 1 : 0);
      list.push({ ...s, y });
    }
    return list;
  }

  getAll(): NetworkPlayerState[] {
    return [...this.remotes.values()].map((e) => e.state);
  }

  dispose(): void {
    for (const entry of this.remotes.values()) {
      this.scene.remove(entry.rig.root);
    }
    this.remotes.clear();
  }
}

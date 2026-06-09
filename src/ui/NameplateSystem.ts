import * as THREE from 'three';
import type { NetworkPlayerState } from '../network/NetworkClient';

interface Plate {
  el: HTMLElement;
  target: THREE.Vector3;
  label: string;
  isLocal?: boolean;
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
      if (id !== '__local__' && !ids.has(id)) this.remove(id);
    }
    for (const p of players) {
      const pos = new THREE.Vector3(p.x, (p.y ?? 0) + 2.1, p.z);
      this.upsert(p.id, p.name, pos, false, p.level);
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
      plate = { el, target: position.clone(), label: text, isLocal };
      this.plates.set(id, plate);
    }
    plate.target.copy(position);
    plate.label = text;
    plate.el.textContent = text;
    plate.el.classList.toggle('local', isLocal);
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
      plate.el.textContent = plate.label;
    }
  }

  dispose(): void {
    for (const plate of this.plates.values()) plate.el.remove();
    this.plates.clear();
  }
}

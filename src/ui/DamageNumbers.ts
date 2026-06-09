import { RARITY_COLORS } from '../config/constants';
import type * as THREE from 'three';

interface Floater {
  el: HTMLDivElement;
  life: number;
  vy: number;
}

export class DamageNumberSystem {
  private container: HTMLElement;
  private floaters: Floater[] = [];
  enabled = true;

  constructor(containerId = 'damage-numbers') {
    this.container = document.getElementById(containerId) ?? document.body;
  }

  spawn(
    worldPos: THREE.Vector3,
    amount: number,
    crit = false,
    playerDamage = false,
  ): void {
    if (!this.enabled) return;
    const el = document.createElement('div');
    el.className = `damage-number ${crit ? 'crit' : ''} ${playerDamage ? 'player-dmg' : ''}`;
    el.textContent = Math.floor(amount).toString();
    el.style.cssText = `
      position: fixed;
      pointer-events: none;
      font-family: Cinzel, serif;
      font-weight: 700;
      font-size: ${crit ? '1.4rem' : '1rem'};
      color: ${playerDamage ? '#ff5555' : crit ? '#ffd700' : '#fff8e0'};
      text-shadow: 0 0 8px rgba(0,0,0,0.8), 0 2px 4px #000;
      z-index: 200;
      transform: translate(-50%, -50%);
      transition: opacity 0.3s;
    `;
    const screen = this.worldToScreen(worldPos);
    el.style.left = `${screen.x + (Math.random() - 0.5) * 30}px`;
    el.style.top = `${screen.y}px`;
    this.container.appendChild(el);
    this.floaters.push({ el, life: 0.9, vy: -40 - Math.random() * 20 });
  }

  spawnLootText(worldPos: THREE.Vector3, text: string, rarity: string): void {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
      position: fixed;
      pointer-events: none;
      font-family: Cinzel, serif;
      font-size: 0.85rem;
      color: ${RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] ?? '#fff'};
      text-shadow: 0 0 12px currentColor;
      z-index: 200;
    `;
    const screen = this.worldToScreen(worldPos);
    el.style.left = `${screen.x}px`;
    el.style.top = `${screen.y}px`;
    this.container.appendChild(el);
    this.floaters.push({ el, life: 1.2, vy: -30 });
  }

  private worldToScreen(_pos: THREE.Vector3): { x: number; y: number } {
    return {
      x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 80,
      y: window.innerHeight * 0.4 + (Math.random() - 0.5) * 40,
    };
  }

  setProjector(fn: (pos: THREE.Vector3) => { x: number; y: number }): void {
    this.worldToScreen = fn;
  }

  update(dt: number): void {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      const top = parseFloat(f.el.style.top) || 0;
      f.el.style.top = `${top + f.vy * dt}px`;
      f.el.style.opacity = String(Math.max(0, f.life / 0.9));
      if (f.life <= 0) {
        f.el.remove();
        this.floaters.splice(i, 1);
      }
    }
  }
}

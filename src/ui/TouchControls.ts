/**
 * Virtual joystick + action buttons for phones & tablets.
 * Developed by n1ckar
 */

import { clamp } from '../utils/math';
import { isTouchDevice } from '../utils/device';

export interface TouchButtonState {
  joystickActive: boolean;
  moveX: number;
  moveZ: number;
  attack: boolean;
  dodge: boolean;
  sprint: boolean;
  skill1: boolean;
  skill2: boolean;
  skill3: boolean;
  skill4: boolean;
  interact: boolean;
  action: boolean;
  cameraRotate: number;
  cameraZoom: number;
}

const JOY_RADIUS = 58;
const JOY_MAX = 52;

export class TouchControls {
  private enabled = false;
  private moveX = 0;
  private moveZ = 0;
  private held = new Set<string>();
  private pulse = new Set<string>();
  private cameraRotate = 0;
  private cameraZoom = 0;
  private joyTouchId: number | null = null;
  private joyOriginX = 0;
  private joyOriginY = 0;
  private joyActive = false;
  private camTouchId: number | null = null;
  private camLastX = 0;
  private pinchDist = 0;
  private joystickEl: HTMLElement | null = null;
  private knobEl: HTMLElement | null = null;

  constructor(private canvas: HTMLElement) {
    this.enabled = isTouchDevice();
    if (!this.enabled) return;

    this.joystickEl = document.getElementById('touch-joystick');
    this.knobEl = document.getElementById('touch-joystick-knob');
    document.body.classList.add('touch-active');

    this.bindButtons();
    this.bindJoystick();
    this.bindCamera(canvas);
    this.preventScroll();
  }

  private preventScroll(): void {
    document.addEventListener('touchmove', (e) => {
      if (this.joyActive || this.camTouchId !== null) e.preventDefault();
    }, { passive: false });
  }

  private bindButtons(): void {
    const map: [string, string][] = [
      ['touch-attack', 'attack'],
      ['touch-dodge', 'dodge'],
      ['touch-interact', 'interact'],
      ['touch-action', 'action'],
      ['touch-skill1', 'skill1'],
      ['touch-skill2', 'skill2'],
      ['touch-skill3', 'skill3'],
      ['touch-skill4', 'skill4'],
      ['touch-sprint', 'sprint'],
    ];
    for (const [id, key] of map) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.held.add(key);
        if (key === 'dodge') this.pulse.add('dodge');
        el.classList.add('pressed');
      }, { passive: false });
      const end = (e: Event) => {
        e.preventDefault();
        this.held.delete(key);
        el.classList.remove('pressed');
      };
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('touchcancel', end, { passive: false });
    }
  }

  private bindJoystick(): void {
    const zone = document.getElementById('touch-joystick-zone');
    if (!zone) return;

    const onStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (this.joyTouchId !== null) continue;
        if (t.clientX > window.innerWidth * 0.48) continue;
        if ((e.target as HTMLElement).closest('.touch-btn')) continue;
        this.joyTouchId = t.identifier;
        this.joyActive = true;
        this.joyOriginX = t.clientX;
        this.joyOriginY = t.clientY;
        this.positionJoystick(t.clientX, t.clientY);
        e.preventDefault();
      }
    };

    const onMove = (e: TouchEvent) => {
      if (this.joyTouchId === null) return;
      const t = Array.from(e.touches).find((x) => x.identifier === this.joyTouchId);
      if (!t) return;
      const dx = t.clientX - this.joyOriginX;
      const dy = t.clientY - this.joyOriginY;
      const dist = Math.hypot(dx, dy);
      const scale = dist > JOY_MAX ? JOY_MAX / dist : 1;
      this.moveX = clamp((dx * scale) / JOY_MAX, -1, 1);
      this.moveZ = clamp((dy * scale) / JOY_MAX, -1, 1);
      if (this.knobEl) {
        this.knobEl.style.transform = `translate(${this.moveX * JOY_MAX}px, ${this.moveZ * JOY_MAX}px)`;
      }
      e.preventDefault();
    };

    const onEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== this.joyTouchId) continue;
        this.resetJoystick();
      }
    };

    zone.addEventListener('touchstart', onStart, { passive: false });
    zone.addEventListener('touchmove', onMove, { passive: false });
    zone.addEventListener('touchend', onEnd, { passive: false });
    zone.addEventListener('touchcancel', onEnd, { passive: false });
  }

  private positionJoystick(x: number, y: number): void {
    if (!this.joystickEl) return;
    const size = JOY_RADIUS * 2;
    const left = clamp(x - JOY_RADIUS, 12, window.innerWidth * 0.45 - size);
    const bottom = clamp(window.innerHeight - y - JOY_RADIUS, 80, window.innerHeight - size - 12);
    this.joystickEl.style.left = `${left}px`;
    this.joystickEl.style.bottom = `${bottom}px`;
    this.joystickEl.classList.add('visible');
    if (this.knobEl) this.knobEl.style.transform = 'translate(0, 0)';
  }

  private resetJoystick(): void {
    this.joyTouchId = null;
    this.joyActive = false;
    this.moveX = 0;
    this.moveZ = 0;
    this.joystickEl?.classList.remove('visible');
    if (this.knobEl) this.knobEl.style.transform = 'translate(0, 0)';
  }

  private bindCamera(canvas: HTMLElement): void {
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        this.pinchDist = this.touchDistance(e.touches[0], e.touches[1]);
        return;
      }
      const t = e.changedTouches[0];
      if (!t || t.clientX < window.innerWidth * 0.52) return;
      if ((e.target as HTMLElement).closest('.touch-btn, #game-ui, .panel')) return;
      this.camTouchId = t.identifier;
      this.camLastX = t.clientX;
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const d = this.touchDistance(e.touches[0], e.touches[1]);
        if (this.pinchDist > 0) {
          this.cameraZoom += (this.pinchDist - d) * 0.018;
          this.pinchDist = d;
        }
        e.preventDefault();
        return;
      }
      const t = Array.from(e.touches).find((x) => x.identifier === this.camTouchId);
      if (!t) return;
      this.cameraRotate += (t.clientX - this.camLastX) * 0.006;
      this.camLastX = t.clientX;
    }, { passive: false });

    const endCam = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.camTouchId) this.camTouchId = null;
      }
      if (e.touches.length < 2) this.pinchDist = 0;
    };
    canvas.addEventListener('touchend', endCam);
    canvas.addEventListener('touchcancel', endCam);
  }

  private touchDistance(a: Touch, b: Touch): number {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  poll(): TouchButtonState | null {
    if (!this.enabled) return null;
    const rot = this.cameraRotate;
    const zoom = this.cameraZoom;
    this.cameraRotate = 0;
    this.cameraZoom = 0;

    const dodge = this.pulse.has('dodge');
    this.pulse.clear();

    return {
      joystickActive: this.joyActive,
      moveX: this.moveX,
      moveZ: this.moveZ,
      attack: this.held.has('attack'),
      dodge,
      sprint: this.held.has('sprint'),
      skill1: this.held.has('skill1'),
      skill2: this.held.has('skill2'),
      skill3: this.held.has('skill3'),
      skill4: this.held.has('skill4'),
      interact: this.held.has('interact'),
      action: this.held.has('action'),
      cameraRotate: rot,
      cameraZoom: zoom,
    };
  }

  /** One-shot pulse for tap buttons (interact / action). */
  pulseButton(key: string): void {
    this.pulse.add(key);
  }
}

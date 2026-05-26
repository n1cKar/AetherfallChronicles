import type { ClassId } from '../config/constants';

export interface InputState {
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
  pause: boolean;
  cameraRotate: number;
  cameraZoom: number;
}

export class InputManager {
  private keys = new Set<string>();
  private touchJoystick = { active: false, x: 0, y: 0 };
  private gamepadIndex: number | null = null;
  cameraRotate = 0;
  cameraZoom = 0;

  constructor(private canvas: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('wheel', (e) => {
      this.cameraZoom += e.deltaY * 0.01;
      e.preventDefault();
    }, { passive: false });

    let isDragging = false;
    let lastX = 0;
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) { isDragging = true; lastX = e.clientX; }
    });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        this.cameraRotate += (e.clientX - lastX) * 0.005;
        lastX = e.clientX;
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.setupTouch();
  }

  private setupTouch(): void {
    const zone = document.getElementById('touch-joystick');
    if (!zone) return;
    let startX = 0, startY = 0;
    zone.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      this.touchJoystick.active = true;
    });
    zone.addEventListener('touchmove', (e) => {
      if (!this.touchJoystick.active) return;
      const t = e.touches[0];
      this.touchJoystick.x = clamp((t.clientX - startX) / 60, -1, 1);
      this.touchJoystick.y = clamp((t.clientY - startY) / 60, -1, 1);
    });
    zone.addEventListener('touchend', () => {
      this.touchJoystick = { active: false, x: 0, y: 0 };
    });
  }

  poll(): InputState {
    const gp = this.pollGamepad();
    let moveX = 0, moveZ = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveZ += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;

    if (this.touchJoystick.active) {
      moveX = this.touchJoystick.x;
      moveZ = this.touchJoystick.y;
    }
    if (gp) {
      moveX = gp.axes[0] || moveX;
      moveZ = gp.axes[1] || moveZ;
    }

    const len = Math.hypot(moveX, moveZ);
    if (len > 1) { moveX /= len; moveZ /= len; }

    const rot = this.cameraRotate;
    this.cameraRotate = 0;
    const zoom = this.cameraZoom;
    this.cameraZoom = 0;

    return {
      moveX, moveZ,
      attack: this.keys.has('Mouse0') || this.keys.has('KeyJ') || gp?.buttons[7]?.pressed || false,
      dodge: this.keys.has('Space') || this.keys.has('KeyK') || gp?.buttons[1]?.pressed || false,
      sprint: this.keys.has('ShiftLeft') || gp?.buttons[10]?.pressed || false,
      skill1: this.keys.has('Digit1') || gp?.buttons[2]?.pressed || false,
      skill2: this.keys.has('Digit2') || gp?.buttons[3]?.pressed || false,
      skill3: this.keys.has('Digit3') || gp?.buttons[0]?.pressed || false,
      skill4: this.keys.has('Digit4') || gp?.buttons[4]?.pressed || false,
      interact: this.keys.has('KeyE') || gp?.buttons[5]?.pressed || false,
      pause: this.keys.has('Escape') || gp?.buttons[9]?.pressed || false,
      cameraRotate: rot,
      cameraZoom: zoom,
    };
  }

  private pollGamepad(): Gamepad | null {
    const pads = navigator.getGamepads();
    for (const p of pads) {
      if (p?.connected) return p;
    }
    return null;
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

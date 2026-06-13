import { TouchControls } from '../ui/TouchControls';
import { normalizeKeyBindings, type ControlAction, type KeyBindings } from './KeyBindings';

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
  action: boolean;
  craftPanel: boolean;
  upgradePanel: boolean;
  inventoryPanel: boolean;
  journalPanel: boolean;
  worldMapPanel: boolean;
  vault: boolean;
  pause: boolean;
  cameraRotate: number;
  cameraZoom: number;
}

export class InputManager {
  private keys = new Set<string>();
  private pressedThisFrame = new Set<string>();
  private keyBindings: KeyBindings;
  private touch: TouchControls;
  cameraRotate = 0;
  cameraZoom = 0;

  constructor(private canvas: HTMLElement, keyBindings?: KeyBindings) {
    this.keyBindings = normalizeKeyBindings(keyBindings);
    this.touch = new TouchControls(canvas);

    window.addEventListener('keydown', (e) => {
      if (this.isTextEntryTarget(e.target)) return;
      if (!e.repeat) this.pressedThisFrame.add(e.code);
      this.keys.add(e.code);
      if (this.shouldPreventDefault(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (this.isTextEntryTarget(e.target)) return;
      this.keys.delete(e.code);
    });

    canvas.addEventListener('wheel', (e) => {
      this.cameraZoom += e.deltaY * 0.01;
      e.preventDefault();
    }, { passive: false });

    let isDragging = false;
    let lastX = 0;
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) { isDragging = true; lastX = e.clientX; }
      if (e.button === 0) {
        this.keys.add('Mouse0');
        this.pressedThisFrame.add('Mouse0');
      }
    });
    window.addEventListener('mouseup', (e) => {
      isDragging = false;
      if (e.button === 0) this.keys.delete('Mouse0');
    });
    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        this.cameraRotate += (e.clientX - lastX) * 0.005;
        lastX = e.clientX;
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setKeyBindings(keyBindings: KeyBindings): void {
    this.keyBindings = normalizeKeyBindings(keyBindings);
    this.keys.clear();
    this.pressedThisFrame.clear();
  }

  poll(): InputState {
    const gp = this.pollGamepad();
    const touch = this.touch.poll();

    let moveX = 0;
    let moveZ = 0;
    if (this.isHeld('moveForward')) moveZ -= 1;
    if (this.isHeld('moveBackward')) moveZ += 1;
    if (this.isHeld('moveLeft')) moveX -= 1;
    if (this.isHeld('moveRight')) moveX += 1;

    if (touch?.joystickActive) {
      moveX = touch.moveX;
      moveZ = touch.moveZ;
    }

    if (gp) {
      if (Math.abs(gp.axes[0]) > 0.15) moveX = gp.axes[0];
      if (Math.abs(gp.axes[1]) > 0.15) moveZ = gp.axes[1];
    }

    const len = Math.hypot(moveX, moveZ);
    if (len > 1) { moveX /= len; moveZ /= len; }

    const rot = this.cameraRotate + (touch?.cameraRotate ?? 0);
    const zoom = this.cameraZoom + (touch?.cameraZoom ?? 0);
    this.cameraRotate = 0;
    this.cameraZoom = 0;

    const state = {
      moveX,
      moveZ,
      attack: this.isHeld('attack') || gp?.buttons[7]?.pressed || touch?.attack || false,
      dodge: this.isHeld('dodge') || gp?.buttons[1]?.pressed || touch?.dodge || false,
      sprint: this.isHeld('sprint') || gp?.buttons[10]?.pressed || touch?.sprint || false,
      skill1: this.isHeld('skill1') || gp?.buttons[2]?.pressed || touch?.skill1 || false,
      skill2: this.isHeld('skill2') || gp?.buttons[3]?.pressed || touch?.skill2 || false,
      skill3: this.isHeld('skill3') || gp?.buttons[0]?.pressed || touch?.skill3 || false,
      skill4: this.isHeld('skill4') || gp?.buttons[4]?.pressed || touch?.skill4 || false,
      interact: this.isHeld('interact') || gp?.buttons[5]?.pressed || touch?.interact || false,
      action: this.isHeld('action') || gp?.buttons[6]?.pressed || touch?.action || false,
      craftPanel: this.wasPressed('craftPanel'),
      upgradePanel: this.wasPressed('upgradePanel'),
      inventoryPanel: this.wasPressed('inventoryPanel'),
      journalPanel: this.wasPressed('journalPanel'),
      worldMapPanel: this.wasPressed('worldMapPanel'),
      vault: this.isHeld('vault') || gp?.buttons[8]?.pressed || false,
      pause: this.wasPressed('pause') || gp?.buttons[9]?.pressed || false,
      cameraRotate: rot,
      cameraZoom: zoom,
    };
    this.pressedThisFrame.clear();
    return state;
  }

  private isHeld(action: ControlAction): boolean {
    return this.keyBindings[action].some((code) => this.keys.has(code));
  }

  private wasPressed(action: ControlAction): boolean {
    return this.keyBindings[action].some((code) => this.pressedThisFrame.has(code));
  }

  private shouldPreventDefault(code: string): boolean {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) return true;
    return Object.values(this.keyBindings).some((codes) => codes.includes(code));
  }

  private isTextEntryTarget(target: EventTarget | null): boolean {
    const el = target instanceof HTMLElement ? target : null;
    if (!el) return false;
    return Boolean(el.closest('input, textarea, select, [contenteditable="true"]'));
  }

  private pollGamepad(): Gamepad | null {
    const pads = navigator.getGamepads();
    for (const p of pads) {
      if (p?.connected) return p;
    }
    return null;
  }
}

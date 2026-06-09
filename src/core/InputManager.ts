import { TouchControls } from '../ui/TouchControls';

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
  vault: boolean;
  pause: boolean;
  cameraRotate: number;
  cameraZoom: number;
}

export class InputManager {
  private keys = new Set<string>();
  private touch: TouchControls;
  cameraRotate = 0;
  cameraZoom = 0;

  constructor(private canvas: HTMLElement) {
    this.touch = new TouchControls(canvas);

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
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
      if (e.button === 0) this.keys.add('Mouse0');
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

  poll(): InputState {
    const gp = this.pollGamepad();
    const touch = this.touch.poll();

    let moveX = 0;
    let moveZ = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveZ += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;

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

    return {
      moveX,
      moveZ,
      attack: this.keys.has('Mouse0') || this.keys.has('KeyJ') || gp?.buttons[7]?.pressed || touch?.attack || false,
      dodge: this.keys.has('Space') || this.keys.has('KeyK') || gp?.buttons[1]?.pressed || touch?.dodge || false,
      sprint: this.keys.has('ShiftLeft') || gp?.buttons[10]?.pressed || touch?.sprint || false,
      skill1: this.keys.has('Digit1') || gp?.buttons[2]?.pressed || touch?.skill1 || false,
      skill2: this.keys.has('Digit2') || gp?.buttons[3]?.pressed || touch?.skill2 || false,
      skill3: this.keys.has('Digit3') || gp?.buttons[0]?.pressed || touch?.skill3 || false,
      skill4: this.keys.has('Digit4') || gp?.buttons[4]?.pressed || touch?.skill4 || false,
      interact: this.keys.has('KeyE') || gp?.buttons[5]?.pressed || touch?.interact || false,
      action: this.keys.has('KeyF') || gp?.buttons[6]?.pressed || touch?.action || false,
      craftPanel: this.keys.has('KeyC') || false,
      upgradePanel: this.keys.has('KeyU') || false,
      vault: this.keys.has('KeyV') || gp?.buttons[8]?.pressed || false,
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

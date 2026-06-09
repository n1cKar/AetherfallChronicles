/** HUD compass arrow pointing toward active quest objective. */

export class ObjectiveCompass {
  private el: HTMLElement;
  private label: HTMLElement;
  private dist: HTMLElement;

  constructor() {
    this.el = document.getElementById('objective-compass')!;
    this.label = this.el.querySelector('.compass-label')!;
    this.dist = this.el.querySelector('.compass-dist')!;
  }

  update(
    playerX: number,
    playerZ: number,
    camYaw: number,
    target: { x: number; z: number } | null,
    questTitle?: string,
  ): void {
    if (!target) {
      this.el.classList.remove('active');
      return;
    }
    const dx = target.x - playerX;
    const dz = target.z - playerZ;
    const dist = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz) - camYaw;
    const deg = (angle * 180) / Math.PI;

    this.el.classList.add('active');
    this.el.style.setProperty('--compass-rot', `${deg}deg`);
    this.label.textContent = questTitle ?? 'Objective';
    this.dist.textContent = dist > 80 ? `${Math.round(dist)}m` : dist > 20 ? `${Math.round(dist)}m` : 'Near';
  }
}

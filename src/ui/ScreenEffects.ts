/** Full-screen cinematic feedback (hurt flash, low HP, crit moments). */

export class ScreenEffects {
  private overlay: HTMLElement;
  private lowHpActive = false;

  constructor() {
    this.overlay = document.getElementById('screen-fx') ?? this.createOverlay();
  }

  private createOverlay(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'screen-fx';
    el.className = 'screen-fx';
    document.body.appendChild(el);
    return el;
  }

  flashDamage(intensity = 1): void {
    this.overlay.classList.remove('flash-damage', 'flash-crit', 'flash-heal');
    void this.overlay.offsetWidth;
    this.overlay.classList.add(intensity > 1.2 ? 'flash-crit' : 'flash-damage');
    setTimeout(() => this.overlay.classList.remove('flash-damage', 'flash-crit'), 180);
  }

  flashHeal(): void {
    this.overlay.classList.remove('flash-heal');
    void this.overlay.offsetWidth;
    this.overlay.classList.add('flash-heal');
    setTimeout(() => this.overlay.classList.remove('flash-heal'), 350);
  }

  setLowHealth(active: boolean): void {
    if (this.lowHpActive === active) return;
    this.lowHpActive = active;
    this.overlay.classList.toggle('low-hp', active);
  }

  showKillStreak(count: number): void {
    if (count < 3) return;
    const el = document.createElement('div');
    el.className = 'kill-streak';
    el.textContent = count >= 10 ? 'RAMPAGE!' : count >= 6 ? 'UNSTOPPABLE!' : 'MULTI-KILL!';
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('fade'), 50);
    setTimeout(() => el.remove(), 1800);
  }

  showCritBanner(): void {
    const el = document.createElement('div');
    el.className = 'crit-banner';
    el.textContent = 'CRITICAL!';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);
  }
}

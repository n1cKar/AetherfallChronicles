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

  flashLightning(): void {
    this.overlay.classList.add('flash-lightning');
    setTimeout(() => this.overlay.classList.remove('flash-lightning'), 120);
  }

  showCritBanner(): void {
    const el = document.createElement('div');
    el.className = 'crit-banner';
    el.textContent = 'CRITICAL!';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 600);
  }

  showLevelUpCinematic(level: number): void {
    const el = document.createElement('div');
    el.className = 'level-up-cinematic';
    el.innerHTML = `<div class="luc-ring"></div><span class="luc-title">LEVEL ${level}</span><span class="luc-sub">Power Surges Through You</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('active'));
    setTimeout(() => {
      el.classList.add('fade');
      setTimeout(() => el.remove(), 800);
    }, 2800);
  }

  showAchievement(icon: string, title: string, description: string): void {
    const el = document.createElement('div');
    el.className = 'achievement-toast';
    el.innerHTML = `<span class="ach-toast-icon">${icon}</span><div><strong>Achievement Unlocked</strong><br>${title}<small>${description}</small></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.add('hide');
      setTimeout(() => el.remove(), 500);
    }, 4200);
  }

  showQuestFlash(): void {
    this.overlay.classList.add('quest-flash');
    setTimeout(() => this.overlay.classList.remove('quest-flash'), 400);
  }

  pulseBossVignette(): void {
    this.overlay.classList.add('boss-vignette');
    setTimeout(() => this.overlay.classList.remove('boss-vignette'), 3500);
  }
}

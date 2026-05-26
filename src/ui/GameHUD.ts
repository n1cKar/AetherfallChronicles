import { CLASS_DEFINITIONS } from '../character/ClassDefinitions';
import type { Player } from '../character/Player';
import { RARITY_COLORS } from '../config/constants';
import type { ItemInstance } from '../loot/ItemGenerator';
import type { BiomeDefinition } from '../world/BiomeConfig';
import type { MinimapSnapshot } from '../world/WorldManager';

const POI_COLORS: Record<string, string> = {
  player: '#f0c96e',
  enemy: '#ff5555',
  chest: '#d4a84b',
  npc: '#88ccff',
  shrine: '#aa88ff',
  cave: '#6644aa',
  mountain: '#b8c8d8',
  ruin: '#9a9aa8',
  quest: '#00ffcc',
};

export class GameHUD {
  private healthBar: HTMLElement;
  private manaBar: HTMLElement;
  private xpBar: HTMLElement;
  private levelEl: HTMLElement;
  private goldEl: HTMLElement;
  private biomeEl: HTMLElement;
  private comboEl: HTMLElement;
  private skillBar: HTMLElement;
  private lootFeed: HTMLElement;
  private questTracker: HTMLElement;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private inventoryPanel: HTMLElement;
  private journalPanel: HTMLElement;
  private worldMapPanel: HTMLElement;
  private worldMapCanvas: HTMLCanvasElement;
  private worldMapCtx: CanvasRenderingContext2D;
  private inventoryOpen = false;
  private journalOpen = false;
  private worldMapOpen = false;
  private minimapSize = 168;
  private worldMapCenter: { x: number; z: number } | null = null;
  private worldMapZoom = 1;
  private draggingMap = false;
  private lastMouse = { x: 0, y: 0 };

  constructor() {
    this.healthBar = document.getElementById('health-fill')!;
    this.manaBar = document.getElementById('mana-fill')!;
    this.xpBar = document.getElementById('xp-fill')!;
    this.levelEl = document.getElementById('player-level')!;
    this.goldEl = document.getElementById('gold-amount')!;
    this.biomeEl = document.getElementById('biome-name')!;
    this.comboEl = document.getElementById('combo-display')!;
    this.skillBar = document.getElementById('skill-bar')!;
    this.lootFeed = document.getElementById('loot-feed')!;
    this.questTracker = document.getElementById('quest-tracker')!;
    this.minimapCanvas = document.getElementById('minimap') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    this.inventoryPanel = document.getElementById('inventory-panel')!;
    this.journalPanel = document.getElementById('journal-panel')!;
    this.worldMapPanel = document.getElementById('worldmap-panel')!;
    this.worldMapCanvas = document.getElementById('worldmap-canvas') as HTMLCanvasElement;
    this.worldMapCtx = this.worldMapCanvas.getContext('2d')!;

    const dpr = window.devicePixelRatio || 1;
    this.minimapSize = 168;
    this.minimapCanvas.width = this.minimapSize * dpr;
    this.minimapCanvas.height = this.minimapSize * dpr;
    this.minimapCanvas.style.width = `${this.minimapSize}px`;
    this.minimapCanvas.style.height = `${this.minimapSize}px`;
    this.minimapCtx.scale(dpr, dpr);

    document.getElementById('btn-inventory')?.addEventListener('click', () => this.toggleInventory());
    document.getElementById('inv-close')?.addEventListener('click', () => this.toggleInventory(false));
    document.getElementById('btn-journal')?.addEventListener('click', () => this.toggleJournal());
    document.getElementById('journal-close')?.addEventListener('click', () => this.toggleJournal(false));
    document.getElementById('btn-worldmap')?.addEventListener('click', () => this.toggleWorldMap());
    document.getElementById('map-close')?.addEventListener('click', () => this.toggleWorldMap(false));
    document.getElementById('map-zoom-in')?.addEventListener('click', () => this.worldMapZoom = Math.min(3, this.worldMapZoom * 1.2));
    document.getElementById('map-zoom-out')?.addEventListener('click', () => this.worldMapZoom = Math.max(0.6, this.worldMapZoom / 1.2));
    document.getElementById('map-center')?.addEventListener('click', () => this.worldMapCenter = null);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyQ') this.toggleJournal();
      if (e.code === 'KeyM') this.toggleWorldMap();
    });
    this.setupWorldMapMouse();
  }

  initSkills(classId: string): void {
    const def = CLASS_DEFINITIONS[classId as keyof typeof CLASS_DEFINITIONS];
    if (!def) return;
    this.skillBar.innerHTML = def.skills.map((s) => `
      <div class="skill-slot" data-skill="${s.id}" title="${s.description}">
        <span class="skill-key">${s.key}</span>
        <span class="skill-name">${s.name}</span>
        <div class="skill-cd-overlay"></div>
      </div>
    `).join('');
  }

  update(
    player: Player,
    biome: BiomeDefinition,
    map: MinimapSnapshot,
    worldMap?: MinimapSnapshot,
  ): void {
    this.healthBar.style.width = `${(player.health / player.maxHealth) * 100}%`;
    this.manaBar.style.width = `${(player.mana / player.maxMana) * 100}%`;
    this.xpBar.style.width = `${(player.xp / player.xpToNext) * 100}%`;
    this.levelEl.textContent = String(player.level);
    this.goldEl.textContent = String(player.gold);
    this.biomeEl.textContent = biome.name;
    this.comboEl.textContent = player.combo > 0 ? `COMBO x${player.combo}` : '';
    this.comboEl.style.opacity = player.combo > 0 ? '1' : '0';

    const def = CLASS_DEFINITIONS[player.classId];
    def.skills.forEach((s) => {
      const slot = this.skillBar.querySelector(`[data-skill="${s.id}"]`);
      const cd = player.skillCooldowns.get(s.id) ?? 0;
      const overlay = slot?.querySelector('.skill-cd-overlay') as HTMLElement;
      if (overlay) {
        overlay.style.height = cd > 0 ? `${(cd / s.cooldown) * 100}%` : '0%';
        overlay.style.opacity = cd > 0 ? '0.7' : '0';
      }
    });

    this.drawMinimap(map);
    if (this.worldMapOpen && worldMap) this.drawWorldMap(worldMap);
    if (this.inventoryOpen) this.renderInventory(player.inventory);
  }

  isWorldMapOpen(): boolean {
    return this.worldMapOpen;
  }

  getWorldMapRequest(playerX: number, playerZ: number): { centerX: number; centerZ: number; range: number; step: number } | null {
    if (!this.worldMapOpen) return null;
    if (!this.worldMapCenter) this.worldMapCenter = { x: playerX, z: playerZ };
    const range = 220 / this.worldMapZoom;
    const step = this.worldMapZoom > 1.6 ? 8 : 10;
    return { centerX: this.worldMapCenter.x, centerZ: this.worldMapCenter.z, range, step };
  }

  setStoryTracker(summary: { chapter: string; quest: string; objective: string; progress: string }): void {
    this.questTracker.innerHTML = `
      <h4 class="quest-chapter">${summary.chapter}</h4>
      <p class="quest-title">${summary.quest}</p>
      <p class="quest-objective">${summary.objective}</p>
      <p class="quest-progress">${summary.progress}</p>
    `;
  }

  setJournalHtml(html: string): void {
    const el = document.getElementById('journal-content');
    if (el) el.innerHTML = html;
  }

  private drawMinimap(map: MinimapSnapshot): void {
    const ctx = this.minimapCtx;
    const w = this.minimapSize;
    const h = this.minimapSize;
    const scale = 1.15;
    const px = map.playerX;
    const pz = map.playerZ;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0c0e18';
    ctx.fillRect(0, 0, w, h);

    for (const tile of map.biomeTiles) {
      const tx = w / 2 + (tile.x - px) * scale;
      const tz = h / 2 + (tile.z - pz) * scale;
      ctx.fillStyle = tile.color;
      ctx.fillRect(tx - 3, tz - 3, 6, 6);
    }

    ctx.strokeStyle = 'rgba(212,168,75,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 28 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 52 * scale, 0, Math.PI * 2);
    ctx.stroke();

    const drawOrder = ['ruin', 'mountain', 'cave', 'shrine', 'chest', 'npc', 'enemy', 'quest', 'player'];
    for (const type of drawOrder) {
      for (const poi of map.pois) {
        if (poi.type !== type) continue;
        const ex = w / 2 + (poi.x - px) * scale;
        const ez = h / 2 + (poi.z - pz) * scale;
        if (ex < -8 || ex > w + 8 || ez < -8 || ez > h + 8) continue;

        ctx.fillStyle = POI_COLORS[type] ?? '#fff';
        if (type === 'player') {
          ctx.beginPath();
          ctx.arc(ex, ez, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (type === 'quest') {
          ctx.beginPath();
          ctx.moveTo(ex, ez - 6);
          ctx.lineTo(ex + 5, ez);
          ctx.lineTo(ex, ez + 6);
          ctx.lineTo(ex - 5, ez);
          ctx.closePath();
          ctx.fill();
        } else if (type === 'mountain') {
          ctx.beginPath();
          ctx.moveTo(ex, ez - 5);
          ctx.lineTo(ex + 4, ez + 4);
          ctx.lineTo(ex - 4, ez + 4);
          ctx.closePath();
          ctx.fill();
        } else if (type === 'cave') {
          ctx.fillRect(ex - 3, ez - 3, 6, 6);
        } else {
          const r = type === 'enemy' ? 3 : 4;
          ctx.beginPath();
          ctx.arc(ex, ez, r, 0, Math.PI * 2);
          ctx.fill();
          if (type === 'chest' && poi.meta === 'open') {
            ctx.strokeStyle = POI_COLORS.chest;
            ctx.stroke();
          }
        }
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '9px Inter,sans-serif';
    ctx.fillText('N', w / 2 - 3, 10);
  }

  private drawWorldMap(map: MinimapSnapshot): void {
    const ctx = this.worldMapCtx;
    const w = this.worldMapCanvas.clientWidth;
    const h = this.worldMapCanvas.clientHeight;
    const px = map.playerX;
    const pz = map.playerZ;
    const scale = 0.35 * this.worldMapZoom;

    ctx.clearRect(0, 0, this.worldMapCanvas.width, this.worldMapCanvas.height);
    ctx.fillStyle = '#0b0e16';
    ctx.fillRect(0, 0, this.worldMapCanvas.width, this.worldMapCanvas.height);

    for (const tile of map.biomeTiles) {
      const tx = w / 2 + (tile.x - px) * scale;
      const tz = h / 2 + (tile.z - pz) * scale;
      ctx.fillStyle = tile.color;
      ctx.fillRect(tx - 4, tz - 4, 8, 8);
    }

    for (const poi of map.pois) {
      const ex = w / 2 + (poi.x - px) * scale;
      const ez = h / 2 + (poi.z - pz) * scale;
      if (ex < -10 || ex > w + 10 || ez < -10 || ez > h + 10) continue;
      ctx.fillStyle = POI_COLORS[poi.type] ?? '#ffffff';
      const r = poi.type === 'player' ? 5 : poi.type === 'enemy' ? 3 : 4;
      ctx.beginPath();
      ctx.arc(ex, ez, r, 0, Math.PI * 2);
      ctx.fill();
      if (poi.type === 'quest') {
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  private setupWorldMapMouse(): void {
    this.worldMapCanvas.addEventListener('mousedown', (e) => {
      this.draggingMap = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { this.draggingMap = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this.draggingMap || !this.worldMapCenter) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      const panScale = 1 / (0.35 * this.worldMapZoom);
      this.worldMapCenter.x -= dx * panScale;
      this.worldMapCenter.z -= dy * panScale;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });
    this.worldMapCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.worldMapZoom = Math.max(0.6, Math.min(3, this.worldMapZoom * (e.deltaY > 0 ? 0.9 : 1.1)));
    }, { passive: false });
  }

  toggleJournal(force?: boolean): void {
    this.journalOpen = force ?? !this.journalOpen;
    this.journalPanel?.classList.toggle('open', this.journalOpen);
  }

  toggleWorldMap(force?: boolean): void {
    this.worldMapOpen = force ?? !this.worldMapOpen;
    this.worldMapPanel.classList.toggle('open', this.worldMapOpen);
    if (this.worldMapOpen) {
      const w = Math.max(600, Math.floor(this.worldMapCanvas.clientWidth || 900));
      const h = Math.max(380, Math.floor(this.worldMapCanvas.clientHeight || 560));
      this.worldMapCanvas.width = w;
      this.worldMapCanvas.height = h;
    }
    if (!this.worldMapOpen) this.draggingMap = false;
  }

  addLootNotification(item: ItemInstance): void {
    const el = document.createElement('div');
    el.className = 'loot-notification';
    el.style.borderColor = RARITY_COLORS[item.rarity];
    el.style.color = RARITY_COLORS[item.rarity];
    el.innerHTML = `<span class="loot-rarity">${item.rarity.toUpperCase()}</span> ${item.name}`;
    this.lootFeed.prepend(el);
    setTimeout(() => el.classList.add('fade-out'), 3500);
    setTimeout(() => el.remove(), 4000);
    if (this.lootFeed.children.length > 6) this.lootFeed.lastChild?.remove();
  }

  toggleInventory(force?: boolean): void {
    this.inventoryOpen = force ?? !this.inventoryOpen;
    this.inventoryPanel.classList.toggle('open', this.inventoryOpen);
  }

  private renderInventory(items: ItemInstance[]): void {
    const grid = document.getElementById('inventory-grid')!;
    grid.innerHTML = items.map((item) => `
      <div class="inv-item" style="border-color: ${RARITY_COLORS[item.rarity]}">
        <span class="inv-rarity">${item.rarity[0].toUpperCase()}</span>
        <span class="inv-name">${item.name}</span>
        <span class="inv-dps">${item.dps} DPS</span>
      </div>
    `).join('') || '<p class="empty-inv">No items yet — defeat enemies!</p>';
  }

  showLevelUp(): void {
    const banner = document.createElement('div');
    banner.className = 'level-up-banner';
    banner.innerHTML = '<span>LEVEL UP!</span>';
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2500);
  }

  showBossIntro(name: string): void {
    const intro = document.getElementById('boss-intro')!;
    intro.querySelector('.boss-name')!.textContent = name;
    intro.classList.add('active');
    setTimeout(() => intro.classList.remove('active'), 4000);
  }

  showChapterIntro(title: string, intro: string): void {
    const el = document.getElementById('chapter-intro');
    if (!el) return;
    el.querySelector('.chapter-title')!.textContent = title;
    el.querySelector('.chapter-text')!.textContent = intro;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 5500);
  }

  setInteractHint(text: string): void {
    const el = document.getElementById('interact-hint');
    if (el) {
      el.textContent = text;
      el.style.opacity = text ? '1' : '0';
    }
  }

  showInteractMessage(msg: string): void {
    const el = document.getElementById('interact-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  }

  showDialogue(name: string, lines: string[]): void {
    const panel = document.getElementById('dialogue-panel');
    if (!panel) return;
    panel.querySelector('.dialogue-name')!.textContent = name;
    panel.querySelector('.dialogue-text')!.textContent = lines.join(' ');
    panel.classList.add('open');
    setTimeout(() => panel.classList.remove('open'), 5000);
  }

  showQuestComplete(title: string): void {
    const el = document.getElementById('quest-toast');
    if (!el) return;
    el.innerHTML = `<strong>Mission Complete</strong><br>${title}`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3500);
  }

  showCampaignComplete(): void {
    document.getElementById('victory-screen')?.classList.add('open');
  }

  showTutorial(): void {
    const t = document.getElementById('tutorial-overlay');
    if (!t) return;
    t.classList.add('open');
    document.getElementById('tutorial-dismiss')?.addEventListener('click', () => {
      t.classList.remove('open');
    }, { once: true });
  }

  private deathShown = false;
  showDeathScreen(): void {
    if (this.deathShown) return;
    this.deathShown = true;
    document.getElementById('death-screen')?.classList.add('open');
  }

  hideDeathScreen(): void {
    this.deathShown = false;
    document.getElementById('death-screen')?.classList.remove('open');
  }
}

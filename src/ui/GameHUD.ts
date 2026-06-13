import { CLASS_DEFINITIONS } from '../character/ClassDefinitions';
import type { Player, EquipSlot } from '../character/Player';
import { getRarityColor, normalizeRarity } from '../config/constants';
import type { ItemInstance } from '../loot/ItemGenerator';
import type { BiomeDefinition } from '../world/BiomeConfig';
import type { MinimapSnapshot } from '../world/WorldManager';
import type { LifeSkillsManager } from '../life/LifeSkillsManager';
import type { TimePeriod } from '../world/DayNightCycle';
import { RECIPES } from '../life/CraftingSystem';
import type { ChatMessage } from '../network/NetworkClient';
import { ATTRIBUTE_UPGRADES, PERK_TREE, type UpgradeSystem } from '../systems/UpgradeSystem';
import { ObjectiveCompass } from './ObjectiveCompass';
import { isMobileDevice } from '../utils/device';
import {
  CONTROL_BINDING_DEFS,
  formatKeyCode,
  normalizeKeyBindings,
  type ControlAction,
  type KeyBindings,
} from '../core/KeyBindings';

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
  fish: '#4a9acc',
  gather: '#5aba6a',
  wildlife: '#c49a6a',
  dungeon: '#d4a84b',
  trap: '#ff6644',
  puzzle: '#88ccff',
  boss: '#ff3366',
};

export interface ObjectiveGuide {
  direction: string;
  distance: string;
  action: string;
  autoStart: string;
  nearbyActivity: string;
}

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
  private lifePanelOpen = false;
  private lifePanel: HTMLElement;
  private materialsStrip: HTMLElement;
  private timeClock: HTMLElement;
  private weatherDisplay: HTMLElement;
  private activityBar: HTMLElement;
  private activityFill: HTMLElement;
  private activityLabel: HTMLElement;
  private buffStrip: HTMLElement;
  private upgradePanel: HTMLElement;
  private upgradePanelOpen = false;
  private onCraft?: (recipeId: string) => void;
  private onUpgrade?: (type: 'attr' | 'perk', id: string) => void;
  private onEquip?: (itemId: string) => void;
  private onUnequip?: (slot: EquipSlot) => void;
  private onSell?: (itemId: string) => void;
  private onUseItem?: (itemId: string) => void;
  private onRebindControl?: (action: ControlAction, code: string) => void;
  private onResetControls?: () => void;
  private onChatSend?: (message: string) => void;
  private chatOpen = false;
  private chatLog: HTMLElement;
  private chatPanel: HTMLElement;
  private chatInput: HTMLInputElement;
  private onlineStatus: HTMLElement;
  private heroName: HTMLElement;
  private playerListUl: HTMLElement;
  private controlsPanel: HTMLElement;
  private controlsList: HTMLElement;
  private controlsCapture: HTMLElement;
  private controlBindings: KeyBindings = normalizeKeyBindings();
  private capturingControl: ControlAction | null = null;
  private compass: ObjectiveCompass;
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
    this.lifePanel = document.getElementById('life-panel')!;
    this.materialsStrip = document.getElementById('materials-strip')!;
    this.timeClock = document.getElementById('time-clock')!;
    this.weatherDisplay = document.getElementById('weather-display')!;
    this.activityBar = document.getElementById('activity-bar')!;
    this.activityFill = document.getElementById('activity-fill')!;
    this.activityLabel = document.getElementById('activity-label')!;
    this.buffStrip = document.getElementById('buff-strip')!;
    this.upgradePanel = document.getElementById('upgrade-panel')!;
    this.chatLog = document.getElementById('chat-log')!;
    this.chatPanel = document.getElementById('chat-panel')!;
    this.chatInput = document.getElementById('chat-input') as HTMLInputElement;
    this.onlineStatus = document.getElementById('online-status')!;
    this.heroName = document.getElementById('hero-name')!;
    this.playerListUl = document.getElementById('player-list-ul')!;
    this.controlsPanel = document.getElementById('controls-panel')!;
    this.controlsList = document.getElementById('controls-list')!;
    this.controlsCapture = document.getElementById('controls-capture')!;
    this.compass = new ObjectiveCompass();

    const dpr = window.devicePixelRatio || 1;
    this.minimapSize = isMobileDevice() ? 100 : 168;
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
    document.getElementById('btn-life')?.addEventListener('click', () => this.toggleLifePanel());
    document.getElementById('life-close')?.addEventListener('click', () => this.toggleLifePanel(false));
    document.getElementById('btn-upgrades')?.addEventListener('click', () => this.toggleUpgradePanel());
    document.getElementById('upgrade-close')?.addEventListener('click', () => this.toggleUpgradePanel(false));
    document.getElementById('btn-controls-menu')?.addEventListener('click', () => this.toggleControlsPanel(true));
    document.getElementById('controls-close')?.addEventListener('click', () => this.toggleControlsPanel(false));
    document.getElementById('controls-reset')?.addEventListener('click', () => {
      this.capturingControl = null;
      this.controlsCapture.textContent = 'Controls reset to defaults.';
      this.onResetControls?.();
    });
    window.addEventListener('keydown', (e) => this.captureControlKey(e), true);
    this.setupWorldMapMouse();
    this.setupChat();
    this.renderControlsPanel();
  }

  private setupChat(): void {
    document.getElementById('chat-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.chatInput.value.trim();
      if (text) {
        this.onChatSend?.(text);
        this.chatInput.value = '';
      }
      this.toggleChat(false);
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' && !this.isTypingInUI()) {
        e.preventDefault();
        this.toggleChat(true);
      }
      if (e.code === 'Escape' && this.chatOpen) {
        this.toggleChat(false);
      }
    });
  }

  isTypingInUI(): boolean {
    const tag = document.activeElement?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA';
  }

  setChatHandler(handler: (message: string) => void): void {
    this.onChatSend = handler;
  }

  setControlsHandlers(handlers: {
    rebind: (action: ControlAction, code: string) => void;
    reset: () => void;
  }): void {
    this.onRebindControl = handlers.rebind;
    this.onResetControls = handlers.reset;
  }

  setControlBindings(bindings: KeyBindings): void {
    this.controlBindings = normalizeKeyBindings(bindings);
    this.renderControlsPanel();
  }

  toggleControlsPanel(force?: boolean): void {
    const open = force ?? !this.controlsPanel.classList.contains('open');
    this.controlsPanel.classList.toggle('open', open);
    if (!open) {
      this.capturingControl = null;
      this.controlsCapture.textContent = 'Select a control to rebind.';
      this.renderControlsPanel();
    }
  }

  private renderControlsPanel(): void {
    if (!this.controlsList) return;
    const groups = ['Movement', 'Combat', 'Actions', 'Menus'] as const;
    this.controlsList.innerHTML = groups.map((group) => {
      const rows = CONTROL_BINDING_DEFS
        .filter((def) => def.group === group)
        .map((def) => {
          const keys = this.controlBindings[def.id].map(formatKeyCode).join(' / ');
          const listening = this.capturingControl === def.id ? ' listening' : '';
          return `
            <div class="control-row">
              <span class="control-label">${escapeHtml(def.label)}</span>
              <span class="control-keys">${escapeHtml(keys)}</span>
              <button class="control-rebind${listening}" type="button" data-action="${def.id}">Rebind</button>
            </div>
          `;
        }).join('');
      return `
        <section class="controls-group">
          <h3>${group}</h3>
          ${rows}
        </section>
      `;
    }).join('');

    this.controlsList.querySelectorAll<HTMLButtonElement>('.control-rebind').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action as ControlAction | undefined;
        if (!action) return;
        this.capturingControl = action;
        const label = CONTROL_BINDING_DEFS.find((def) => def.id === action)?.label ?? action;
        this.controlsCapture.textContent = `Press a new key for ${label}. Esc cancels.`;
        this.renderControlsPanel();
      });
    });
  }

  private captureControlKey(e: KeyboardEvent): void {
    if (!this.capturingControl) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.code === 'Escape') {
      this.capturingControl = null;
      this.controlsCapture.textContent = 'Rebind cancelled.';
      this.renderControlsPanel();
      return;
    }

    const action = this.capturingControl;
    this.capturingControl = null;
    this.controlsCapture.textContent = `${formatKeyCode(e.code)} assigned.`;
    this.onRebindControl?.(action, e.code);
  }

  setHeroName(name: string, online: boolean): void {
    this.heroName.textContent = online ? `${name} · Online` : name;
  }

  setOnlineStatus(online: boolean, count: number, label?: string): void {
    if (online) {
      this.onlineStatus.textContent = label ?? `● ${count} online`;
      this.onlineStatus.className = 'online-status mmo';
    } else {
      this.onlineStatus.textContent = 'Solo';
      this.onlineStatus.className = 'online-status solo';
    }
  }

  setPlayerList(names: string[], localName: string): void {
    this.playerListUl.innerHTML = names.map((n) =>
      `<li class="${n === localName ? 'you' : ''}">${n === localName ? `${n} (you)` : n}</li>`,
    ).join('');
  }

  addChatMessage(msg: ChatMessage): void {
    const line = document.createElement('div');
    line.className = `chat-line${msg.system ? ' system' : ''}`;
    if (msg.system) {
      line.textContent = msg.message;
    } else {
      line.innerHTML = `<strong>${msg.from}:</strong> ${escapeHtml(msg.message)}`;
    }
    this.chatLog.appendChild(line);
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
    while (this.chatLog.children.length > 80) {
      this.chatLog.firstChild?.remove();
    }
  }

  toggleChat(force?: boolean): void {
    this.chatOpen = force ?? !this.chatOpen;
    this.chatPanel.classList.toggle('open', this.chatOpen);
    if (this.chatOpen) {
      setTimeout(() => this.chatInput.focus(), 50);
    } else {
      this.chatInput.blur();
    }
  }

  isChatOpen(): boolean {
    return this.chatOpen;
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
    if (this.inventoryOpen) this.renderInventory(player);
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

  setStoryTracker(
    summary: { chapter: string; quest: string; objective: string; progress: string },
    guide?: ObjectiveGuide,
  ): void {
    const guideHtml = guide ? `
      <div class="quest-guide">
        <div><span>Route</span><strong>${escapeHtml(guide.direction)} ${escapeHtml(guide.distance)}</strong></div>
        <div><span>Do</span><strong>${escapeHtml(guide.action)}</strong></div>
        <div><span>Start</span><strong>${escapeHtml(guide.autoStart)}</strong></div>
        <div><span>Nearby</span><strong>${escapeHtml(guide.nearbyActivity)}</strong></div>
      </div>
    ` : '';
    this.questTracker.innerHTML = `
      <h4 class="quest-chapter">${escapeHtml(summary.chapter)}</h4>
      <p class="quest-title">${escapeHtml(summary.quest)}</p>
      <p class="quest-objective">${escapeHtml(summary.objective)}</p>
      <p class="quest-progress">${escapeHtml(summary.progress)}</p>
      ${guideHtml}
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
    const scale = this.minimapSize <= 110 ? 1 : 1.15;
    const cx = map.centerX;
    const cz = map.centerZ;
    const project = (x: number, z: number) => ({
      x: w / 2 + (x - cx) * scale,
      y: h / 2 + (z - cz) * scale,
    });

    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#121827');
    bg.addColorStop(1, '#070a11');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    for (let g = 14; g < w; g += 21) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(w, g);
      ctx.stroke();
    }

    for (const tile of map.biomeTiles) {
      const { x: tx, y: tz } = project(tile.x, tile.z);
      ctx.fillStyle = tile.color;
      ctx.globalAlpha = 0.72;
      ctx.fillRect(tx - 4, tz - 4, 8, 8);
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(212,168,75,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 28 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 52 * scale, 0, Math.PI * 2);
    ctx.stroke();

    if (map.questMarker) {
      const player = project(map.playerX, map.playerZ);
      const goal = project(map.questMarker.x, map.questMarker.z);
      const goalVisible = goal.x > -12 && goal.x < w + 12 && goal.y > -12 && goal.y < h + 12;
      if (goalVisible) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,255,204,0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(goal.x, goal.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    const drawOrder = ['ruin', 'mountain', 'cave', 'dungeon', 'boss', 'trap', 'puzzle', 'shrine', 'fish', 'gather', 'wildlife', 'chest', 'npc', 'enemy', 'quest', 'player'];
    for (const type of drawOrder) {
      for (const poi of map.pois) {
        if (poi.type !== type) continue;
        const { x: ex, y: ez } = project(poi.x, poi.z);
        if (ex < -8 || ex > w + 8 || ez < -8 || ez > h + 8) continue;
        this.drawMapPoi(ctx, type, ex, ez, type === 'player' ? 6 : type === 'quest' ? 6 : 4);
        if (type === 'chest' && poi.meta === 'open') {
          ctx.strokeStyle = 'rgba(255,255,255,0.65)';
          ctx.lineWidth = 1;
          ctx.strokeRect(ex - 4, ez - 4, 8, 8);
        }
      }
    }

    if (map.questMarker) {
      const dist = Math.hypot(map.questMarker.x - map.playerX, map.questMarker.z - map.playerZ);
      ctx.fillStyle = 'rgba(8,10,16,0.78)';
      ctx.fillRect(6, h - 23, Math.min(96, w - 12), 17);
      ctx.fillStyle = '#00ffcc';
      ctx.font = '10px Inter,sans-serif';
      ctx.fillText(`Goal ${Math.round(dist)}m`, 10, h - 11);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '9px Inter,sans-serif';
    ctx.fillText('N', w / 2 - 3, 10);
    ctx.fillText(`X ${Math.round(map.playerX)} Z ${Math.round(map.playerZ)}`, 8, 12);
  }

  private drawWorldMap(map: MinimapSnapshot): void {
    const ctx = this.worldMapCtx;
    const w = this.worldMapCanvas.width;
    const h = this.worldMapCanvas.height;
    const cx = map.centerX;
    const cz = map.centerZ;
    const scale = 0.35 * this.worldMapZoom;
    const project = (x: number, z: number) => ({
      x: w / 2 + (x - cx) * scale,
      y: h / 2 + (z - cz) * scale,
    });

    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#121827');
    bg.addColorStop(0.55, '#0b101b');
    bg.addColorStop(1, '#070a11');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const worldGrid = 50;
    const minX = cx - w / (2 * scale);
    const maxX = cx + w / (2 * scale);
    const minZ = cz - h / (2 * scale);
    const maxZ = cz + h / (2 * scale);
    ctx.strokeStyle = 'rgba(255,255,255,0.055)';
    ctx.lineWidth = 1;
    for (let gx = Math.floor(minX / worldGrid) * worldGrid; gx <= maxX; gx += worldGrid) {
      const p = project(gx, cz);
      ctx.beginPath();
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, h);
      ctx.stroke();
    }
    for (let gz = Math.floor(minZ / worldGrid) * worldGrid; gz <= maxZ; gz += worldGrid) {
      const p = project(cx, gz);
      ctx.beginPath();
      ctx.moveTo(0, p.y);
      ctx.lineTo(w, p.y);
      ctx.stroke();
    }

    for (const tile of map.biomeTiles) {
      const { x: tx, y: tz } = project(tile.x, tile.z);
      ctx.fillStyle = tile.color;
      ctx.globalAlpha = 0.82;
      ctx.fillRect(tx - 5, tz - 5, 10, 10);
    }
    ctx.globalAlpha = 1;

    if (map.questMarker) {
      const player = project(map.playerX, map.playerZ);
      const goal = project(map.questMarker.x, map.questMarker.z);
      ctx.save();
      ctx.strokeStyle = 'rgba(0,255,204,0.38)';
      ctx.lineWidth = 2;
      ctx.setLineDash([9, 6]);
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(goal.x, goal.y);
      ctx.stroke();
      ctx.restore();
    }

    for (const poi of map.pois) {
      const { x: ex, y: ez } = project(poi.x, poi.z);
      if (ex < -10 || ex > w + 10 || ez < -10 || ez > h + 10) continue;
      const size = poi.type === 'player' ? 8 : poi.type === 'quest' || poi.type === 'boss' ? 7 : poi.type === 'enemy' ? 4 : 5;
      this.drawMapPoi(ctx, poi.type, ex, ez, size);
      const label = this.getWorldMapPoiLabel(poi);
      if (label) {
        ctx.fillStyle = poi.type === 'quest' ? '#00ffcc' : poi.type === 'player' ? '#fff4c2' : 'rgba(255,255,255,0.78)';
        ctx.font = '11px Inter,sans-serif';
        ctx.fillText(label, ex + 9, ez - 8);
      }
    }

    const dist = map.questMarker ? Math.hypot(map.questMarker.x - map.playerX, map.questMarker.z - map.playerZ) : null;
    ctx.fillStyle = 'rgba(8,10,16,0.82)';
    ctx.fillRect(12, 12, Math.min(390, w - 24), 36);
    ctx.fillStyle = '#fff4c2';
    ctx.font = '12px Inter,sans-serif';
    ctx.fillText(`You: X ${Math.round(map.playerX)} / Z ${Math.round(map.playerZ)}`, 24, 34);
    if (dist != null) {
      ctx.fillStyle = '#00ffcc';
      ctx.fillText(`Objective: ${Math.round(dist)}m away`, 188, 34);
    }
  }

  private getWorldMapPoiLabel(poi: MinimapSnapshot['pois'][number]): string | null {
    if (poi.type === 'player') return 'You';
    if (poi.type === 'quest') return 'Objective';
    if (poi.type === 'boss') return poi.meta ?? 'Boss';
    if (this.worldMapZoom >= 1.15 && poi.type === 'puzzle') return poi.meta ?? 'Event';
    if (this.worldMapZoom >= 1.35 && (poi.type === 'dungeon' || poi.type === 'cave')) return poi.meta ?? poi.type;
    if (this.worldMapZoom >= 1.5 && (poi.type === 'mountain' || poi.type === 'ruin' || poi.type === 'shrine')) {
      return poi.meta ?? poi.type;
    }
    return null;
  }

  private drawMapPoi(ctx: CanvasRenderingContext2D, type: string, x: number, y: number, size: number): void {
    const color = POI_COLORS[type] ?? '#ffffff';
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = type === 'player' ? '#ffffff' : color;
    ctx.lineWidth = type === 'player' || type === 'quest' ? 2 : 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = type === 'player' || type === 'quest' || type === 'boss' ? 10 : 3;

    if (type === 'player') {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x, y - size - 6);
      ctx.lineTo(x + 4, y - size + 2);
      ctx.lineTo(x - 4, y - size + 2);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'quest') {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#eaffff';
      ctx.stroke();
    } else if (type === 'mountain' || type === 'boss') {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 0.85, y + size);
      ctx.lineTo(x - size * 0.85, y + size);
      ctx.closePath();
      ctx.fill();
      if (type === 'boss') {
        ctx.strokeStyle = '#ffd6e4';
        ctx.stroke();
      }
    } else if (type === 'cave' || type === 'dungeon' || type === 'chest') {
      ctx.fillRect(x - size * 0.75, y - size * 0.75, size * 1.5, size * 1.5);
    } else if (type === 'trap') {
      ctx.beginPath();
      ctx.moveTo(x - size, y - size);
      ctx.lineTo(x + size, y + size);
      ctx.moveTo(x + size, y - size);
      ctx.lineTo(x - size, y + size);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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
    const rarity = normalizeRarity(item.rarity);
    const color = getRarityColor(item.rarity);
    el.style.borderColor = color;
    el.style.color = color;
    el.innerHTML = `<span class="loot-rarity">${rarity.toUpperCase()}</span> ${item.name}`;
    this.lootFeed.prepend(el);
    setTimeout(() => el.classList.add('fade-out'), 3500);
    setTimeout(() => el.remove(), 4000);
    if (this.lootFeed.children.length > 6) this.lootFeed.lastChild?.remove();
  }

  toggleInventory(force?: boolean): void {
    this.inventoryOpen = force ?? !this.inventoryOpen;
    this.inventoryPanel.classList.toggle('open', this.inventoryOpen);
  }

  setInventoryHandlers(handlers: {
    equip: (id: string) => void;
    unequip: (slot: EquipSlot) => void;
    sell: (id: string) => void;
    use: (id: string) => void;
  }): void {
    this.onEquip = handlers.equip;
    this.onUnequip = handlers.unequip;
    this.onSell = handlers.sell;
    this.onUseItem = handlers.use;
  }

  private renderInventory(player: Player): void {
    const grid = document.getElementById('inventory-grid')!;
    const g = player.getGearBonuses();
    const stats = document.getElementById('gear-stats');
    if (stats) {
      stats.innerHTML = `
        <div>⚔ ${g.weaponDps} DPS</div>
        <div>💥 ${(player.critChance * 100).toFixed(0)}% Crit</div>
        <div>🩸 ${(player.lifesteal * 100).toFixed(0)}% Leech</div>
      `;
    }
    for (const slot of ['weapon', 'armor', 'accessory'] as EquipSlot[]) {
      const el = document.getElementById(`equip-${slot}`);
      const item = player.equipped[slot];
      if (!el) continue;
      if (item) {
        el.innerHTML = `<span class="eq-rarity" style="color:${getRarityColor(item.rarity)}">${item.name}</span>
          <button class="eq-unequip" data-slot="${slot}">Unequip</button>`;
        el.classList.add('filled');
      } else {
        el.innerHTML = slot === 'weapon' ? '⚔ Weapon' : slot === 'armor' ? '🛡 Armor' : '💍 Accessory';
        el.classList.remove('filled');
      }
    }
    document.querySelectorAll('.eq-unequip').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onUnequip?.((btn as HTMLElement).dataset.slot as EquipSlot);
      });
    });

    const mobile = isMobileDevice();
    grid.innerHTML = player.inventory.map((item) => {
      const aff = item.affixes.slice(0, 2).map((a) => a.name).join(' ');
      const stat = item.type === 'weapon' ? `${item.dps} DPS` : item.type === 'consumable' ? 'Use' : aff || item.type;
      const leg = item.legendaryPower ? `<span class="inv-leg">${item.legendaryPower}</span>` : '';
      const color = getRarityColor(item.rarity);
      const rarity = normalizeRarity(item.rarity);
      const equipBtn = item.type !== 'consumable'
        ? '<button type="button" class="inv-equip-btn">Equip</button>' : '';
      const useBtn = item.type === 'consumable'
        ? '<button type="button" class="inv-use-btn">Use</button>' : '';
      const mobileActions = mobile
        ? `<div class="inv-mobile-actions">${equipBtn}${useBtn}<button type="button" class="inv-sell-btn">Sell</button></div>`
        : '';
      return `<div class="inv-item" data-id="${item.id}" style="border-color: ${color}" title="${item.name}\n${item.affixes.map((a) => `${a.name} +${a.value}`).join(', ')}">
        <span class="inv-rarity">${rarity.slice(0, 3).toUpperCase()}</span>
        <span class="inv-name">${item.name}</span>
        <span class="inv-dps">${stat}</span>${leg}${mobileActions}
      </div>`;
    }).join('') || '<p class="empty-inv">No items yet — defeat enemies!</p>';

    grid.querySelectorAll('.inv-item').forEach((el) => {
      const id = (el as HTMLElement).dataset.id!;
      const item = player.inventory.find((i) => i.id === id);
      el.addEventListener('click', () => {
        if (mobile) return;
        if (!item) return;
        if (item.type === 'consumable') this.onUseItem?.(id);
        else if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') this.onEquip?.(id);
      });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.onSell?.(id);
      });
      el.addEventListener('dblclick', () => {
        if (item?.type === 'consumable') this.onUseItem?.(id);
      });
      el.querySelector('.inv-equip-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onEquip?.(id);
      });
      el.querySelector('.inv-use-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onUseItem?.(id);
      });
      el.querySelector('.inv-sell-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onSell?.(id);
      });
    });
  }

  showLevelUp(): void {
    // Level-up cinematic is handled by ScreenEffects from Game.ts
  }

  showAchievement(icon: string, title: string, description: string): void {
    const el = document.createElement('div');
    el.className = 'achievement-toast';
    el.innerHTML = `<span class="ach-toast-icon">${icon}</span><div><strong>Achievement Unlocked</strong><br>${title}<small>${description}</small></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 500); }, 4200);
  }

  showBossIntro(name: string): void {
    const intro = document.getElementById('boss-intro')!;
    intro.querySelector('.boss-name')!.textContent = name;
    intro.classList.add('active');
    setTimeout(() => intro.classList.remove('active'), 4500);
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
    const textEl = panel.querySelector('.dialogue-text') as HTMLElement;
    panel.querySelector('.dialogue-name')!.textContent = name;
    const full = lines.join(' ');
    textEl.textContent = '';
    panel.classList.add('open');
    let i = 0;
    const type = () => {
      if (i < full.length) {
        textEl.textContent += full[i++];
        setTimeout(type, 18 + Math.random() * 12);
      }
    };
    type();
    setTimeout(() => panel.classList.remove('open'), Math.max(5000, full.length * 25));
  }

  showQuestComplete(title: string): void {
    const el = document.getElementById('quest-toast');
    if (!el) return;
    el.innerHTML = `<strong>✦ Mission Complete ✦</strong><br>${title}`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 4000);
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
  showDeathScreen(deaths = 1, level = 1): void {
    if (this.deathShown) return;
    this.deathShown = true;
    const screen = document.getElementById('death-screen');
    const stats = document.getElementById('death-stats');
    const fill = document.getElementById('death-respawn-fill');
    if (stats) stats.textContent = `Fallen ${deaths} time${deaths > 1 ? 's' : ''} · Level ${level}`;
    if (fill) {
      fill.style.width = '0%';
      requestAnimationFrame(() => { fill.style.width = '100%'; });
    }
    screen?.classList.add('open');
  }

  hideDeathScreen(): void {
    this.deathShown = false;
    document.getElementById('death-screen')?.classList.remove('open');
    const fill = document.getElementById('death-respawn-fill');
    if (fill) fill.style.width = '0%';
  }

  setCraftHandler(handler: (recipeId: string) => void): void {
    this.onCraft = handler;
  }

  setUpgradeHandler(handler: (type: 'attr' | 'perk', id: string) => void): void {
    this.onUpgrade = handler;
  }

  toggleUpgradePanel(force?: boolean): void {
    this.upgradePanelOpen = force ?? !this.upgradePanelOpen;
    this.upgradePanel.classList.toggle('open', this.upgradePanelOpen);
  }

  isUpgradePanelOpen(): boolean {
    return this.upgradePanelOpen;
  }

  renderUpgradePanel(player: Player, upgrades: UpgradeSystem): void {
    this.lastUpgradePlayer = player;
    this.lastUpgradeSystem = upgrades;
    const spEl = document.getElementById('skill-points-display');
    if (spEl) spEl.textContent = `${player.skillPoints} SP`;

    const attrEl = document.getElementById('attr-upgrades')!;
    attrEl.innerHTML = (Object.keys(ATTRIBUTE_UPGRADES) as Array<keyof typeof ATTRIBUTE_UPGRADES>).map((id) => {
      const def = ATTRIBUTE_UPGRADES[id];
      const val = player.attributes[id];
      const can = player.skillPoints > 0;
      return `<button class="attr-btn" data-attr="${id}" ${can ? '' : 'disabled'}>
        <strong>${def.label}</strong> <em>${val}</em>
        <span>${def.effect}</span>
      </button>`;
    }).join('');
    attrEl.querySelectorAll('[data-attr]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.attr;
        if (id) this.onUpgrade?.('attr', id);
      });
    });

    const perkEl = document.getElementById('perk-upgrades')!;
    perkEl.innerHTML = PERK_TREE.map((p) => {
      const owned = upgrades.hasPerk(p.id);
      const can = upgrades.canBuyPerk(p.id, player.skillPoints, player.level);
      return `<button class="perk-btn ${owned ? 'owned' : ''}" data-perk="${p.id}" ${owned || !can ? 'disabled' : ''}>
        <strong>${p.name}</strong> <em>${p.cost} SP</em>
        <span>${p.description}</span>
      </button>`;
    }).join('');
    perkEl.querySelectorAll('[data-perk]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.perk;
        if (id) this.onUpgrade?.('perk', id);
      });
    });

    const lifeEl = document.getElementById('life-mastery')!;
    lifeEl.innerHTML = ['gather', 'fish', 'hunt', 'craft', 'mine'].map((sk) =>
      `<div class="mastery-row"><span>${sk}</span><strong>Lv.${upgrades.getLifeLevel(sk)}</strong></div>`,
    ).join('');
  }

  toggleLifePanel(force?: boolean): void {
    this.lifePanelOpen = force ?? !this.lifePanelOpen;
    this.lifePanel.classList.toggle('open', this.lifePanelOpen);
  }

  isLifePanelOpen(): boolean {
    return this.lifePanelOpen;
  }

  updateTimeDisplay(clock: string, period: TimePeriod): void {
    const icons: Record<TimePeriod, string> = {
      dawn: '🌅', day: '☀', dusk: '🌇', night: '🌙',
    };
    this.timeClock.textContent = `${icons[period]} ${clock}`;
    this.timeClock.className = `time-clock period-${period}`;
  }

  updateWeatherDisplay(icon: string, label: string, weatherClass: string): void {
    if (!this.weatherDisplay) return;
    this.weatherDisplay.textContent = `${icon} ${label}`;
    this.weatherDisplay.className = `weather-display ${weatherClass}`;
  }

  showWeatherToast(label: string): void {
    const el = document.getElementById('interact-toast');
    if (!el) return;
    el.textContent = `Weather: ${label}`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2800);
  }

  updateLifeHud(
    life: LifeSkillsManager,
    activityPct: number,
    activityLabel: string,
    buffs: string[],
  ): void {
    const mats = life.getMaterialList();
    this.materialsStrip.innerHTML = mats.length
      ? mats.slice(0, 8).map((m) =>
        `<span class="mat-chip" title="${m.def.name}">${m.def.icon} ${m.count}</span>`,
      ).join('')
      : '<span class="mat-empty">Gather with F near nodes</span>';

    this.activityBar.classList.toggle('active', activityPct > 0);
    this.activityFill.style.width = `${activityPct * 100}%`;
    if (activityLabel) this.activityLabel.textContent = activityLabel;

    this.buffStrip.innerHTML = buffs.map((b) => `<span class="buff-chip">${b}</span>`).join('');

    if (this.lifePanelOpen) this.renderLifePanel(life);
    if (this.upgradePanelOpen && this.lastUpgradePlayer && this.lastUpgradeSystem) {
      this.renderUpgradePanel(this.lastUpgradePlayer, this.lastUpgradeSystem);
    }
  }

  private lastUpgradePlayer: Player | null = null;
  private lastUpgradeSystem: UpgradeSystem | null = null;

  renderLifePanel(life: LifeSkillsManager): void {
    const matEl = document.getElementById('life-materials')!;
    const recEl = document.getElementById('life-recipes')!;
    const mats = life.getMaterialList();
    matEl.innerHTML = mats.length
      ? `<div class="life-mat-grid">${mats.map((m) =>
        `<div class="life-mat"><span>${m.def.icon}</span><strong>${m.def.name}</strong><em>×${m.count}</em></div>`,
      ).join('')}</div>`
      : '<p class="life-empty">No materials yet — fish, gather, and hunt around camp.</p>';

    recEl.innerHTML = RECIPES.map((r) => {
      const can = life.crafting.canCraft(life.materials, r);
      const req = Object.entries(r.requires)
        .map(([id, n]) => `${n} ${id.replace('_', ' ')}`)
        .join(', ');
      return `<button class="recipe-btn ${can ? '' : 'disabled'}" data-recipe="${r.id}" ${can ? '' : 'disabled'}>
        <strong>${r.name}</strong>
        <span>${r.description}</span>
        <em>Needs: ${req}</em>
      </button>`;
    }).join('');

    recEl.querySelectorAll('[data-recipe]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.recipe;
        if (id) this.onCraft?.(id);
      });
    });
  }

  updateObjectiveCompass(
    px: number,
    pz: number,
    camYaw: number,
    target: { x: number; z: number } | null,
    questTitle?: string,
  ): void {
    this.compass.update(px, pz, camYaw, target, questTitle);
  }

  setActionHint(base: string, lifeHint: string): void {
    const text = lifeHint || base;
    this.setInteractHint(text);
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

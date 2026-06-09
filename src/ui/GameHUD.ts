import { CLASS_DEFINITIONS } from '../character/ClassDefinitions';
import type { Player, EquipSlot } from '../character/Player';
import { RARITY_COLORS } from '../config/constants';
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
  private onChatSend?: (message: string) => void;
  private chatOpen = false;
  private chatLog: HTMLElement;
  private chatPanel: HTMLElement;
  private chatInput: HTMLInputElement;
  private onlineStatus: HTMLElement;
  private heroName: HTMLElement;
  private playerListUl: HTMLElement;
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
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyQ') this.toggleJournal();
      if (e.code === 'KeyM') this.toggleWorldMap();
      if (e.code === 'KeyC') this.toggleLifePanel();
      if (e.code === 'KeyU') this.toggleUpgradePanel();
    });
    this.setupWorldMapMouse();
    this.setupChat();
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

    const drawOrder = ['ruin', 'mountain', 'cave', 'shrine', 'fish', 'gather', 'wildlife', 'chest', 'npc', 'enemy', 'quest', 'player'];
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
        el.innerHTML = `<span class="eq-rarity" style="color:${RARITY_COLORS[item.rarity]}">${item.name}</span>
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
      const equipBtn = item.type !== 'consumable'
        ? '<button type="button" class="inv-equip-btn">Equip</button>' : '';
      const useBtn = item.type === 'consumable'
        ? '<button type="button" class="inv-use-btn">Use</button>' : '';
      const mobileActions = mobile
        ? `<div class="inv-mobile-actions">${equipBtn}${useBtn}<button type="button" class="inv-sell-btn">Sell</button></div>`
        : '';
      return `<div class="inv-item" data-id="${item.id}" style="border-color: ${RARITY_COLORS[item.rarity]}" title="${item.name}\n${item.affixes.map((a) => `${a.name} +${a.value}`).join(', ')}">
        <span class="inv-rarity">${item.rarity.slice(0, 3).toUpperCase()}</span>
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

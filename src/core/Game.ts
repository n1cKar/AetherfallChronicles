import * as THREE from 'three';
import { WORLD_SEED_KEY, RARITIES } from '../config/constants';
import { CLASS_DEFINITIONS } from '../character/ClassDefinitions';
import { Player } from '../character/Player';
import type { ClassId } from '../config/constants';
import { CombatSystem } from '../combat/CombatSystem';
import { EnemyManager } from '../combat/EnemyManager';
import { IsometricCamera } from './IsometricCamera';
import { InputManager } from './InputManager';
import { WorldManager, type MapPOI } from '../world/WorldManager';
import { DayNightCycle } from '../world/DayNightCycle';
import { WeatherSystem } from '../world/WeatherSystem';
import { PostProcessing } from '../render/PostProcessing';
import { ParticleSystem } from '../effects/ParticleSystem';
import { DamageNumberSystem } from '../ui/DamageNumbers';
import { GameHUD, type ObjectiveGuide } from '../ui/GameHUD';
import { AudioManager, type MusicContext } from '../audio/AudioManager';
import { SaveManager, type PlayerSaveData } from '../save/SaveManager';
import { EventBus } from '../utils/EventBus';
import type { ItemInstance } from '../loot/ItemGenerator';
import { ItemGenerator } from '../loot/ItemGenerator';
import { getRarityColor, normalizeRarity } from '../config/constants';
import { StoryCampaign, STORY_CHAPTERS } from '../game/StoryCampaign';
import type { CampaignObjective, CampaignQuest } from '../game/StoryCampaign';
import { GrassField } from '../render/GrassField';
import { buildPerformanceProfile, type PerformanceProfile } from './PerformanceProfile';
import { LifeSkillsManager } from '../life/LifeSkillsManager';
import type { MaterialId } from '../life/Materials';
import { network, type NetworkPlayerState } from '../network/NetworkClient';
import { RemotePlayerManager } from '../network/RemotePlayerManager';
import { NameplateSystem } from '../ui/NameplateSystem';
import { AmbientLife } from '../world/AmbientLife';
import { QuestBeacon } from '../effects/QuestBeacon';
import { ScreenEffects } from '../ui/ScreenEffects';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { ActivityManager } from '../systems/ActivityManager';
import { AchievementSystem } from '../systems/AchievementSystem';
import { addMaterial } from '../life/Materials';
import type { EquipSlot } from '../character/Player';
import { applyMobileDocumentClass } from '../utils/device';
import { DungeonSystem } from '../dungeon/DungeonSystem';
import {
  DEFAULT_KEY_BINDINGS,
  normalizeKeyBindings,
  type ControlAction,
  type KeyBindings,
} from './KeyBindings';

interface RoamingWorldEvent {
  id: string;
  title: string;
  state: 'available' | 'active' | 'cooldown';
  center: THREE.Vector3;
  targetKills: number;
  kills: number;
  spawned: number;
  spawnCooldown: number;
  timer: number;
  rewardGiven: boolean;
}

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private clock = new THREE.Clock();
  private running = false;
  private bus = new EventBus();
  private camera: IsometricCamera;
  private input: InputManager;
  private world!: WorldManager;
  private dayNight!: DayNightCycle;
  private weather!: WeatherSystem;
  private postFX!: PostProcessing;
  private grass!: GrassField;
  private player!: Player;
  private enemyManager!: EnemyManager;
  private combat!: CombatSystem;
  private particles!: ParticleSystem;
  private damageNumbers!: DamageNumberSystem;
  private hud!: GameHUD;
  private story!: StoryCampaign;
  private life!: LifeSkillsManager;
  private upgrades!: UpgradeSystem;
  private activities!: ActivityManager;
  private dungeons!: DungeonSystem;
  private displayName = 'Adventurer';
  private onlineMode = false;
  private remotes: RemotePlayerManager | null = null;
  private nameplates: NameplateSystem | null = null;
  private ambientLife!: AmbientLife;
  private questBeacon!: QuestBeacon;
  private screenFx!: ScreenEffects;
  private footstepTimer = 0;
  private combatMusicTimer = 0;
  private bossRoared = false;
  private nightFactor = 1;
  private stormSurvivalTimer = 0;
  private lastWeather = 'sunny';
  private lastBiomeId = '';
  private achievements!: AchievementSystem;
  private audio = new AudioManager();
  private settings = SaveManager.loadSettings();
  private perf: PerformanceProfile;
  private playTime = 0;
  private worldSeed: number;
  private lootDrops: { item: ItemInstance; mesh: THREE.Mesh; life: number }[] = [];
  private paused = false;
  private interactCooldown = 0;
  private objectiveArrivalCooldown = 0;
  private autoObjectiveActionTimer = 0;
  private lastPassiveObjectiveKey = '';
  private bossObjectiveSpawned = false;
  private roamingEvent: RoamingWorldEvent | null = null;
  private roamingEventTimer = 24;
  private saveTimer = 0;
  private physicsColliders: THREE.Box3[] = [];
  private fogColor = new THREE.Color();
  private sceneFog = new THREE.FogExp2(0x4a6a78, 0.012);
  private skyColor = new THREE.Color(0x1a2840);
  private objectiveOrigin = { x: 0, z: 0 };
  private visibilityFill: THREE.HemisphereLight;
  private playerLantern: THREE.PointLight;

  constructor(private canvas: HTMLCanvasElement) {
    this.worldSeed = this.getSeed();
    this.perf = buildPerformanceProfile(this.settings);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.perf.antialias,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.perf.pixelRatio);
    this.renderer.shadowMap.enabled = this.perf.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 2.35;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2840);
    this.scene.fog = this.sceneFog;
    this.visibilityFill = new THREE.HemisphereLight(0xcfe6ff, 0x5f4a35, 0.95);
    this.scene.add(this.visibilityFill);
    this.playerLantern = new THREE.PointLight(0xffe0b0, 1.9, 42, 1.05);
    this.playerLantern.castShadow = false;
    this.scene.add(this.playerLantern);

    this.camera = new IsometricCamera(window.innerWidth / window.innerHeight);
    this.input = new InputManager(canvas, this.settings.keyBindings);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  async start(
    classId: ClassId,
    displayName: string,
    opts?: { online?: boolean; serverUrl?: string },
  ): Promise<void> {
    this.displayName = displayName;
    this.onlineMode = opts?.online ?? false;
    const save = SaveManager.loadPlayer();
    const activeSave = save && save.classId === classId ? save : null;
    this.player = new Player(classId);
    if (activeSave) {
      this.player.level = activeSave.level;
      this.player.xp = activeSave.xp;
      this.player.xpToNext = activeSave.xpToNext;
      this.player.gold = activeSave.gold;
      this.player.inventory = activeSave.inventory ?? [];
      this.player.loadEquipped(activeSave.equipped ?? {});
      this.player.attributes = activeSave.attributes;
      this.player.skillPoints = activeSave.skillPoints ?? 0;
      this.player.deaths = activeSave.deaths ?? this.player.deaths;
      this.player.rotation = activeSave.rotation ?? this.player.rotation;
      this.restorePlayerVitals(activeSave);
      if (!this.onlineMode) this.worldSeed = activeSave.worldSeed ?? this.worldSeed;
      this.playTime = activeSave.playTimeSeconds ?? 0;
    }

    if (!this.onlineMode && !activeSave?.worldSeed) {
      this.worldSeed = this.getSeed();
    }

    const def = CLASS_DEFINITIONS[classId];

    if (this.onlineMode) {
      const url = opts?.serverUrl ?? 'ws://localhost:2567';
      const ok = await network.connect(url, {
        name: displayName,
        classId,
        level: this.player.level,
      });
      if (ok && network.worldSeed != null) {
        this.worldSeed = network.worldSeed;
        localStorage.setItem(WORLD_SEED_KEY, String(network.worldSeed));
      } else {
        this.onlineMode = false;
        network.disconnect();
      }
    }

    this.world = new WorldManager(this.scene, this.worldSeed, this.perf);
    this.dayNight = new DayNightCycle(this.scene, def.primaryColor, 0xffe8c0, this.perf.shadowMapSize, this.perf.shadowsEnabled);
    this.weather = new WeatherSystem(this.scene, this.perf.weatherParticles);
    this.weather.setChangeCallback(() => {
      this.stormSurvivalTimer = 0;
      const g = this.weather.getGameplay();
      this.hud.showWeatherToast(g.label);
    });
    this.postFX = new PostProcessing(this.renderer, window.innerWidth, window.innerHeight, this.perf.postProcessingScale);
    this.postFX.applySettings(this.settings, this.perf.postProcessingScale);
    this.grass = new GrassField(this.scene, this.perf.grassCount);
    this.ambientLife = new AmbientLife(this.scene);
    this.questBeacon = new QuestBeacon(this.scene);
    this.screenFx = new ScreenEffects();
    this.enemyManager = new EnemyManager(this.scene);
    this.enemyManager.applyPerformance(this.perf);
    this.particles = new ParticleSystem(this.scene);
    this.damageNumbers = new DamageNumberSystem();
    this.damageNumbers.enabled = this.settings.showDamageNumbers;
    this.combat = new CombatSystem(this.bus, this.particles, this.damageNumbers);
    this.hud = new GameHUD();
    this.achievements = new AchievementSystem(this.bus, (def) => {
      this.screenFx.showAchievement(def.icon, def.title, def.description);
      this.audio.playQuestComplete();
      this.refreshJournal();
      this.updateAchievementBadge();
    });
    this.achievements.loadState(activeSave?.achievementState ?? activeSave?.achievements);

    if (this.onlineMode) {
      this.remotes = new RemotePlayerManager(this.scene);
      this.nameplates = new NameplateSystem();
    } else if (opts?.online) {
      this.hud.showInteractMessage('Could not join online realm — playing solo.');
    }

    this.story = new StoryCampaign(this.bus);
    this.story.load(activeSave?.story);
    this.upgrades = new UpgradeSystem();
    this.upgrades.load(activeSave?.upgrades);
    this.life = new LifeSkillsManager(this.scene, this.bus);
    this.life.loadFromSave(activeSave?.lifeSkills);
    this.activities = new ActivityManager(this.scene, this.bus);
    this.dungeons = new DungeonSystem(this.scene, this.world.interactables, this.bus, this.worldSeed);
    if (activeSave?.dayTime != null) this.dayNight.time = activeSave.dayTime;
    this.hud.initSkills(classId);
    this.hud.setCraftHandler((id) => this.tryCraft(id));
    this.hud.setInventoryHandlers({
      equip: (id) => {
        if (this.player.equipItem(id)) {
          this.audio.playLoot();
          this.hud.showInteractMessage('Item equipped!');
          this.saveTimer = 8;
        }
      },
      unequip: (slot: EquipSlot) => {
        if (this.player.unequipSlot(slot)) {
          this.hud.showInteractMessage('Item unequipped.');
          this.saveTimer = 8;
        }
      },
      sell: (id) => {
        const v = this.player.sellItem(id);
        if (v > 0) {
          this.hud.showInteractMessage(`Sold for ${v} gold.`);
          this.saveTimer = 8;
        }
      },
      use: (id) => {
        const r = this.player.useConsumable(id);
        if (r.ok) {
          this.screenFx.flashHeal();
          this.hud.showInteractMessage(r.message);
          this.saveTimer = 8;
        }
      },
    });
    this.hud.setUpgradeHandler((type, id) => this.tryUpgrade(type, id));
    this.hud.setControlsHandlers({
      rebind: (action, code) => this.rebindControl(action, code),
      reset: () => this.resetControls(),
    });
    this.hud.setControlBindings(this.settings.keyBindings);
    this.hud.setChatHandler((msg) => {
      this.bus.emit('player_chat');
      if (this.onlineMode) network.sendChat(msg);
      else this.hud.addChatMessage({ from: this.displayName, message: msg });
    });
    this.hud.setHeroName(displayName, this.onlineMode);
    this.hud.setOnlineStatus(this.onlineMode, network.onlineCount);
    this.hud.setPlayerList([displayName], displayName);
    if (this.onlineMode) this.setupMultiplayer();
    this.hud.setStoryTracker(this.story.getHudSummary());
    this.refreshJournal();
    this.updateAchievementBadge();
    this.hud.showChapterIntro(STORY_CHAPTERS[0].title, STORY_CHAPTERS[0].intro);
    this.hud.showTutorial();
    if (!this.nameplates) this.nameplates = new NameplateSystem();

    const startX = activeSave?.position?.x ?? 0;
    const startZ = activeSave?.position?.z ?? 0;
    this.objectiveOrigin = { x: startX, z: startZ };
    const h = (x: number, z: number) => this.world.getHeightAt(x, z);
    this.player.position.set(startX, h(startX, startZ), startZ);
    this.player.body.position.copy(this.player.position);
    if (activeSave?.velocity) {
      this.player.velocity.set(activeSave.velocity.x, activeSave.velocity.y, activeSave.velocity.z);
      this.player.body.velocity.copy(this.player.velocity);
    }
    this.player.upgrades = this.upgrades;
    this.player.displayName = displayName;
    this.scene.add(this.player.mesh);

    // Avoid first-frame hitch: build initial chunks before entering loop.
    this.world.preloadAround(startX, startZ, this.perf.chunkViewDistance >= 3 ? 2 : 1);
    this.life.spawnStarter(startX, startZ, h);
    this.activities.spawnWorldContent(startX, startZ, h);
    this.dungeons.spawnStarterDungeons(startX, startZ, h);

    this.spawnStarterChest(startX + 8, startZ + 5, h);
    this.activities.loadFromSave(activeSave?.activities);
    this.dungeons.loadFromSave(activeSave?.dungeons, h);
    this.world.interactables.loadFromSave(activeSave?.interactables);

    this.audio.init(this.settings);
    void this.audio.resume().catch(() => undefined);

    this.setupEvents();
    this.running = true;
    this.clock.start();
    this.animate();
  }

  private spawnStarterChest(x: number, z: number, h: (x: number, z: number) => number): void {
    this.world.interactables.spawnChest(x, z, h(x, z));
  }

  private setupMultiplayer(): void {
    network.on('welcome', (data: unknown) => {
      const w = data as { playerId: string; players: NetworkPlayerState[] };
      this.remotes?.syncFromWelcome(w.players, w.playerId);
      this.hud.setOnlineStatus(true, network.onlineCount);
      this.refreshPlayerList();
      this.hud.addChatMessage({ from: 'System', message: 'Connected to the shared realm.', system: true });
    });
    network.on('player_joined', (p: unknown) => {
      this.remotes?.upsert(p as NetworkPlayerState);
      this.hud.setOnlineStatus(true, network.onlineCount);
      this.refreshPlayerList();
    });
    network.on('player_left', (id: unknown) => {
      const name = this.remotes?.remove(String(id));
      this.hud.setOnlineStatus(true, network.onlineCount);
      this.refreshPlayerList();
      if (name) {
        this.hud.addChatMessage({ from: 'System', message: `${name} disconnected.`, system: true });
      }
    });
    network.on('player_state', (p: unknown) => {
      this.remotes?.upsert(p as NetworkPlayerState);
    });
    network.on('chat', (payload: unknown) => {
      this.hud.addChatMessage(payload as { from: string; message: string; system?: boolean });
    });
    network.on('net_error', (msg: unknown) => {
      this.hud.showInteractMessage(String(msg));
    });
    network.on('disconnected', () => {
      this.hud.setOnlineStatus(false, 0);
      this.hud.addChatMessage({ from: 'System', message: 'Lost connection — reconnecting…', system: true });
    });
  }

  private refreshPlayerList(): void {
    const names = [this.displayName, ...this.remotes?.getAll().map((p) => p.name) ?? []];
    this.hud.setPlayerList(names, this.displayName);
  }

  private setupEvents(): void {
    this.bus.on('enemy_killed', (enemy: unknown, loot: unknown) => {
      const e = enemy as { name: string; tier: 'normal' | 'elite' | 'boss'; position: THREE.Vector3 };
      const items = loot as ItemInstance[];
      this.screenFx.showKillStreak(this.combat.killStreak);
      if (this.activities.arena.active) {
        this.activities.onArenaKill();
        if (this.upgrades.hasPerk('arena_heart')) this.player.heal(5);
      }
      if (this.activities.spire.active) this.activities.onSpireKill();
      if (this.activities.rift.active) this.activities.onRiftKill();
      this.registerRoamingEventKill(e.position);
      if (e.tier === 'boss') {
        this.camera.startBossCinematic(3);
        this.hud.showBossIntro(e.name);
        this.screenFx.pulseBossVignette();
      }
      for (const item of items) {
        this.notifyLootRarity(item);
        this.spawnLootDrop(e.position, item);
        if (this.settings.autoLoot) {
          this.player.addItem(item);
          this.hud.addLootNotification(item);
          this.audio.playLoot();
          this.achievements.checkInventory(this.player.inventory.length);
        }
      }
      this.audio.playEnemyDeath(e.tier);
      if (this.dayNight.isNight()) this.bus.emit('night_kill');
    });

    this.bus.on('player_hurt', () => {
      this.audio.playPlayerHurt();
      this.screenFx.flashDamage();
      this.camera.punchZoom(4);
    });
    this.bus.on('combat_hit', (_n: unknown, _dmg: unknown, crit?: unknown) => {
      this.combatMusicTimer = 4;
      if (crit) {
        this.audio.playCrit();
        this.screenFx.showCritBanner();
        this.camera.punchZoom(-3);
      } else {
        this.audio.playHit();
      }
    });
    this.bus.on('level_up', () => {
      this.hud.showLevelUp();
      this.screenFx.showLevelUpCinematic(this.player.level);
      this.audio.playLevelUp();
      this.particles.emitLevelUp(this.player.position);
      this.screenFx.flashHeal();
      this.story.updateLevel(this.player.level);
      this.achievements.checkLevel(this.player.level);
      this.hud.setStoryTracker(this.story.getHudSummary());
      this.refreshJournal();
      this.updateAchievementBadge();
    });

    this.bus.on('quest_complete', (q: unknown) => {
      const quest = q as CampaignQuest;
      this.audio.playQuestComplete();
      this.particles.emitLevelUp(this.player.position);
      this.screenFx.showQuestFlash();
      this.player.gold += quest.rewards.gold;
      if (quest.rewards.skillPoints) this.player.skillPoints += quest.rewards.skillPoints;
      if (this.player.gainXp(quest.rewards.xp)) this.bus.emit('level_up');
      this.hud.showQuestComplete(quest.title);
      this.hud.setStoryTracker(this.story.getHudSummary());
      this.refreshJournal();
      this.updateAchievementBadge();
    });

    this.bus.on('chapter_intro', (ch: unknown) => {
      const chapter = ch as { title: string; intro: string };
      this.hud.showChapterIntro(chapter.title, chapter.intro);
    });

    this.bus.on('campaign_complete', () => {
      this.hud.showCampaignComplete();
    });

    this.bus.on('material_gathered', () => {
      const w = this.weather.current;
      if (w === 'rain' || w === 'heavy_rain') this.bus.emit('weather_rain_gather');
    });
    this.bus.on('fish_caught', () => {
      const w = this.weather.current;
      if (w === 'snow' || w === 'blizzard') this.bus.emit('weather_snow_fish');
    });

    this.bus.on('ore_mined', (amt: unknown) => {
      const n = typeof amt === 'number' ? amt : 1;
      const bonus = 1 + this.upgrades.getYieldBonus();
      this.life.materials = addMaterial(this.life.materials, 'ore', Math.ceil(n * bonus));
      if (Math.random() < 0.35) {
        this.life.materials = addMaterial(this.life.materials, 'crystal_shard', 1);
      }
      this.upgrades.addLifeXp('mine', 1);
      this.hud.showInteractMessage('Mined ore and crystals!');
    });

    this.bus.on('treasure_dug', () => {
      const bonus = 1 + this.upgrades.getYieldBonus();
      if (Math.random() < 0.55) {
        this.life.materials = addMaterial(this.life.materials, 'ancient_relic', Math.ceil(bonus));
        this.player.gold += 25;
        this.hud.showInteractMessage('Unearthed an Ancient Relic!');
      } else {
        this.life.materials = addMaterial(this.life.materials, 'ore', 2);
        this.player.gold += 10;
        this.hud.showInteractMessage('Found buried coins and ore.');
      }
      this.particles.emitLoot(this.player.position, 0xffd700);
    });

    this.bus.on('arena_complete', (wave: unknown) => {
      const w = Number(wave);
      if (w > this.upgrades.arenaBestWave) this.upgrades.arenaBestWave = w;
      this.achievements.checkArenaWave(w);
      this.player.gold += w * 20;
      this.hud.showInteractMessage(`Arena cleared wave ${w}! +${w * 20} gold`);
    });

    this.bus.on('spire_complete', (floor: unknown) => {
      const f = Number(floor);
      this.player.gold += f * 50;
      this.hud.showInteractMessage(`Aether Spire conquered! Floor ${f} - +${f * 50} gold`);
    });

    this.bus.on('rift_start', (tier: unknown) => {
      this.hud.showInteractMessage(`Aether Rift opened - Tier ${Number(tier) || 1}`);
      this.particles.emitMagic(this.activities.rift.center, 0x88ccff);
    });

    this.bus.on('rift_complete', (tier: unknown) => {
      const t = Number(tier) || 1;
      const gold = 75 + t * 35;
      this.player.gold += gold;
      const reward = t >= 3
        ? ItemGenerator.generate(this.player.level + t, 'legendary')
        : ItemGenerator.generateAccessory(this.player.level + t, 'epic');
      this.spawnLootDrop(this.activities.rift.center, reward);
      this.hud.showInteractMessage(`Rift sealed! +${gold} gold and a reward drop.`);
      this.particles.emitLevelUp(this.activities.rift.center);
    });

    this.bus.on('achievement_gold', (amt: unknown) => {
      this.player.gold += Number(amt) || 0;
    });

    this.bus.on('dungeon_trap', (name: unknown) => {
      const damage = 10 + this.player.level * 1.5;
      const actual = this.player.takeDamage(damage);
      if (actual > 0) {
        this.screenFx.flashDamage();
        this.camera.punchZoom(3);
        this.hud.showInteractMessage(`${String(name)} trap hit for ${Math.round(actual)} damage!`);
      }
    });

    this.bus.on('boss_arena_opened', (name: unknown) => {
      this.hud.showInteractMessage(`${String(name)} boss arena awakened.`);
      this.audio.playBossRoar();
    });

    [
      'quest_complete',
      'campaign_complete',
      'level_up',
      'chest_opened',
      'npc_talk',
      'material_gathered',
      'fish_caught',
      'wildlife_hunted',
      'item_crafted',
      'ore_mined',
      'treasure_dug',
      'shrine_blessed',
      'arena_wave',
      'arena_complete',
      'spire_floor',
      'spire_complete',
      'rift_start',
      'rift_complete',
      'dungeon_entered',
      'secret_found',
      'boss_arena_opened',
    ].forEach((event) => {
      this.bus.on(event, () => { this.saveTimer = 8; });
    });
  }

  private refreshJournal(): void {
    this.hud.setJournalHtml(`${this.story.getJournalHtml()}<hr class="journal-divider">${this.achievements.getJournalHtml()}`);
  }

  private updateAchievementBadge(): void {
    const el = document.getElementById('achievements-badge');
    if (!el) return;
    const { unlocked, total } = this.achievements.getProgress();
    el.textContent = `🏅 ${unlocked}/${total}`;
  }

  private notifyLootRarity(item: ItemInstance): void {
    const rarity = normalizeRarity(item.rarity);
    const idx = RARITIES.indexOf(rarity);
    if (idx >= RARITIES.indexOf('legendary')) this.bus.emit('loot_legendary');
    if (rarity === 'mythical') this.bus.emit('loot_mythical');
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    document.getElementById('pause-menu')?.classList.toggle('open', paused);
  }

  private spawnLootDrop(pos: THREE.Vector3, item: ItemInstance): void {
    const geo = new THREE.OctahedronGeometry(0.35, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: getRarityColor(item.rarity),
      emissive: getRarityColor(item.rarity),
      emissiveIntensity: 0.5,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.y += 1;
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.lootDrops.push({ item, mesh, life: 30 });
  }

  private tryCraft(recipeId: string): void {
    const result = this.life.craft(recipeId);
    if (!result.ok) {
      this.hud.showInteractMessage(result.message);
      return;
    }
    const craftBonus = 1 + this.upgrades.getCraftBonus();
    if (result.recipe?.healAmount) this.player.heal(Math.floor(result.recipe.healAmount * craftBonus));
    if (result.recipe?.manaAmount) {
      this.player.mana = Math.min(this.player.maxMana, this.player.mana + Math.floor(result.recipe.manaAmount * craftBonus));
    }
    if (result.recipe?.goldCost) this.player.gold += Math.floor(result.recipe.goldCost * craftBonus);
    if (result.recipe?.buffId && result.recipe.buffDuration) {
      this.upgrades.applyBuff({
        id: result.recipe.buffId,
        name: result.recipe.name,
        damageMult: result.recipe.damageMult,
        speedMult: result.recipe.speedMult,
        regen: result.recipe.regen,
      }, result.recipe.buffDuration);
    }
    this.upgrades.addLifeXp('craft', 1);
    this.bus.emit('item_crafted');
    this.hud.showInteractMessage(result.message);
    this.hud.renderLifePanel(this.life);
    this.audio.playLoot();
    this.saveTimer = 8;
  }

  private tryUpgrade(type: 'attr' | 'perk', id: string): void {
    if (type === 'attr') {
      if (!this.player.upgradeAttribute(id as keyof typeof this.player.attributes)) {
        this.hud.showInteractMessage('Need a skill point.');
        return;
      }
      this.hud.showInteractMessage(`Upgraded ${id.toUpperCase()}!`);
    } else {
      if (!this.upgrades.canBuyPerk(id, this.player.skillPoints, this.player.level)) {
        this.hud.showInteractMessage('Cannot unlock that perk yet.');
        return;
      }
      if (!this.player.spendSkillPoint()) return;
      this.upgrades.buyPerk(id);
      this.hud.showInteractMessage(`Unlocked perk: ${id.replace('_', ' ')}!`);
    }
    this.hud.renderUpgradePanel(this.player, this.upgrades);
    this.audio.playLevelUp();
    this.saveTimer = 8;
  }

  private rebindControl(action: ControlAction, code: string): void {
    const bindings = normalizeKeyBindings(this.settings.keyBindings);
    for (const id of Object.keys(bindings) as ControlAction[]) {
      bindings[id] = bindings[id].filter((key) => key !== code);
      if (bindings[id].length === 0) bindings[id] = ['Unassigned'];
    }
    bindings[action] = action === 'attack' && code !== 'Mouse0' ? ['Mouse0', code] : [code];
    this.applyControlBindings(bindings);
    this.hud.showInteractMessage(`Control updated: ${code.replace(/^Key|^Digit/, '')}`);
  }

  private resetControls(): void {
    this.applyControlBindings(normalizeKeyBindings(DEFAULT_KEY_BINDINGS));
    this.hud.showInteractMessage('Controls reset to defaults.');
  }

  private applyControlBindings(bindings: KeyBindings): void {
    this.settings.keyBindings = normalizeKeyBindings(bindings);
    SaveManager.saveSettings(this.settings);
    this.input.setKeyBindings(this.settings.keyBindings);
    this.hud.setControlBindings(this.settings.keyBindings);
  }

  private tryInteract(): void {
    if (this.interactCooldown > 0) return;

    for (const shrine of this.world.interactables.shrines) {
      if (shrine.position.distanceTo(this.player.position) < 4) {
        if ((this.life.materials.herb ?? 0) >= 2) {
          this.interactCooldown = 2;
          this.life.materials.herb = (this.life.materials.herb ?? 2) - 2;
          this.upgrades.applyBuff({
            id: 'shrine_bless',
            name: 'Starlit Blessing',
            damageMult: 1.12,
            regen: 1.5,
          }, 90);
          this.activities.blessShrine();
          this.player.heal(30);
          this.screenFx.flashHeal();
          this.hud.showInteractMessage('The shrine accepts your offering. Blessed!');
          return;
        }
        this.hud.showInteractMessage('Offer 2 herbs at the shrine (press E).');
        return;
      }
    }

    const chest = this.world.interactables.tryOpenChest(this.player.position);
    if (chest) {
      this.interactCooldown = 0.5;
      this.bus.emit('chest_opened');
      for (const item of chest.loot) {
        this.player.addItem(item);
        this.hud.addLootNotification(item);
      }
      this.particles.emitLoot(chest.position, 0xffd700);
      this.audio.playLoot();
      this.hud.showInteractMessage('Chest opened!');
      return;
    }
    const npc = this.world.interactables.tryTalkNpc(this.player.position);
    if (npc) {
      this.interactCooldown = 1;
      this.bus.emit('npc_talk', npc.name);
      this.hud.showDialogue(npc.name, npc.dialogue);
      if (npc.name.includes('Sela')) {
        if (this.player.gold >= 10) {
          this.player.gold -= 10;
          this.player.heal(50);
          this.player.mana = this.player.maxMana;
          this.hud.showInteractMessage('Innkeeper Sela restored you for 10 gold.');
        } else {
          this.hud.showInteractMessage('Need 10 gold to rest at the inn.');
        }
      } else if (npc.name.includes('Theron')) {
        const sellIds: MaterialId[] = ['herb', 'fish', 'ore', 'hide', 'feather', 'wood', 'cooked_meat'];
        let earned = 0;
        for (const id of sellIds) {
          const count = this.life.materials[id] ?? 0;
          if (count > 0) earned += this.life.sellMaterial(id, count);
        }
        if (earned > 0) {
          this.player.gold += earned;
          this.hud.showInteractMessage(`Theron bought your goods for ${earned} gold.`);
        } else {
          this.hud.showInteractMessage('Nothing to sell — gather herbs, fish, or ore first.');
        }
      } else {
        this.player.heal(8);
        this.hud.showInteractMessage(`${npc.name} shares a warm meal (+8 HP).`);
      }
    }
  }

  private toObjectiveWorldMarker(marker: { x: number; z: number } | null): { x: number; z: number } | null {
    if (!marker) return null;
    return {
      x: marker.x + this.objectiveOrigin.x,
      z: marker.z + this.objectiveOrigin.z,
    };
  }

  private tryAutoStartObjective(
    rawMarker: { x: number; z: number } | null,
    worldMarker: { x: number; z: number } | null,
    activeQuest: CampaignQuest | null,
  ): void {
    if (!rawMarker || !worldMarker || !activeQuest || this.objectiveArrivalCooldown > 0) return;
    const objective = activeQuest.objectives.find((o) =>
      !o.done && o.marker &&
      Math.abs(o.marker.x - rawMarker.x) < 0.01 &&
      Math.abs(o.marker.z - rawMarker.z) < 0.01,
    );
    if (!objective) return;

    const dist = Math.hypot(this.player.position.x - worldMarker.x, this.player.position.z - worldMarker.z);
    if (dist > this.getObjectiveArrivalRadius(objective.type)) return;

    const key = `${activeQuest.id}:${objective.id}:${objective.current}`;
    const pulseAction = (seconds: number, message: string) => {
      this.autoObjectiveActionTimer = Math.max(this.autoObjectiveActionTimer, seconds);
      this.objectiveArrivalCooldown = seconds + 0.35;
      this.hud.showInteractMessage(message);
    };

    switch (objective.type) {
      case 'talk':
        this.tryInteract();
        this.bus.emit('npc_talk', 'Captain Elara');
        this.hud.showInteractMessage('Objective reached - conversation started.');
        this.objectiveArrivalCooldown = 2.2;
        break;
      case 'chest':
      case 'bless':
        this.tryInteract();
        this.objectiveArrivalCooldown = 2.2;
        break;
      case 'craft':
        if (this.lastPassiveObjectiveKey !== key) {
          this.hud.toggleLifePanel(true);
          this.hud.showInteractMessage('Workbench reached - crafting panel opened.');
          this.lastPassiveObjectiveKey = key;
        }
        this.objectiveArrivalCooldown = 6;
        break;
      case 'fish':
        if (this.lastPassiveObjectiveKey !== key) {
          this.bus.emit('fish_caught', 1);
          this.particles.emitMagic(this.player.position, 0x66ccff);
          this.lastPassiveObjectiveKey = key;
        }
        pulseAction(3.2, 'Fishing spot reached - casting line.');
        break;
      case 'mine':
        if (this.lastPassiveObjectiveKey !== key) {
          this.bus.emit('ore_mined', 1);
          this.particles.emitMagic(this.player.position, 0xffaa66);
          this.lastPassiveObjectiveKey = key;
        }
        pulseAction(2.7, 'Crystal vein reached - mining started.');
        break;
      case 'arena':
        if (!this.activities.arena.active) {
          this.activities.startArena();
          this.bus.emit('arena_start');
          this.hud.showInteractMessage('Arena objective reached - trial started.');
        }
        this.objectiveArrivalCooldown = 5;
        break;
      case 'visit_cave':
      case 'visit_ruin':
      case 'visit_shrine':
        this.bus.emit(objective.type);
        this.hud.showInteractMessage('Objective location discovered.');
        this.objectiveArrivalCooldown = 2.5;
        break;
      case 'boss':
        this.startBossObjective(worldMarker);
        this.objectiveArrivalCooldown = 8;
        break;
      default:
        pulseAction(1.2, 'Objective reached.');
        break;
    }
  }

  private getObjectiveArrivalRadius(type: CampaignObjective['type']): number {
    if (type === 'arena' || type === 'boss') return 10;
    if (type === 'fish' || type === 'mine') return 8;
    if (type === 'visit_cave' || type === 'visit_ruin' || type === 'visit_shrine') return 8;
    if (type === 'bless' || type === 'craft' || type === 'talk' || type === 'chest') return 7;
    return 6;
  }

  private buildObjectiveGuide(
    marker: { x: number; z: number } | null,
    activeQuest: CampaignQuest | null,
    activityPois: MapPOI[],
  ): ObjectiveGuide {
    const objective = activeQuest?.objectives.find((o) => !o.done) ?? null;
    const action = objective ? this.getObjectiveActionText(objective.type) : 'Explore, loot, craft, and clear events';
    const nearbyActivity = this.getNearestActivityGuide(activityPois);

    if (!marker || !objective) {
      return {
        direction: marker ? 'Marked' : 'Open',
        distance: marker ? 'on map' : 'worldwide',
        action,
        autoStart: this.getObjectiveStartText(objective?.type),
        nearbyActivity,
      };
    }

    const dx = marker.x - this.player.position.x;
    const dz = marker.z - this.player.position.z;
    const dist = Math.hypot(dx, dz);
    const radius = this.getObjectiveArrivalRadius(objective.type);
    return {
      direction: this.getDirectionLabel(dx, dz),
      distance: dist <= radius ? 'at objective' : `${Math.round(dist)}m`,
      action,
      autoStart: dist <= radius ? 'Starting now' : `Auto within ${radius}m`,
      nearbyActivity,
    };
  }

  private getObjectiveActionText(type: CampaignObjective['type']): string {
    const actions: Partial<Record<CampaignObjective['type'], string>> = {
      talk: 'Reach the NPC and talk',
      chest: 'Open the marked chest',
      fish: 'Reach water and hold F',
      gather: 'Gather glowing resources',
      mine: 'Reach crystals and hold F',
      craft: 'Use the workbench',
      arena: 'Enter the arena trial',
      bless: 'Offer herbs at the shrine',
      boss: 'Enter the boss arena',
      visit_cave: 'Step into the cave',
      visit_ruin: 'Explore the ruins',
      visit_shrine: 'Reach the shrine',
      weather_rain: 'Gather while it rains',
      weather_snow: 'Fish during snowfall',
      weather_storm: 'Survive a storm',
      night_kill: 'Hunt enemies at night',
      kill: 'Defeat enemies anywhere',
      elite: 'Track elite foes',
      level: 'Earn XP from activities',
    };
    return actions[type] ?? 'Follow the marker';
  }

  private getObjectiveStartText(type?: CampaignObjective['type']): string {
    if (!type) return 'Choose any activity';
    if (type === 'weather_rain' || type === 'weather_snow' || type === 'weather_storm') return 'Weather based';
    if (type === 'kill' || type === 'elite' || type === 'level' || type === 'night_kill') return 'Progress anywhere';
    return 'Auto at marker';
  }

  private getNearestActivityGuide(activityPois: MapPOI[]): string {
    const labels: Partial<Record<MapPOI['type'], string>> = {
      fish: 'Fishing',
      gather: 'Gather',
      wildlife: 'Hunt',
      chest: 'Treasure',
      puzzle: 'Rift trial',
      mountain: 'Spire',
      ruin: 'Arena',
      cave: 'Cave',
      dungeon: 'Dungeon',
      boss: 'World event',
      shrine: 'Shrine',
    };
    let best: { label: string; dx: number; dz: number; dist: number } | null = null;
    for (const poi of activityPois) {
      const label = labels[poi.type];
      if (!label) continue;
      const dx = poi.x - this.player.position.x;
      const dz = poi.z - this.player.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3) continue;
      if (!best || dist < best.dist) best = { label, dx, dz, dist };
    }
    if (!best) return 'Explore for events';
    return `${best.label} ${this.getDirectionLabel(best.dx, best.dz)} ${Math.round(best.dist)}m`;
  }

  private getDirectionLabel(dx: number, dz: number): string {
    const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const angle = Math.atan2(dx, -dz);
    const index = Math.round(angle / (Math.PI / 4) + labels.length) % labels.length;
    return labels[index];
  }

  private startBossObjective(marker: { x: number; z: number }): void {
    const activeBoss = this.enemyManager.getAlive().some((e) =>
      e.tier === 'boss' && Math.hypot(e.position.x - marker.x, e.position.z - marker.z) < 40,
    );
    if (activeBoss || this.bossObjectiveSpawned) return;
    const y = this.world.getHeightAt(marker.x, marker.z);
    const boss = this.enemyManager.spawn(
      'corrupted_titan',
      marker.x,
      marker.z,
      y,
      Math.max(this.player.level + 4, 8),
    );
    this.bossObjectiveSpawned = true;
    this.hud.showBossIntro(boss.name);
    this.hud.showInteractMessage('Crown Peak awakens - boss event started.');
    this.particles.emitMagic(boss.position, 0xff3366);
    this.camera.startBossCinematic(2);
    this.audio.playBossRoar();
  }

  private updateRoamingEvent(dt: number, h: (x: number, z: number) => number): void {
    if (!this.roamingEvent) {
      this.roamingEventTimer -= dt;
      if (this.roamingEventTimer <= 0) this.spawnRoamingEvent(h);
      return;
    }

    const event = this.roamingEvent;
    if (event.state === 'cooldown') {
      event.timer -= dt;
      if (event.timer <= 0) {
        this.roamingEvent = null;
        this.roamingEventTimer = 38 + Math.random() * 35;
      }
      return;
    }

    const dist = Math.hypot(
      event.center.x - this.player.position.x,
      event.center.z - this.player.position.z,
    );
    if (event.state === 'available' && dist < 10) {
      event.state = 'active';
      event.timer = 70;
      event.spawnCooldown = 0.1;
      this.hud.showInteractMessage(`${event.title} started - clear the enemies!`);
      this.particles.emitMagic(event.center, 0xff66cc);
    }

    if (event.state !== 'active') return;
    event.timer = Math.max(0, event.timer - dt);
    event.spawnCooldown -= dt;
    if (event.spawnCooldown <= 0 && event.spawned < event.targetKills) {
      event.spawnCooldown = 0.8 + Math.random() * 0.8;
      event.spawned++;
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.random() * 6;
      const sx = event.center.x + Math.cos(angle) * radius;
      const sz = event.center.z + Math.sin(angle) * radius;
      const pool = event.spawned === event.targetKills && this.player.level >= 6
        ? ['mage', 'dungeon_golem', 'arcane_sentinel']
        : ['void_spawn', 'goblin', 'skeleton', 'spider', 'zombie'];
      const type = pool[Math.floor(Math.random() * pool.length)];
      this.enemyManager.spawn(type, sx, sz, h(sx, sz), this.player.level + Math.floor(event.spawned / 2));
    }

    if (event.kills >= event.targetKills && !event.rewardGiven) {
      this.completeRoamingEvent(event);
    } else if (event.timer <= 0 && event.spawned >= event.targetKills && event.kills > 0) {
      this.hud.showInteractMessage(`${event.title} remains active - finish the remaining enemies.`);
      event.timer = 35;
    }
  }

  private spawnRoamingEvent(h: (x: number, z: number) => number): void {
    if (this.activities.arena.active || this.activities.spire.active || this.activities.rift.active) {
      this.roamingEventTimer = 30;
      return;
    }
    const angle = Math.random() * Math.PI * 2;
    const dist = 34 + Math.random() * 38;
    const x = this.player.position.x + Math.cos(angle) * dist;
    const z = this.player.position.z + Math.sin(angle) * dist;
    const titles = ['Lost Cache', 'Void Skirmish', 'Relic Disturbance', 'Wandering Threat'];
    const title = titles[Math.floor(Math.random() * titles.length)];
    this.roamingEvent = {
      id: `event_${Date.now().toString(36)}`,
      title,
      state: 'available',
      center: new THREE.Vector3(x, h(x, z), z),
      targetKills: 4 + Math.min(5, Math.floor(this.player.level / 3)) + Math.floor(Math.random() * 2),
      kills: 0,
      spawned: 0,
      spawnCooldown: 0,
      timer: 120,
      rewardGiven: false,
    };
    this.hud.showInteractMessage(`${title} discovered - follow the map marker.`);
    this.particles.emitMagic(this.roamingEvent.center, 0x00ffcc);
  }

  private registerRoamingEventKill(position: THREE.Vector3): void {
    const event = this.roamingEvent;
    if (!event || event.state !== 'active') return;
    const dist = Math.hypot(position.x - event.center.x, position.z - event.center.z);
    if (dist > 28) return;
    event.kills = Math.min(event.targetKills, event.kills + 1);
    if (event.kills < event.targetKills) {
      this.hud.showInteractMessage(`${event.title}: ${event.kills}/${event.targetKills} cleared`);
    }
  }

  private completeRoamingEvent(event: RoamingWorldEvent): void {
    event.rewardGiven = true;
    event.state = 'cooldown';
    event.timer = 4;
    const gold = 45 + this.player.level * 9;
    this.player.gold += gold;
    this.life.materials = addMaterial(this.life.materials, 'ancient_relic', 1);
    const reward = ItemGenerator.generate(this.player.level + 1, this.player.level >= 10 ? 'epic' : 'rare');
    this.spawnLootDrop(event.center, reward);
    this.hud.showInteractMessage(`${event.title} cleared! +${gold} gold, relic, and loot.`);
    this.particles.emitLevelUp(event.center);
    this.audio.playQuestComplete();
  }

  private getRoamingEventPOI(): MapPOI | null {
    if (!this.roamingEvent || this.roamingEvent.state === 'cooldown') return null;
    return {
      type: this.roamingEvent.state === 'active' ? 'boss' : 'puzzle',
      x: this.roamingEvent.center.x,
      z: this.roamingEvent.center.z,
      meta: this.roamingEvent.state === 'active'
        ? `${this.roamingEvent.title} ${this.roamingEvent.kills}/${this.roamingEvent.targetKills}`
        : this.roamingEvent.title,
    };
  }

  private animate = (): void => {
    if (!this.running) return;
    requestAnimationFrame(this.animate);
    let dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.paused) return;
    if (this.hud.isChatOpen() || this.hud.isTypingInUI()) {
      this.postFX.render(this.scene, this.camera.getCamera(), this.clock.elapsedTime);
      return;
    }

    dt *= this.combat.timeScale;
    this.playTime += dt;
    if (this.interactCooldown > 0) this.interactCooldown -= dt;
    if (this.objectiveArrivalCooldown > 0) this.objectiveArrivalCooldown -= dt;
    if (this.autoObjectiveActionTimer > 0) this.autoObjectiveActionTimer -= dt;

    const input = this.input.poll();
    if (input.pause) {
      this.setPaused(!this.paused);
      return;
    }

    this.camera.rotate(input.cameraRotate);
    this.camera.zoom(input.cameraZoom * 2);

    const biome = this.world.getBiomeAtPlayer(this.player.position.x, this.player.position.z);
    if (biome.id !== this.lastBiomeId) {
      this.lastBiomeId = biome.id;
      this.bus.emit('biome_entered', biome.id);
      this.postFX.setBiomeGrade(biome.groundColor, biome.fogColor);
    }
    this.fogColor.setHex(biome.fogColor);
    this.postFX.setFogColor(this.fogColor, 0.018);

    const h = (x: number, z: number) => this.world.getHeightAt(x, z);

    let moveX = input.moveX;
    let moveZ = input.moveZ;
    if (moveX !== 0 || moveZ !== 0) {
      const camYaw = Math.atan2(
        this.camera.getCamera().position.x - this.player.position.x,
        this.camera.getCamera().position.z - this.player.position.z,
      );
      const cos = Math.cos(camYaw);
      const sin = Math.sin(camYaw);
      const mx = input.moveX;
      const mz = input.moveZ;
      moveX = mx * cos + mz * sin;
      moveZ = -mx * sin + mz * cos;
    }

    this.world.update(this.player.position.x, this.player.position.z);
    // Colliders can explode in count; filter to a radius near the player.
    this.physicsColliders = this.world.getCollidersNear(this.player.position.x, this.player.position.z, this.perf.colliderRadius);
    this.player.setColliders(this.physicsColliders);
    this.player.setPhysicsSubSteps(this.perf.physicsSubSteps);

    const weatherPlay = this.weather.getGameplay();
    this.player.applyMovement(moveX, moveZ, input.sprint, dt, h, weatherPlay.moveSpeed);
    if (input.dodge) {
      if (this.player.dodge()) {
        this.audio.playDodge();
        this.particles.emitMagic(this.player.position, 0xaaccff);
      }
    }
    if (input.vault && this.player.vaultLeap()) {
      this.particles.emitMagic(this.player.position, 0x88ffcc);
    }
    if (input.inventoryPanel) this.hud.toggleInventory();
    if (input.journalPanel) this.hud.toggleJournal();
    if (input.worldMapPanel) this.hud.toggleWorldMap();
    if (input.craftPanel) this.hud.toggleLifePanel();
    if (input.upgradePanel) this.hud.toggleUpgradePanel();
    if (input.interact) this.tryInteract();
    const rawQuestMarker = this.story.getQuestMarker();
    const questMarker = this.toObjectiveWorldMarker(rawQuestMarker);
    const activeQuest = this.story.getActiveQuest();
    this.tryAutoStartObjective(rawQuestMarker, questMarker, activeQuest);
    const objectiveAutoAction = this.autoObjectiveActionTimer > 0;
    const actUpdate = this.activities.update(
      dt,
      this.player.position.x,
      this.player.position.z,
      h,
      input.action || objectiveAutoAction,
      this.player.level,
    );
    const lifeUpdate = this.life.update(
      dt,
      this.player.position.x,
      this.player.position.z,
      h,
      this.dayNight.isNight(),
      input.action || objectiveAutoAction,
      weatherPlay.fishingBonus,
    );
    const dungeonUpdate = this.dungeons.update(
      dt,
      this.player.position,
      h,
      input.interact || input.action || objectiveAutoAction,
      this.player.level,
    );
    for (const req of dungeonUpdate.spawnRequests) {
      this.enemyManager.spawn(req.type, req.x, req.z, h(req.x, req.z), this.player.level + req.levelBoost);
    }
    this.updateRoamingEvent(dt, h);
    if (input.attack) {
      const huntMsg = this.life.tryHuntOnAttack(this.player.position.x, this.player.position.z);
      if (huntMsg) this.hud.showInteractMessage(huntMsg);
      else if (this.player.attack()) {
        this.audio.playSwing();
        this.combatMusicTimer = 4;
        this.combat.processPlayerAttack(this.player, this.enemyManager.getAlive());
        this.particles.emitMagic(this.player.position);
      }
    }
    if (input.skill1) this.useSkill(0);
    if (input.skill2) this.useSkill(1);
    if (input.skill3) this.useSkill(2);
    if (input.skill4) this.useSkill(3);

    this.player.update(dt, h);
    this.syncMultiplayer(dt, h);
    this.story.updateLevel(this.player.level);
    this.world.checkVisitTriggers(this.player.position.x, this.player.position.z, this.bus);

    if (this.activities.arena.active) {
      const alive = this.enemyManager.getAlive().length;
      if (alive < 2 && this.activities.arena.enemiesToSpawn > 0) {
        const c = this.activities.arena.center;
        const angle = Math.random() * Math.PI * 2;
        const sx = c.x + Math.cos(angle) * 7;
        const sz = c.z + Math.sin(angle) * 7;
        this.enemyManager.spawn('void_spawn', sx, sz, h(sx, sz), this.player.level + this.activities.arena.wave);
        this.activities.arena.enemiesToSpawn--;
      }
    }
    if (this.activities.spire.active) {
      const alive = this.enemyManager.getAlive().length;
      if (alive < 3 && this.activities.spire.enemiesToSpawn > 0) {
        const c = this.activities.spire.center;
        const angle = Math.random() * Math.PI * 2;
        const sx = c.x + Math.cos(angle) * 8;
        const sz = c.z + Math.sin(angle) * 8;
        const type = this.activities.spire.floor >= 5 ? 'void_abomination' : 'void_spawn';
        this.enemyManager.spawn(type, sx, sz, h(sx, sz), this.player.level + this.activities.spire.floor * 2);
        this.activities.spire.enemiesToSpawn--;
      }
    }
    if (this.activities.rift.active) {
      const alive = this.enemyManager.getAlive().length;
      if (alive < 4 && this.activities.rift.enemiesToSpawn > 0) {
        const c = this.activities.rift.center;
        const angle = Math.random() * Math.PI * 2;
        const sx = c.x + Math.cos(angle) * (5 + Math.random() * 5);
        const sz = c.z + Math.sin(angle) * (5 + Math.random() * 5);
        const pool = this.activities.rift.tier >= 3
          ? ['void_abomination', 'mage', 'dungeon_golem']
          : this.activities.rift.tier >= 2
            ? ['skeleton', 'zombie', 'mage', 'spider']
            : ['goblin', 'skeleton', 'spider'];
        const type = pool[Math.floor(Math.random() * pool.length)];
        this.enemyManager.spawn(type, sx, sz, h(sx, sz), this.player.level + this.activities.rift.tier);
        this.activities.rift.enemiesToSpawn--;
      }
    }

    this.enemyManager.update(
      dt, this.player.position, h, biome, this.player.level,
      this.dayNight.isNight(), this.weather.getGameplay().enemyAggro,
    );
    this.combat.update(dt);
    if (this.combatMusicTimer > 0) this.combatMusicTimer -= dt;
    this.achievements.checkCombo(this.player.combo);
    this.achievements.checkKillStreak(this.combat.killStreak);
    this.achievements.checkGold(this.player.gold);
    this.achievements.checkInventory(this.player.inventory.length);
    this.achievements.checkAttributes(this.player.attributes);

    for (const enemy of this.enemyManager.getAlive()) {
      this.combat.processEnemyAttack(enemy, this.player);
    }

    if (this.player.state === 'dead') {
      this.hud.showDeathScreen(this.player.deaths, this.player.level);
      setTimeout(() => {
        this.player.respawn(this.player.position.x, this.player.position.z, h);
        this.hud.hideDeathScreen();
      }, 2800);
    }

    this.weather.update(dt, this.player.position, biome.id, this.dayNight.isNight());
    this.world.interactables.update(dt);
    const dayFactor = this.dayNight.update(dt);
    this.nightFactor = 1 - dayFactor;
    this.dayNight.followTarget(this.player.position);
    const wPlay = this.weather.getGameplay();
    const isStorm = this.weather.current === 'storm' || this.weather.current === 'blizzard';
    this.ambientLife.update(
      dt, this.player.position.x, this.player.position.z,
      this.nightFactor, this.clock.elapsedTime, this.weather.current, isStorm,
    );

    if (this.weather.current === 'storm' && this.weather.intensity > 0.45) {
      this.stormSurvivalTimer += dt;
      if (this.stormSurvivalTimer > 22 && this.lastWeather !== 'storm_done') {
        this.bus.emit('weather_storm');
        this.lastWeather = 'storm_done';
      }
    } else if (this.weather.current !== 'storm') {
      this.lastWeather = this.weather.current;
    }

    const lightning = this.weather.consumeLightningFlash();
    if (lightning > 0.5) this.screenFx.flashLightning();

    const weatherDarken = this.weather.getSkyDarken();
    this.skyColor.copy(this.dayNight.getSkyColor())
      .lerp(new THREE.Color(biome.fogColor), 0.2)
      .lerp(new THREE.Color(0x24354f), weatherDarken * 0.25);
    this.scene.background = this.skyColor;
    this.playerLantern.position.set(
      this.player.position.x,
      this.player.position.y + 4.5,
      this.player.position.z,
    );
    this.visibilityFill.intensity = 0.95 + this.nightFactor * 0.38 + weatherDarken * 0.24;
    this.playerLantern.intensity = 1.45 + this.nightFactor * 2.1 + weatherDarken * 0.85;
    this.playerLantern.distance = 36 + this.nightFactor * 14 + weatherDarken * 8;
    const visMult = wPlay.visibility;
    this.sceneFog.density = Math.min(
      0.009,
      biome.fogDensity * this.weather.getFogMultiplier() * 0.12 * Math.max(0.35, 1.35 - visMult),
    );
    this.sceneFog.color.copy(this.dayNight.getFogColor()).lerp(this.fogColor.setHex(biome.fogColor), 0.28);
    this.postFX.setFogColor(this.sceneFog.color, 0.018);
    this.hud.updateTimeDisplay(this.dayNight.getClockString(), this.dayNight.getPeriod());
    const wClass = `w-${this.weather.current.replace(/_/g, '-')}`;
    this.hud.updateWeatherDisplay(wPlay.icon, wPlay.label, wClass);

    this.grass.update(
      dt,
      this.player.position.x,
      this.player.position.z,
      h,
      biome.groundColor,
      this.perf.grassUpdateInterval,
    );

    this.particles.update(dt);
    this.damageNumbers.update(dt);
    this.updateLootDrops(dt);

    const nearChest = this.world.interactables.chests.some(
      (c) => !c.opened && c.position.distanceTo(this.player.position) < 3,
    );
    const nearNpc = this.world.interactables.npcs.some(
      (n) => n.position.distanceTo(this.player.position) < 3.5,
    );
    const nearShrine = this.world.interactables.shrines.some(
      (s) => s.position.distanceTo(this.player.position) < 4,
    );
    const baseHint = nearShrine ? 'Press E to bless shrine (2 herbs)'
      : nearChest || nearNpc ? 'Press E to interact' : '';
    const actionHint = dungeonUpdate.hint || actUpdate.hint || lifeUpdate.hint;
    this.hud.setActionHint(baseHint, actionHint);
    const actPct = Math.max(actUpdate.miningPct, lifeUpdate.fishingPct);
    const actLabel = actUpdate.miningPct > 0 ? 'Mining' : lifeUpdate.fishingPct > 0 ? 'Fishing' : '';
    this.hud.updateLifeHud(this.life, actPct, actLabel, this.upgrades.getActiveBuffLabels());
    this.screenFx.setLowHealth(this.player.health / this.player.maxHealth < 0.25);

    const roamingPoi = this.getRoamingEventPOI();
    const lifePois = [
      ...this.life.getMapPOIs(),
      ...this.activities.getMapPOIs(),
      ...dungeonUpdate.pois,
      ...(roamingPoi ? [roamingPoi] : []),
    ];
    const mapData = this.world.getMinimapSnapshot(
      this.player.position.x,
      this.player.position.z,
      questMarker,
      this.enemyManager.getAlive().map((e) => ({
        type: 'enemy' as const,
        x: e.position.x,
        z: e.position.z,
      })),
      lifePois,
    );
    const mapReq = this.hud.getWorldMapRequest(this.player.position.x, this.player.position.z);
    const worldMapData = mapReq
      ? this.world.getWorldMapSnapshot(
        mapReq.centerX,
        mapReq.centerZ,
        this.player.position.x,
        this.player.position.z,
        mapReq.range,
        mapReq.step,
        questMarker,
        this.enemyManager.getAlive().map((e) => ({
          type: 'enemy' as const,
          x: e.position.x,
          z: e.position.z,
        })),
        lifePois,
      )
      : undefined;

    this.questBeacon.setTarget(
      questMarker?.x ?? 0,
      questMarker?.z ?? 0,
      h(questMarker?.x ?? 0, questMarker?.z ?? 0),
      !!questMarker,
    );
    this.questBeacon.update(dt, this.clock.elapsedTime);
    this.hud.updateObjectiveCompass(
      this.player.position.x,
      this.player.position.z,
      this.camera.getYaw(),
      questMarker,
      activeQuest?.title,
    );
    this.screenFx.setLowHealth(this.player.health / this.player.maxHealth < 0.28);

    if (moveX !== 0 || moveZ !== 0) {
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = input.sprint ? 0.28 : 0.38;
        this.particles.emitFootstep(this.player.position);
        this.audio.playFootstep();
      }
    }

    this.hud.update(this.player, biome, mapData, worldMapData);
    this.hud.setStoryTracker(this.story.getHudSummary(), this.buildObjectiveGuide(questMarker, activeQuest, lifePois));

    this.camera.setTarget(this.player.position);
    this.camera.setScreenShake(this.combat.screenShake);
    this.camera.update(dt);

    const projector = (pos: THREE.Vector3) => {
      const p = pos.clone().project(this.camera.getCamera());
      return {
        x: (p.x * 0.5 + 0.5) * window.innerWidth,
        y: (-p.y * 0.5 + 0.5) * window.innerHeight,
      };
    };
    this.damageNumbers.setProjector(projector);
    this.nameplates?.setProjector(projector);
    this.nameplates?.syncEnemies(this.enemyManager.getAlive(), this.player.position);
    this.nameplates?.update();

    const musicCtx = this.buildMusicContext(biome.musicMood);
    if (musicCtx.bossNearby && !this.bossRoared) {
      this.bossRoared = true;
      this.audio.playBossRoar();
    } else if (!musicCtx.bossNearby) {
      this.bossRoared = false;
    }
    this.audio.updateMusic(musicCtx, dt);
    this.audio.updateEnvironment(biome.musicMood, this.weather.current, this.weather.intensity);
    this.postFX.render(this.scene, this.camera.getCamera(), this.clock.elapsedTime);

    this.saveTimer += dt;
    if (this.saveTimer >= 8) {
      this.saveTimer = 0;
      this.autoSave();
    }
  };

  private buildMusicContext(biomeMood: string): MusicContext {
    const enemies = this.enemyManager.getAlive();
    let nearestEnemy = Infinity;
    let enemiesChasing = 0;
    let enemiesAttacking = 0;
    let bossNearby = false;
    let eliteNearby = false;

    for (const e of enemies) {
      const d = this.player.position.distanceTo(e.position);
      if (d < nearestEnemy) nearestEnemy = d;
      if (e.aiState === 'chase') enemiesChasing++;
      if (e.aiState === 'attack') enemiesAttacking++;
      if (e.tier === 'boss' && d < 42) bossNearby = true;
      if (e.tier === 'elite' && d < 28) eliteNearby = true;
    }

    return {
      biomeMood,
      nearestEnemy: enemies.length ? nearestEnemy : 999,
      enemiesChasing,
      enemiesAttacking,
      bossNearby,
      eliteNearby,
      inCombat: this.combatMusicTimer > 0
        || enemiesChasing > 0
        || enemiesAttacking > 0
        || this.player.state === 'attack',
      arenaActive: this.activities.arena.active,
      spireActive: this.activities.spire.active,
      nightFactor: this.nightFactor,
      weather: this.weather.current,
    };
  }

  private useSkill(index: number): void {
    const skills = CLASS_DEFINITIONS[this.player.classId].skills;
    const skill = skills[index];
    if (!skill || !this.player.useSkill(skill.id)) return;
    this.audio.playSkillCast();
    this.combatMusicTimer = 5;
    this.combat.processPlayerAttack(this.player, this.enemyManager.getAlive(), skill.id);
    this.particles.emitMagic(this.player.position, 0xaa88ff);
    if (skill.type === 'ultimate') this.camera.startBossCinematic(1.5);
  }

  private restorePlayerVitals(save: PlayerSaveData): void {
    const armorBonus = save.equipped?.armor ? 8 + (save.equipped.armor.level ?? 0) : 0;
    this.player.maxHealth = save.maxHealth ?? 80 + this.player.attributes.vit * 8 + armorBonus;
    this.player.maxMana = save.maxMana ?? 50 + this.player.attributes.int * 6;
    this.player.health = save.health != null
      ? Math.min(this.player.maxHealth, Math.max(1, save.health))
      : this.player.maxHealth;
    this.player.mana = save.mana != null
      ? Math.min(this.player.maxMana, Math.max(0, save.mana))
      : this.player.maxMana;
  }

  private updateLootDrops(dt: number): void {
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const drop = this.lootDrops[i];
      drop.life -= dt;
      drop.mesh.rotation.y += dt * 2;
      drop.mesh.position.y = this.world.getHeightAt(drop.mesh.position.x, drop.mesh.position.z) + 0.8 +
        Math.sin(Date.now() * 0.003 + i) * 0.15;
      const dist = this.player.position.distanceTo(drop.mesh.position);
      if (dist < 2.5) {
        if (!this.player.inventory.find((it) => it.id === drop.item.id)) {
          this.notifyLootRarity(drop.item);
          this.player.addItem(drop.item);
          this.hud.addLootNotification(drop.item);
          this.audio.playLoot();
          this.achievements.checkInventory(this.player.inventory.length);
        }
        this.scene.remove(drop.mesh);
        drop.mesh.geometry.dispose();
        (drop.mesh.material as THREE.Material).dispose();
        this.lootDrops.splice(i, 1);
        continue;
      }
      if (drop.life <= 0) {
        this.scene.remove(drop.mesh);
        this.lootDrops.splice(i, 1);
      }
    }
  }

  private autoSave(): void {
    const data: PlayerSaveData = {
      saveVersion: 2,
      savedAt: Date.now(),
      name: this.displayName,
      classId: this.player.classId,
      level: this.player.level,
      xp: this.player.xp,
      xpToNext: this.player.xpToNext,
      attributes: this.player.attributes,
      skillPoints: this.player.skillPoints,
      unlockedSkills: [],
      position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
      velocity: { x: this.player.velocity.x, y: this.player.velocity.y, z: this.player.velocity.z },
      rotation: this.player.rotation,
      worldSeed: this.worldSeed,
      inventory: this.player.inventory,
      equipped: this.player.equipped,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      mana: this.player.mana,
      maxMana: this.player.maxMana,
      deaths: this.player.deaths,
      gold: this.player.gold,
      playTimeSeconds: this.playTime,
      achievements: this.achievements.export(),
      achievementState: this.achievements.toSave(),
      cosmetics: {},
      story: this.story.toSave(),
      lifeSkills: this.life.toSave(),
      upgrades: this.upgrades.toSave(),
      activities: this.activities.toSave(),
      dungeons: this.dungeons.toSave(),
      interactables: this.world.interactables.toSave(),
      dayTime: this.dayNight.time,
    };
    SaveManager.savePlayer(data);
  }

  private getSeed(): number {
    const stored = localStorage.getItem(WORLD_SEED_KEY);
    if (stored) return parseInt(stored, 10);
    const seed = Math.floor(Math.random() * 2147483647);
    localStorage.setItem(WORLD_SEED_KEY, String(seed));
    return seed;
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    applyMobileDocumentClass();
    // Recompute perf (e.g. mobile rotation / dpi changes)
    this.perf = buildPerformanceProfile(this.settings);
    this.renderer.setPixelRatio(this.perf.pixelRatio);
    this.renderer.setSize(w, h);
    this.camera.resize(w / h);
    this.postFX?.applySettings(this.settings, this.perf.postProcessingScale);
    this.postFX?.resize(w, h);
  }

  private syncMultiplayer(dt: number, h: (x: number, z: number) => number): void {
    const head = this.player.position.clone();
    head.y = h(head.x, head.z) + 2.1;
    this.nameplates?.setLocalPlayer(this.displayName, head);

    if (!this.onlineMode || !network.connected) return;

    const anim = this.player.state === 'move' ? 'move'
      : this.player.state === 'attack' ? 'attack'
        : this.player.state === 'dodge' ? 'dodge' : 'idle';

    network.sendPlayerState({
      x: this.player.position.x,
      y: this.player.position.y,
      z: this.player.position.z,
      rotation: this.player.rotation,
      classId: this.player.classId,
      animation: anim,
      level: this.player.level,
    });

    const remoteStates = this.remotes?.update(dt, h) ?? [];
    this.nameplates?.syncRemotes(remoteStates);
    this.hud.setOnlineStatus(true, network.onlineCount);
    this.refreshPlayerList();
  }

  unlockAudio(): void {
    void this.audio.resume();
  }

  saveNow(): void {
    if (
      !this.player || !this.story || !this.life || !this.activities || !this.dungeons ||
      !this.world || !this.dayNight || !this.upgrades || !this.achievements
    ) return;
    this.autoSave();
  }

  dispose(): void {
    this.saveNow();
    this.running = false;
    network.disconnect();
    this.remotes?.dispose();
    this.nameplates?.dispose();
    this.world?.dispose();
    this.life?.worldLife.dispose();
    this.activities?.dispose();
    this.dungeons?.dispose();
    this.scene.remove(this.visibilityFill);
    this.scene.remove(this.playerLantern);
    this.weather?.dispose();
    this.ambientLife?.dispose();
    this.questBeacon?.dispose();
    this.enemyManager?.dispose();
    this.postFX?.dispose();
    this.grass?.dispose();
    this.audio?.dispose();
  }
}

import * as THREE from 'three';
import { WORLD_SEED_KEY } from '../config/constants';
import { CLASS_DEFINITIONS } from '../character/ClassDefinitions';
import { Player } from '../character/Player';
import type { ClassId } from '../config/constants';
import { CombatSystem } from '../combat/CombatSystem';
import { EnemyManager } from '../combat/EnemyManager';
import { IsometricCamera } from './IsometricCamera';
import { InputManager } from './InputManager';
import { WorldManager } from '../world/WorldManager';
import { DayNightCycle } from '../world/DayNightCycle';
import { WeatherSystem } from '../world/WeatherSystem';
import { PostProcessing } from '../render/PostProcessing';
import { ParticleSystem } from '../effects/ParticleSystem';
import { DamageNumberSystem } from '../ui/DamageNumbers';
import { GameHUD } from '../ui/GameHUD';
import { AudioManager } from '../audio/AudioManager';
import { SaveManager, type PlayerSaveData } from '../save/SaveManager';
import { EventBus } from '../utils/EventBus';
import type { ItemInstance } from '../loot/ItemGenerator';
import { RARITY_COLORS } from '../config/constants';
import { StoryCampaign, STORY_CHAPTERS } from '../game/StoryCampaign';
import type { CampaignQuest } from '../game/StoryCampaign';
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
import { addMaterial } from '../life/Materials';

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
  private displayName = 'Adventurer';
  private onlineMode = false;
  private remotes: RemotePlayerManager | null = null;
  private nameplates: NameplateSystem | null = null;
  private ambientLife!: AmbientLife;
  private questBeacon!: QuestBeacon;
  private screenFx!: ScreenEffects;
  private footstepTimer = 0;
  private nightFactor = 1;
  private audio = new AudioManager();
  private settings = SaveManager.loadSettings();
  private perf: PerformanceProfile;
  private playTime = 0;
  private worldSeed: number;
  private lootDrops: { item: ItemInstance; mesh: THREE.Mesh; life: number }[] = [];
  private paused = false;
  private interactCooldown = 0;
  private saveTimer = 0;
  private physicsColliders: THREE.Box3[] = [];
  private fogColor = new THREE.Color();
  private sceneFog = new THREE.FogExp2(0x4a6a78, 0.012);
  private skyColor = new THREE.Color(0x1a2840);

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
    this.renderer.toneMappingExposure = 1.55;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2840);
    this.scene.fog = this.sceneFog;

    this.camera = new IsometricCamera(window.innerWidth / window.innerHeight);
    this.input = new InputManager(canvas);
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
    this.player = new Player(classId);
    if (save && save.classId === classId) {
      this.player.level = save.level;
      this.player.xp = save.xp;
      this.player.xpToNext = save.xpToNext;
      this.player.gold = save.gold;
      this.player.inventory = save.inventory ?? [];
      this.player.attributes = save.attributes;
      this.player.skillPoints = save.skillPoints ?? 0;
      this.player.health = this.player.maxHealth;
      if (!this.onlineMode) this.worldSeed = save.worldSeed ?? this.worldSeed;
    }

    if (!this.onlineMode && !save?.worldSeed) {
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
    this.combat = new CombatSystem(this.bus, this.particles, this.damageNumbers);
    this.hud = new GameHUD();

    if (this.onlineMode) {
      this.remotes = new RemotePlayerManager(this.scene);
      this.nameplates = new NameplateSystem();
    } else if (opts?.online) {
      this.hud.showInteractMessage('Could not join online realm — playing solo.');
    }

    this.story = new StoryCampaign(this.bus);
    this.upgrades = new UpgradeSystem();
    this.upgrades.load(save?.upgrades);
    this.life = new LifeSkillsManager(this.scene, this.bus);
    this.life.loadFromSave(save?.lifeSkills);
    this.activities = new ActivityManager(this.scene, this.bus);
    if (save?.dayTime != null) this.dayNight.time = save.dayTime;
    this.hud.initSkills(classId);
    this.hud.setCraftHandler((id) => this.tryCraft(id));
    this.hud.setUpgradeHandler((type, id) => this.tryUpgrade(type, id));
    this.hud.setChatHandler((msg) => {
      if (this.onlineMode) network.sendChat(msg);
      else this.hud.addChatMessage({ from: this.displayName, message: msg });
    });
    this.hud.setHeroName(displayName, this.onlineMode);
    this.hud.setOnlineStatus(this.onlineMode, network.onlineCount);
    this.hud.setPlayerList([displayName], displayName);
    if (this.onlineMode) this.setupMultiplayer();
    this.hud.setStoryTracker(this.story.getHudSummary());
    this.hud.setJournalHtml(this.story.getJournalHtml());
    this.hud.showChapterIntro(STORY_CHAPTERS[0].title, STORY_CHAPTERS[0].intro);
    this.hud.showTutorial();
    if (!this.nameplates) this.nameplates = new NameplateSystem();

    const startX = save?.position?.x ?? 0;
    const startZ = save?.position?.z ?? 0;
    const h = (x: number, z: number) => this.world.getHeightAt(x, z);
    this.player.position.set(startX, h(startX, startZ), startZ);
    this.player.body.position.copy(this.player.position);
    this.player.upgrades = this.upgrades;
    this.player.displayName = displayName;
    this.scene.add(this.player.mesh);

    // Avoid first-frame hitch: build initial chunks before entering loop.
    this.world.preloadAround(startX, startZ, this.perf.chunkViewDistance >= 3 ? 2 : 1);
    this.life.spawnStarter(startX, startZ, h);
    this.activities.spawnWorldContent(startX, startZ, h);

    this.spawnStarterChest(startX + 8, startZ + 5, h);

    this.audio.init(this.settings);
    await this.audio.resume();

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
      const e = enemy as { name: string; tier: string; position: THREE.Vector3 };
      const items = loot as ItemInstance[];
      this.screenFx.showKillStreak(this.combat.killStreak);
      if (this.activities.arena.active) {
        this.activities.onArenaKill();
        if (this.upgrades.hasPerk('arena_heart')) this.player.heal(5);
      }
      if (e.tier === 'boss') {
        this.camera.startBossCinematic(3);
        this.hud.showBossIntro(e.name);
      }
      for (const item of items) {
        this.spawnLootDrop(e.position, item);
        if (this.settings.autoLoot) {
          this.player.addItem(item);
          this.hud.addLootNotification(item);
          this.audio.playLoot();
        }
      }
      this.audio.playHit();
    });

    this.bus.on('player_hurt', () => {
      this.audio.playHit();
      this.screenFx.flashDamage();
      this.camera.punchZoom(4);
    });
    this.bus.on('combat_hit', (_n: unknown, _dmg: unknown, crit?: unknown) => {
      if (crit) {
        this.audio.playCrit();
        this.screenFx.showCritBanner();
        this.camera.punchZoom(-3);
      }
    });
    this.bus.on('level_up', () => {
      this.hud.showLevelUp();
      this.audio.playLevelUp();
      this.particles.emitLevelUp(this.player.position);
      this.screenFx.flashHeal();
      this.story.updateLevel(this.player.level);
      this.hud.setStoryTracker(this.story.getHudSummary());
      this.hud.setJournalHtml(this.story.getJournalHtml());
    });

    this.bus.on('quest_complete', (q: unknown) => {
      const quest = q as CampaignQuest;
      this.audio.playQuestComplete();
      this.particles.emitLevelUp(this.player.position);
      this.player.gold += quest.rewards.gold;
      if (quest.rewards.skillPoints) this.player.skillPoints += quest.rewards.skillPoints;
      if (this.player.gainXp(quest.rewards.xp)) this.bus.emit('level_up');
      this.hud.showQuestComplete(quest.title);
      this.hud.setStoryTracker(this.story.getHudSummary());
      this.hud.setJournalHtml(this.story.getJournalHtml());
    });

    this.bus.on('chapter_intro', (ch: unknown) => {
      const chapter = ch as { title: string; intro: string };
      this.hud.showChapterIntro(chapter.title, chapter.intro);
    });

    this.bus.on('campaign_complete', () => {
      this.hud.showCampaignComplete();
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
      this.player.gold += w * 20;
      this.hud.showInteractMessage(`Arena cleared wave ${w}! +${w * 20} gold`);
    });
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    document.getElementById('pause-menu')?.classList.toggle('open', paused);
  }

  private spawnLootDrop(pos: THREE.Vector3, item: ItemInstance): void {
    const geo = new THREE.OctahedronGeometry(0.35, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: RARITY_COLORS[item.rarity],
      emissive: RARITY_COLORS[item.rarity],
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
    this.hud.showInteractMessage(result.message);
    this.hud.renderLifePanel(this.life);
    this.audio.playLoot();
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

    const input = this.input.poll();
    if (input.pause) {
      this.setPaused(!this.paused);
      return;
    }

    this.camera.rotate(input.cameraRotate);
    this.camera.zoom(input.cameraZoom * 2);

    const biome = this.world.getBiomeAtPlayer(this.player.position.x, this.player.position.z);
    this.sceneFog.color.setHex(biome.fogColor);
    this.sceneFog.density = biome.fogDensity * this.weather.getFogMultiplier() * 0.45;
    this.fogColor.setHex(biome.fogColor);
    this.postFX.setFogColor(this.fogColor, 0.08);

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

    this.player.applyMovement(moveX, moveZ, input.sprint, dt, h);
    if (input.dodge) {
      if (this.player.dodge()) {
        this.audio.playDodge();
        this.particles.emitMagic(this.player.position, 0xaaccff);
      }
    }
    if (input.vault && this.player.vaultLeap()) {
      this.particles.emitMagic(this.player.position, 0x88ffcc);
    }
    if (input.upgradePanel) this.hud.toggleUpgradePanel();
    if (input.interact) this.tryInteract();
    const actUpdate = this.activities.update(
      dt,
      this.player.position.x,
      this.player.position.z,
      h,
      input.action,
    );
    const lifeUpdate = this.life.update(
      dt,
      this.player.position.x,
      this.player.position.z,
      h,
      this.dayNight.isNight(),
      input.action,
    );
    if (input.attack) {
      const huntMsg = this.life.tryHuntOnAttack(this.player.position.x, this.player.position.z);
      if (huntMsg) this.hud.showInteractMessage(huntMsg);
      else if (this.player.attack()) {
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

    this.enemyManager.update(dt, this.player.position, h, biome, this.player.level);
    this.combat.update(dt);

    for (const enemy of this.enemyManager.getAlive()) {
      this.combat.processEnemyAttack(enemy, this.player);
    }

    if (this.player.state === 'dead') {
      this.hud.showDeathScreen();
      setTimeout(() => {
        this.player.respawn(this.player.position.x, this.player.position.z, h);
        this.hud.hideDeathScreen();
      }, 2500);
    }

    this.weather.update(dt, this.player.position);
    this.world.interactables.update(dt);
    const dayFactor = this.dayNight.update(dt);
    this.nightFactor = 1 - dayFactor;
    this.dayNight.followTarget(this.player.position);
    this.ambientLife.update(dt, this.player.position.x, this.player.position.z, this.nightFactor, this.clock.elapsedTime);
    this.skyColor.copy(this.dayNight.getSkyColor()).lerp(new THREE.Color(biome.fogColor), 0.25);
    this.scene.background = this.skyColor;
    this.sceneFog.color.copy(this.dayNight.getFogColor()).lerp(this.fogColor.setHex(biome.fogColor), 0.35);
    this.hud.updateTimeDisplay(this.dayNight.getClockString(), this.dayNight.getPeriod());

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
    const actionHint = actUpdate.hint || lifeUpdate.hint;
    this.hud.setActionHint(baseHint, actionHint);
    const actPct = Math.max(actUpdate.miningPct, lifeUpdate.fishingPct);
    const actLabel = actUpdate.miningPct > 0 ? 'Mining' : lifeUpdate.fishingPct > 0 ? 'Fishing' : '';
    this.hud.updateLifeHud(this.life, actPct, actLabel, this.upgrades.getActiveBuffLabels());
    this.screenFx.setLowHealth(this.player.health / this.player.maxHealth < 0.25);

    const lifePois = [...this.life.getMapPOIs(), ...this.activities.getMapPOIs()];
    const mapData = this.world.getMinimapSnapshot(
      this.player.position.x,
      this.player.position.z,
      this.story.getQuestMarker(),
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
        mapReq.range,
        mapReq.step,
        this.story.getQuestMarker(),
        this.enemyManager.getAlive().map((e) => ({
          type: 'enemy' as const,
          x: e.position.x,
          z: e.position.z,
        })),
        lifePois,
      )
      : undefined;

    const questMarker = this.story.getQuestMarker();
    const activeQuest = this.story.getActiveQuest();
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
      }
    }

    this.hud.update(this.player, biome, mapData, worldMapData);
    this.hud.setStoryTracker(this.story.getHudSummary());

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
    this.nameplates?.update();

    this.audio.startAmbient(biome.musicMood);
    this.audio.updateEnvironment(biome.musicMood, this.weather.current, this.weather.intensity);
    this.postFX.render(this.scene, this.camera.getCamera(), this.clock.elapsedTime);

    this.saveTimer += dt;
    if (this.saveTimer >= 30) {
      this.saveTimer = 0;
      this.autoSave();
    }
  };

  private useSkill(index: number): void {
    const skills = CLASS_DEFINITIONS[this.player.classId].skills;
    const skill = skills[index];
    if (!skill || !this.player.useSkill(skill.id)) return;
    this.combat.processPlayerAttack(this.player, this.enemyManager.getAlive(), skill.id);
    this.particles.emitMagic(this.player.position, 0xaa88ff);
    if (skill.type === 'ultimate') this.camera.startBossCinematic(1.5);
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
          this.player.addItem(drop.item);
          this.hud.addLootNotification(drop.item);
          this.audio.playLoot();
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
      name: this.displayName,
      classId: this.player.classId,
      level: this.player.level,
      xp: this.player.xp,
      xpToNext: this.player.xpToNext,
      attributes: this.player.attributes,
      skillPoints: this.player.skillPoints,
      unlockedSkills: [],
      position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
      worldSeed: this.worldSeed,
      inventory: this.player.inventory,
      equipped: {},
      gold: this.player.gold,
      playTimeSeconds: this.playTime,
      achievements: this.story.campaignComplete ? ['campaign_complete'] : [],
      cosmetics: {},
      lifeSkills: this.life.toSave(),
      upgrades: this.upgrades.toSave(),
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

  dispose(): void {
    this.running = false;
    network.disconnect();
    this.remotes?.dispose();
    this.nameplates?.dispose();
    this.world?.dispose();
    this.life?.worldLife.dispose();
    this.activities?.dispose();
    this.ambientLife?.dispose();
    this.questBeacon?.dispose();
    this.enemyManager?.dispose();
    this.postFX?.dispose();
    this.grass?.dispose();
  }
}

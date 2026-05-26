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

  async start(classId: ClassId): Promise<void> {
    const save = SaveManager.loadPlayer();
    this.player = new Player(classId);
    if (save && save.classId === classId) {
      this.player.level = save.level;
      this.player.xp = save.xp;
      this.player.xpToNext = save.xpToNext;
      this.player.gold = save.gold;
      this.player.inventory = save.inventory ?? [];
      this.player.attributes = save.attributes;
      this.player.health = this.player.maxHealth;
      this.worldSeed = save.worldSeed ?? this.worldSeed;
    }

    const def = CLASS_DEFINITIONS[classId];
    this.world = new WorldManager(this.scene, this.worldSeed, this.perf);
    this.dayNight = new DayNightCycle(this.scene, def.primaryColor, 0xffe8c0, this.perf.shadowMapSize, this.perf.shadowsEnabled);
    this.weather = new WeatherSystem(this.scene, this.perf.weatherParticles);
    this.postFX = new PostProcessing(this.renderer, window.innerWidth, window.innerHeight, this.perf.postProcessingScale);
    this.postFX.applySettings(this.settings, this.perf.postProcessingScale);
    this.grass = new GrassField(this.scene, this.perf.grassCount);
    this.enemyManager = new EnemyManager(this.scene);
    this.enemyManager.applyPerformance(this.perf);
    this.particles = new ParticleSystem(this.scene);
    this.damageNumbers = new DamageNumberSystem();
    this.combat = new CombatSystem(this.bus, this.particles, this.damageNumbers);
    this.hud = new GameHUD();
    this.story = new StoryCampaign(this.bus);
    this.hud.initSkills(classId);
    this.hud.setStoryTracker(this.story.getHudSummary());
    this.hud.setJournalHtml(this.story.getJournalHtml());
    this.hud.showChapterIntro(STORY_CHAPTERS[0].title, STORY_CHAPTERS[0].intro);
    this.hud.showTutorial();

    const startX = save?.position?.x ?? 0;
    const startZ = save?.position?.z ?? 0;
    const h = (x: number, z: number) => this.world.getHeightAt(x, z);
    this.player.position.set(startX, h(startX, startZ), startZ);
    this.player.body.position.copy(this.player.position);
    this.scene.add(this.player.mesh);

    // Avoid first-frame hitch: build initial chunks before entering loop.
    this.world.preloadAround(startX, startZ, this.perf.chunkViewDistance >= 3 ? 2 : 1);

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

  private setupEvents(): void {
    this.bus.on('enemy_killed', (enemy: unknown, loot: unknown) => {
      const e = enemy as { name: string; tier: string; position: THREE.Vector3 };
      const items = loot as ItemInstance[];
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

    this.bus.on('player_hurt', () => this.audio.playHit());
    this.bus.on('level_up', () => {
      this.hud.showLevelUp();
      this.audio.playLevelUp();
      this.story.updateLevel(this.player.level);
      this.hud.setStoryTracker(this.story.getHudSummary());
      this.hud.setJournalHtml(this.story.getJournalHtml());
    });

    this.bus.on('quest_complete', (q: unknown) => {
      const quest = q as CampaignQuest;
      this.player.gold += quest.rewards.gold;
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

  private tryInteract(): void {
    if (this.interactCooldown > 0) return;
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
      this.player.heal(15);
      this.hud.showInteractMessage(`${npc.name} healed you.`);
    }
  }

  private animate = (): void => {
    if (!this.running) return;
    requestAnimationFrame(this.animate);
    let dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.paused) return;

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
    if (input.dodge) this.player.dodge();
    if (input.interact) this.tryInteract();
    if (input.attack && this.player.attack()) {
      this.combat.processPlayerAttack(this.player, this.enemyManager.getAlive());
      this.particles.emitMagic(this.player.position);
    }
    if (input.skill1) this.useSkill(0);
    if (input.skill2) this.useSkill(1);
    if (input.skill3) this.useSkill(2);
    if (input.skill4) this.useSkill(3);

    this.player.update(dt, h);
    this.story.updateLevel(this.player.level);
    this.world.checkVisitTriggers(this.player.position.x, this.player.position.z, this.bus);

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
    this.dayNight.followTarget(this.player.position);
    this.skyColor.setHex(biome.fogColor).lerp(new THREE.Color(0x1a2040), 1 - dayFactor);
    this.scene.background = this.skyColor;

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
    this.hud.setInteractHint(nearChest || nearNpc ? 'Press E to interact' : '');

    const mapData = this.world.getMinimapSnapshot(
      this.player.position.x,
      this.player.position.z,
      this.story.getQuestMarker(),
      this.enemyManager.getAlive().map((e) => ({
        type: 'enemy' as const,
        x: e.position.x,
        z: e.position.z,
      })),
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
      )
      : undefined;

    this.hud.update(this.player, biome, mapData, worldMapData);
    this.hud.setStoryTracker(this.story.getHudSummary());

    this.camera.setTarget(this.player.position);
    this.camera.setScreenShake(this.combat.screenShake);
    this.camera.update(dt);

    this.damageNumbers.setProjector((pos) => {
      const p = pos.clone().project(this.camera.getCamera());
      return {
        x: (p.x * 0.5 + 0.5) * window.innerWidth,
        y: (-p.y * 0.5 + 0.5) * window.innerHeight,
      };
    });

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
      name: 'Hero',
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

  dispose(): void {
    this.running = false;
    this.world?.dispose();
    this.enemyManager?.dispose();
    this.postFX?.dispose();
    this.grass?.dispose();
  }
}

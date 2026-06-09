import type { EventBus } from '../utils/EventBus';

export interface StoryChapter {
  id: string;
  title: string;
  intro: string;
  questIds: string[];
}

export interface CampaignQuest {
  id: string;
  chapterId: string;
  title: string;
  storyText: string;
  objectives: CampaignObjective[];
  rewards: { gold: number; xp: number; skillPoints?: number };
  complete: boolean;
}

export interface CampaignObjective {
  id: string;
  text: string;
  type: 'kill' | 'talk' | 'chest' | 'visit_cave' | 'visit_shrine' | 'visit_ruin' | 'elite' | 'level' | 'boss'
    | 'gather' | 'fish' | 'hunt' | 'craft' | 'mine' | 'arena' | 'bless' | 'dig' | 'deliver'
    | 'night_kill' | 'weather_storm' | 'weather_rain' | 'weather_snow';
  target: number;
  current: number;
  done: boolean;
  marker?: { x: number; z: number };
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'ch1',
    title: 'Chapter I — Riftfall',
    intro: 'The sky tore open above Aetherfall. Captain Elara needs every blade at the outpost before the void swallows the camp.',
    questIds: ['sq_intro', 'sq_clearing', 'sq_supplies', 'sq_outpost_life', 'sq_first_craft', 'sq_night_watch'],
  },
  {
    id: 'ch2',
    title: 'Chapter II — Emberroot Depths',
    intro: 'Ancient caves pulse with void energy. Miners report crystal veins — and something hungry in the dark.',
    questIds: ['sq_ruins', 'sq_mine', 'sq_rain_gather', 'sq_cave', 'sq_storm_survivor', 'sq_arena', 'sq_elite_hunt', 'sq_grow_strong'],
  },
  {
    id: 'ch3',
    title: 'Chapter III — Crown of Aether',
    intro: 'The Astral Shrine can seal the rift — but only after the land is cleansed and the Titan falls.',
    questIds: ['sq_shrine', 'sq_blessing', 'sq_war_path', 'sq_final'],
  },
  {
    id: 'ch4',
    title: 'Chapter IV — Eternal Aetherfall',
    intro: 'The rift is sealed, yet Aetherfall endures. Hunt relics, master the arena, and become legend.',
    questIds: ['sq_dig_relics', 'sq_arena_master', 'sq_life_master', 'sq_weather_master', 'sq_endless_hunt'],
  },
];

export function buildCampaignQuests(): CampaignQuest[] {
  return [
    {
      id: 'sq_intro',
      chapterId: 'ch1',
      title: 'Report to Captain Elara',
      storyText: 'The outpost commander waits at the camp fire. The void rift above Crown Peak grows each sunset — hear the plan before you march.',
      objectives: [
        { id: 'o_talk', text: 'Speak with Captain Elara (0/1)', type: 'talk', target: 1, current: 0, done: false, marker: { x: 6, z: 4 } },
      ],
      rewards: { gold: 30, xp: 80 },
      complete: false,
    },
    {
      id: 'sq_clearing',
      chapterId: 'ch1',
      title: 'Clear the Riftwood',
      storyText: 'Void-touched beasts swarm the forest. Cut through them so the supply road stays open.',
      objectives: [
        { id: 'o_kill8', text: 'Slay corrupted beasts (0/8)', type: 'kill', target: 8, current: 0, done: false },
      ],
      rewards: { gold: 60, xp: 120 },
      complete: false,
    },
    {
      id: 'sq_supplies',
      chapterId: 'ch1',
      title: 'Salvage the Caravan',
      storyText: 'Theron\'s wagon was overrun. Recover what supplies remain — the outpost won\'t last the week without them.',
      objectives: [
        { id: 'o_chest', text: 'Open supply chests (0/2)', type: 'chest', target: 2, current: 0, done: false },
      ],
      rewards: { gold: 50, xp: 100 },
      complete: false,
    },
    {
      id: 'sq_outpost_life',
      chapterId: 'ch1',
      title: 'Feed the Outpost',
      storyText: 'Lina and Bram need meat and timber. A fed camp fights harder when the void howls at night.',
      objectives: [
        { id: 'o_gather', text: 'Gather resources (0/5)', type: 'gather', target: 5, current: 0, done: false },
        { id: 'o_fish', text: 'Catch fish (0/2)', type: 'fish', target: 2, current: 0, done: false, marker: { x: 18, z: -8 } },
        { id: 'o_hunt', text: 'Hunt wildlife (0/1)', type: 'hunt', target: 1, current: 0, done: false },
      ],
      rewards: { gold: 75, xp: 150 },
      complete: false,
    },
    {
      id: 'sq_first_craft',
      chapterId: 'ch1',
      title: 'Garrick\'s Commission',
      storyText: 'The blacksmith needs proof you can work the bench. Brew a draught or cook a meal for the watch.',
      objectives: [
        { id: 'o_craft', text: 'Craft items at the bench (0/2)', type: 'craft', target: 2, current: 0, done: false, marker: { x: 11, z: 2 } },
      ],
      rewards: { gold: 40, xp: 90, skillPoints: 1 },
      complete: false,
    },
    {
      id: 'sq_night_watch',
      chapterId: 'ch1',
      title: 'Night Watch',
      storyText: 'Voidspawn grow bold after sunset. Captain Elara needs five kills under starlight to keep the camp safe.',
      objectives: [
        { id: 'o_night', text: 'Slay foes at night (0/5)', type: 'night_kill', target: 5, current: 0, done: false },
      ],
      rewards: { gold: 55, xp: 110, skillPoints: 1 },
      complete: false,
    },
    {
      id: 'sq_ruins',
      chapterId: 'ch2',
      title: 'Whispers in the Ruins',
      storyText: 'Scouts found pre-Rift glyphs at the old settlement. Stand among the stones — the journal may unlock a clue.',
      objectives: [
        { id: 'o_ruin', text: 'Explore the ancient ruins (0/1)', type: 'visit_ruin', target: 1, current: 0, done: false, marker: { x: -14, z: 16 } },
      ],
      rewards: { gold: 70, xp: 140 },
      complete: false,
    },
    {
      id: 'sq_mine',
      chapterId: 'ch2',
      title: 'Crystal Veins',
      storyText: 'Garrick senses ore near Emberroot. Mine crystal shards — they resonate with the shrine seal.',
      objectives: [
        { id: 'o_mine', text: 'Mine ore and crystals (0/4)', type: 'mine', target: 4, current: 0, done: false, marker: { x: 30, z: 12 } },
      ],
      rewards: { gold: 85, xp: 170, skillPoints: 1 },
      complete: false,
    },
    {
      id: 'sq_rain_gather',
      chapterId: 'ch2',
      title: 'Rain-Kissed Herbs',
      storyText: 'Herbalist Mora says sunleaf soaked by rain holds stronger essence. Gather while the sky weeps.',
      objectives: [
        { id: 'o_rain', text: 'Gather herbs during rain (0/4)', type: 'weather_rain', target: 4, current: 0, done: false },
      ],
      rewards: { gold: 65, xp: 130 },
      complete: false,
    },
    {
      id: 'sq_storm_survivor',
      chapterId: 'ch2',
      title: 'Eye of the Storm',
      storyText: 'Lightning splits the peaks when the void stirs the clouds. Endure a storm and prove your resolve.',
      objectives: [
        { id: 'o_storm', text: 'Survive a storm (0/1)', type: 'weather_storm', target: 1, current: 0, done: false },
      ],
      rewards: { gold: 90, xp: 200, skillPoints: 1 },
      complete: false,
    },
    {
      id: 'sq_cave',
      chapterId: 'ch2',
      title: 'Emberroot Cave',
      storyText: 'Void readings spike inside Emberroot. Delve deep — something pulses at the heart of the mountain.',
      objectives: [
        { id: 'o_cave', text: 'Enter Emberroot Cave (0/1)', type: 'visit_cave', target: 1, current: 0, done: false, marker: { x: 28, z: 18 } },
      ],
      rewards: { gold: 90, xp: 180 },
      complete: false,
    },
    {
      id: 'sq_arena',
      chapterId: 'ch2',
      title: 'Trial of the Void Arena',
      storyText: 'Captain Elara erected a fighting ring southeast of camp. Survive three waves to earn the Ascendants\' respect.',
      objectives: [
        { id: 'o_arena', text: 'Reach arena wave 3 (0/3)', type: 'arena', target: 3, current: 0, done: false, marker: { x: 22, z: -18 } },
      ],
      rewards: { gold: 100, xp: 220, skillPoints: 1 },
      complete: false,
    },
    {
      id: 'sq_elite_hunt',
      chapterId: 'ch2',
      title: 'Cull the Elite',
      storyText: 'A void champion guards the cave mouth. Destroy it before it calls the Titan awake.',
      objectives: [
        { id: 'o_elite', text: 'Defeat an elite enemy (0/1)', type: 'elite', target: 1, current: 0, done: false },
      ],
      rewards: { gold: 120, xp: 250 },
      complete: false,
    },
    {
      id: 'sq_grow_strong',
      chapterId: 'ch2',
      title: 'Rise of the Ascendant',
      storyText: 'The shrine will only answer a worthy soul. Train your body and spirit before the final march.',
      objectives: [
        { id: 'o_lvl', text: 'Reach level 6 (1/6)', type: 'level', target: 6, current: 1, done: false },
      ],
      rewards: { gold: 100, xp: 200, skillPoints: 2 },
      complete: false,
    },
    {
      id: 'sq_shrine',
      chapterId: 'ch3',
      title: 'Astral Convergence',
      storyText: 'The Astral Shrine hums with dying starlight. Stand within its circle — the seal stirs for the first time in centuries.',
      objectives: [
        { id: 'o_shrine', text: 'Visit the Astral Shrine (0/1)', type: 'visit_shrine', target: 1, current: 0, done: false, marker: { x: -22, z: 30 } },
      ],
      rewards: { gold: 150, xp: 300 },
      complete: false,
    },
    {
      id: 'sq_blessing',
      chapterId: 'ch3',
      title: 'Starlit Blessing',
      storyText: 'Mora believes a shrine blessing at night will strengthen your spirit. Offer herbs when the moon is high.',
      objectives: [
        { id: 'o_bless', text: 'Receive shrine blessing (0/1)', type: 'bless', target: 1, current: 0, done: false, marker: { x: -22, z: 30 } },
      ],
      rewards: { gold: 120, xp: 280, skillPoints: 1 },
      complete: false,
    },
    {
      id: 'sq_war_path',
      chapterId: 'ch3',
      title: 'Warpath of Aether',
      storyText: 'Corruption spreads with every heartbeat. Purge twenty more voidspawn before marching on Crown Peak.',
      objectives: [
        { id: 'o_kill20', text: 'Total enemies slain (0/20)', type: 'kill', target: 20, current: 0, done: false },
      ],
      rewards: { gold: 180, xp: 350 },
      complete: false,
    },
    {
      id: 'sq_final',
      chapterId: 'ch3',
      title: 'Silence the Corrupted Titan',
      storyText: 'At Crown Peak the Corrupted Titan feeds the rift. End it — or every soul in Aetherfall is forfeit.',
      objectives: [
        { id: 'o_boss', text: 'Defeat a world boss (0/1)', type: 'boss', target: 1, current: 0, done: false, marker: { x: -35, z: -28 } },
      ],
      rewards: { gold: 500, xp: 800, skillPoints: 3 },
      complete: false,
    },
    {
      id: 'sq_dig_relics',
      chapterId: 'ch4',
      title: 'Relics Beneath the Soil',
      storyText: 'With the rift sealed, treasure hunters mark soft earth around camp. Dig up what the old world buried.',
      objectives: [
        { id: 'o_dig', text: 'Excavate buried relics (0/3)', type: 'dig', target: 3, current: 0, done: false },
      ],
      rewards: { gold: 200, xp: 400 },
      complete: false,
    },
    {
      id: 'sq_arena_master',
      chapterId: 'ch4',
      title: 'Champion of the Arena',
      storyText: 'The void arena still hungers. Survive five waves and claim the title of realm champion.',
      objectives: [
        { id: 'o_arena5', text: 'Complete arena wave 5 (0/5)', type: 'arena', target: 5, current: 0, done: false, marker: { x: 22, z: -18 } },
      ],
      rewards: { gold: 300, xp: 500, skillPoints: 2 },
      complete: false,
    },
    {
      id: 'sq_life_master',
      chapterId: 'ch4',
      title: 'Master of the Land',
      storyText: 'Aetherfall rewards those who live off the land. Prove mastery in every life skill.',
      objectives: [
        { id: 'o_life', text: 'Life activities completed (0/20)', type: 'gather', target: 20, current: 0, done: false },
      ],
      rewards: { gold: 250, xp: 450, skillPoints: 2 },
      complete: false,
    },
    {
      id: 'sq_weather_master',
      chapterId: 'ch4',
      title: 'Child of Every Sky',
      storyText: 'A true Ascendant reads the heavens. Fish in snow, gather in wind, and walk through blizzard and sun alike.',
      objectives: [
        { id: 'o_snow', text: 'Fish during snowfall (0/1)', type: 'weather_snow', target: 1, current: 0, done: false },
        { id: 'o_storm2', text: 'Endure storms (0/2)', type: 'weather_storm', target: 2, current: 0, done: false },
      ],
      rewards: { gold: 350, xp: 550, skillPoints: 2 },
      complete: false,
    },
    {
      id: 'sq_endless_hunt',
      chapterId: 'ch4',
      title: 'Endless Hunt',
      storyText: 'The void is never truly gone. Keep hunting — the realm depends on blades like yours.',
      objectives: [
        { id: 'o_endless', text: 'Slay voidspawn (0/50)', type: 'kill', target: 50, current: 0, done: false },
      ],
      rewards: { gold: 400, xp: 600 },
      complete: false,
    },
  ];
}

export class StoryCampaign {
  quests: CampaignQuest[] = [];
  activeQuestId: string | null = 'sq_intro';
  campaignComplete = false;
  currentChapterIndex = 0;
  totalKills = 0;
  chestsOpened = 0;
  lifeActions = 0;
  maxArenaWave = 0;

  constructor(private bus: EventBus) {
    this.quests = buildCampaignQuests();
    this.bus.on('enemy_killed', () => this.onKill());
    this.bus.on('elite_killed', () => this.onElite());
    this.bus.on('boss_killed', () => this.progressObjective('boss', 1));
    this.bus.on('chest_opened', () => this.onChest());
    this.bus.on('npc_talk', (name: unknown) => this.onTalk(name as string));
    this.bus.on('visit_cave', () => this.onVisit('visit_cave'));
    this.bus.on('visit_shrine', () => this.onVisit('visit_shrine'));
    this.bus.on('visit_ruin', () => this.onVisit('visit_ruin'));
    this.bus.on('material_gathered', () => this.onLifeAction('gather', 1));
    this.bus.on('fish_caught', (n: unknown) => this.onLifeAction('fish', typeof n === 'number' ? n : 1));
    this.bus.on('wildlife_hunted', () => this.onLifeAction('hunt', 1));
    this.bus.on('item_crafted', () => this.onLifeAction('craft', 1));
    this.bus.on('ore_mined', (n: unknown) => this.onLifeAction('mine', typeof n === 'number' ? n : 1));
    this.bus.on('treasure_dug', () => this.onLifeAction('dig', 1));
    this.bus.on('shrine_blessed', () => this.progressObjective('bless', 1));
    this.bus.on('arena_wave', (w: unknown) => this.onArenaWave(Number(w)));
    this.bus.on('arena_complete', (w: unknown) => this.onArenaWave(Number(w)));
    this.bus.on('night_kill', () => this.progressObjective('night_kill', 1));
    this.bus.on('weather_storm', () => this.progressObjective('weather_storm', 1));
    this.bus.on('weather_rain_gather', () => this.progressObjective('weather_rain', 1));
    this.bus.on('weather_snow_fish', () => this.progressObjective('weather_snow', 1));
  }

  getActiveQuest(): CampaignQuest | null {
    return this.quests.find((q) => q.id === this.activeQuestId && !q.complete) ?? null;
  }

  getChapter(): StoryChapter {
    const q = this.getActiveQuest();
    const chId = q?.chapterId ?? STORY_CHAPTERS[STORY_CHAPTERS.length - 1].id;
    return STORY_CHAPTERS.find((c) => c.id === chId) ?? STORY_CHAPTERS[0];
  }

  getQuestMarker(): { x: number; z: number } | null {
    const q = this.getActiveQuest();
    if (!q) return null;
    const obj = q.objectives.find((o) => !o.done && o.marker);
    return obj?.marker ?? null;
  }

  getHudSummary(): { chapter: string; quest: string; objective: string; progress: string } {
    const ch = this.getChapter();
    const q = this.getActiveQuest();
    if (!q) {
      return {
        chapter: 'Epilogue',
        quest: this.campaignComplete ? 'Aetherfall Saved' : 'No active mission',
        objective: this.campaignComplete ? 'Explore the endless realms.' : '',
        progress: '',
      };
    }
    const obj = q.objectives.find((o) => !o.done) ?? q.objectives[q.objectives.length - 1];
    const done = q.objectives.filter((o) => o.done).length;
    return {
      chapter: ch.title,
      quest: q.title,
      objective: obj.text,
      progress: `${done}/${q.objectives.length} objectives`,
    };
  }

  getJournalHtml(): string {
    let html = '';
    for (const ch of STORY_CHAPTERS) {
      html += `<div class="journal-chapter"><h4>${ch.title}</h4><p class="journal-intro">${ch.intro}</p><ul>`;
      for (const qid of ch.questIds) {
        const q = this.quests.find((x) => x.id === qid)!;
        const status = q.complete ? '✓' : q.id === this.activeQuestId ? '▶' : '○';
        const locked = !q.complete && q.id !== this.activeQuestId &&
          this.quests.findIndex((x) => x.id === qid) > this.quests.findIndex((x) => x.id === this.activeQuestId);
        html += `<li class="${q.complete ? 'done' : ''} ${locked ? 'locked' : ''}">${status} <strong>${q.title}</strong><br><span>${q.storyText}</span>`;
        if (q.id === this.activeQuestId || q.complete) {
          html += '<ul class="journal-objs">';
          for (const o of q.objectives) {
            html += `<li class="${o.done ? 'done' : ''}">${o.text}</li>`;
          }
          html += '</ul>';
        }
        html += '</li>';
      }
      html += '</ul></div>';
    }
    return html;
  }

  updateLevel(level: number): void {
    this.progressObjective('level', level);
  }

  private onKill(): void {
    this.totalKills++;
    const q = this.getActiveQuest();
    if (!q) return;
    for (const o of q.objectives) {
      if (o.done || o.type !== 'kill') continue;
      o.current = Math.min(o.target, o.current + 1);
      o.done = o.current >= o.target;
      this.updateObjText(o);
    }
    this.checkComplete();
  }

  private onElite(): void {
    this.progressObjective('elite', 1);
  }

  private onChest(): void {
    this.chestsOpened++;
    this.progressObjective('chest', this.chestsOpened);
  }

  private onTalk(name: string): void {
    if (name.includes('Elara') || name.includes('Captain')) {
      this.progressObjective('talk', 1);
    }
  }

  private onVisit(type: CampaignObjective['type']): void {
    this.progressObjective(type, 1);
  }

  private onLifeAction(type: CampaignObjective['type'], amount: number): void {
    this.lifeActions += amount;
    this.progressObjective(type, amount);
    const q = this.getActiveQuest();
    if (q?.id === 'sq_life_master') {
      for (const o of q.objectives) {
        if (o.type === 'gather' && !o.done) {
          o.current = Math.min(o.target, this.lifeActions);
          o.done = o.current >= o.target;
          this.updateObjText(o);
        }
      }
      this.checkComplete();
    }
  }

  private onArenaWave(wave: number): void {
    this.maxArenaWave = Math.max(this.maxArenaWave, wave);
    const q = this.getActiveQuest();
    if (!q) return;
    for (const o of q.objectives) {
      if (o.done || o.type !== 'arena') continue;
      o.current = Math.max(o.current, Math.min(o.target, wave));
      o.done = o.current >= o.target;
      this.updateObjText(o);
    }
    this.checkComplete();
  }

  private progressObjective(type: CampaignObjective['type'], value: number): void {
    const q = this.getActiveQuest();
    if (!q) return;
    for (const o of q.objectives) {
      if (o.done || o.type !== type) continue;
      if (type === 'kill' || type === 'chest' || type === 'level' || type === 'arena') {
        o.current = Math.min(o.target, type === 'level' ? value : type === 'chest' ? value : o.current + (type === 'arena' ? 0 : value));
        if (type === 'arena') o.current = Math.min(o.target, this.maxArenaWave);
      } else {
        o.current = Math.min(o.target, o.current + value);
      }
      o.done = o.current >= o.target;
      this.updateObjText(o);
    }
    this.checkComplete();
  }

  private updateObjText(o: CampaignObjective): void {
    const label = o.text.replace(/\s*\([^)]*\)/, '');
    o.text = `${label} (${o.current}/${o.target})`;
  }

  private checkComplete(): void {
    const q = this.getActiveQuest();
    if (!q || !q.objectives.every((o) => o.done)) return;
    q.complete = true;
    this.bus.emit('quest_complete', q);
    const idx = this.quests.findIndex((x) => x.id === q.id);
    const next = this.quests[idx + 1];
    if (next) {
      this.activeQuestId = next.id;
      const chIdx = STORY_CHAPTERS.findIndex((c) => c.questIds.includes(next.id));
      if (chIdx >= 0) this.currentChapterIndex = chIdx;
      this.bus.emit('chapter_intro', STORY_CHAPTERS[this.currentChapterIndex]);
    } else {
      this.activeQuestId = null;
      this.campaignComplete = true;
      this.bus.emit('campaign_complete');
    }
  }
}

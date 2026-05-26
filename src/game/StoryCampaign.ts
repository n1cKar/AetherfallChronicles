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
  rewards: { gold: number; xp: number };
  complete: boolean;
}

export interface CampaignObjective {
  id: string;
  text: string;
  type: 'kill' | 'talk' | 'chest' | 'visit_cave' | 'visit_shrine' | 'visit_ruin' | 'elite' | 'level' | 'boss';
  target: number;
  current: number;
  done: boolean;
  /** For visit objectives — world position hint */
  marker?: { x: number; z: number };
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'ch1',
    title: 'Chapter I — Riftfall',
    intro: 'The sky tore open above Aetherfall. Captain Elara needs every blade at the outpost.',
    questIds: ['sq_intro', 'sq_clearing', 'sq_supplies'],
  },
  {
    id: 'ch2',
    title: 'Chapter II — Emberroot Depths',
    intro: 'Ancient caves pulse with void energy. Delve deep and break the corruption at its source.',
    questIds: ['sq_cave', 'sq_elite_hunt', 'sq_grow_strong'],
  },
  {
    id: 'ch3',
    title: 'Chapter III — Crown of Aether',
    intro: 'Only the Astral Shrine can seal the rift — if you can survive the Titan waiting there.',
    questIds: ['sq_shrine', 'sq_war_path', 'sq_final'],
  },
];

export function buildCampaignQuests(): CampaignQuest[] {
  return [
    {
      id: 'sq_intro',
      chapterId: 'ch1',
      title: 'Report to Captain Elara',
      storyText: 'The outpost commander waits at the camp fire. Hear the battle plan before you march.',
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
      storyText: 'Void-touched beasts swarm the forest. Cut through them to secure the road.',
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
      storyText: 'A merchant wagon was overrun. Recover what supplies remain from the chests.',
      objectives: [
        { id: 'o_chest', text: 'Open supply chests (0/2)', type: 'chest', target: 2, current: 0, done: false },
      ],
      rewards: { gold: 50, xp: 100 },
      complete: false,
    },
    {
      id: 'sq_cave',
      chapterId: 'ch2',
      title: 'Emberroot Cave',
      storyText: 'Scouts marked a glowing cave to the northeast. Investigate the void readings inside.',
      objectives: [
        { id: 'o_cave', text: 'Enter Emberroot Cave (0/1)', type: 'visit_cave', target: 1, current: 0, done: false, marker: { x: 28, z: 18 } },
      ],
      rewards: { gold: 90, xp: 180 },
      complete: false,
    },
    {
      id: 'sq_elite_hunt',
      chapterId: 'ch2',
      title: 'Cull the Elite',
      storyText: 'Something powerful guards the depths. Destroy an elite void champion.',
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
      storyText: 'The shrine will only answer a worthy soul. Grow stronger before the final march.',
      objectives: [
        { id: 'o_lvl', text: 'Reach level 5 (1/5)', type: 'level', target: 5, current: 1, done: false },
      ],
      rewards: { gold: 100, xp: 200 },
      complete: false,
    },
    {
      id: 'sq_shrine',
      chapterId: 'ch3',
      title: 'Astral Convergence',
      storyText: 'The Astral Shrine hums with dying starlight. Stand within its circle to awaken the seal.',
      objectives: [
        { id: 'o_shrine', text: 'Visit the Astral Shrine (0/1)', type: 'visit_shrine', target: 1, current: 0, done: false, marker: { x: -22, z: 30 } },
      ],
      rewards: { gold: 150, xp: 300 },
      complete: false,
    },
    {
      id: 'sq_war_path',
      chapterId: 'ch3',
      title: 'Warpath of Aether',
      storyText: 'The corruption spreads with every heartbeat. Purge twenty more before the Titan wakes.',
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
      storyText: 'At the mountain crown, the Corrupted Titan feeds the rift. End it — or Aetherfall falls.',
      objectives: [
        { id: 'o_boss', text: 'Defeat a world boss (0/1)', type: 'boss', target: 1, current: 0, done: false, marker: { x: -35, z: -28 } },
      ],
      rewards: { gold: 500, xp: 800 },
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

  constructor(private bus: EventBus) {
    this.quests = buildCampaignQuests();
    this.bus.on('enemy_killed', () => this.onKill());
    this.bus.on('elite_killed', () => this.onElite());
    this.bus.on('boss_killed', () => this.progressObjective('boss', 1));
    this.bus.on('chest_opened', () => this.onChest());
    this.bus.on('npc_talk', (name: unknown) => this.onTalk(name as string));
    this.bus.on('visit_cave', () => this.onVisit('visit_cave'));
    this.bus.on('visit_shrine', () => this.onVisit('visit_shrine'));
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
        html += `<li class="${q.complete ? 'done' : ''}">${status} <strong>${q.title}</strong><br><span>${q.storyText}</span>`;
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
      const label = o.text.replace(/\s*\([^)]*\)/, '');
      o.text = `${label} (${o.current}/${o.target})`;
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

  private progressObjective(type: CampaignObjective['type'], value: number): void {
    const q = this.getActiveQuest();
    if (!q) return;
    for (const o of q.objectives) {
      if (o.done || o.type !== type) continue;
      if (type === 'kill') {
        o.current = Math.min(o.target, value);
      } else if (type === 'chest') {
        o.current = Math.min(o.target, value);
      } else if (type === 'level') {
        o.current = Math.min(o.target, value);
      } else {
        o.current = Math.min(o.target, o.current + value);
      }
      o.done = o.current >= o.target;
      const label = o.text.replace(/\s*\([^)]*\)/, '');
      o.text = `${label} (${o.current}/${o.target})`;
    }
    this.checkComplete();
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

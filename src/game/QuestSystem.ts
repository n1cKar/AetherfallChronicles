import type { EventBus } from '../utils/EventBus';

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
  rewards: { gold: number; xp: number };
  complete: boolean;
}

export interface QuestObjective {
  id: string;
  text: string;
  type: 'kill' | 'collect' | 'explore' | 'interact' | 'boss';
  target: number;
  current: number;
  done: boolean;
}

export class QuestSystem {
  quests: Quest[] = [];
  activeQuestId: string | null = null;
  campaignComplete = false;

  constructor(private bus: EventBus) {
    this.initCampaign();
    this.bus.on('enemy_killed', () => this.onKill());
    this.bus.on('elite_killed', () => this.onEliteKill());
    this.bus.on('chest_opened', () => this.onChest());
    this.bus.on('npc_talk', () => this.onNpc());
  }

  private initCampaign(): void {
    this.quests = [
      {
        id: 'q1_awakening',
        title: 'Awakening in Aetherfall',
        description: 'Defeat 5 creatures threatening the realm.',
        objectives: [
          { id: 'k1', text: 'Slay enemies (0/5)', type: 'kill', target: 5, current: 0, done: false },
        ],
        rewards: { gold: 50, xp: 100 },
        complete: false,
      },
      {
        id: 'q2_explorer',
        title: 'Pathfinder',
        description: 'Discover ancient ruins and open a treasure chest.',
        objectives: [
          { id: 'e1', text: 'Open a treasure chest (0/1)', type: 'interact', target: 1, current: 0, done: false },
          { id: 'e2', text: 'Reach level 3 (1/3)', type: 'explore', target: 3, current: 1, done: false },
        ],
        rewards: { gold: 80, xp: 150 },
        complete: false,
      },
      {
        id: 'q3_void',
        title: 'Silence the Void',
        description: 'Destroy an elite enemy and claim victory over corruption.',
        objectives: [
          { id: 'b1', text: 'Defeat elite or boss (0/1)', type: 'boss', target: 1, current: 0, done: false },
          { id: 'k2', text: 'Total kills (0/15)', type: 'kill', target: 15, current: 0, done: false },
        ],
        rewards: { gold: 200, xp: 500 },
        complete: false,
      },
    ];
    this.activeQuestId = 'q1_awakening';
  }

  getActiveQuest(): Quest | null {
    return this.quests.find((q) => q.id === this.activeQuestId && !q.complete) ?? null;
  }

  getHudText(): string {
    const q = this.getActiveQuest();
    if (!q) return this.campaignComplete ? 'Campaign complete! Explore freely.' : 'All quests done.';
    const obj = q.objectives.find((o) => !o.done);
    return obj ? `${q.title}: ${obj.text}` : q.title;
  }

  private onKill(): void {
    this.increment('kill', 1);
  }

  private onEliteKill(): void {
    this.increment('boss', 1);
  }

  private onChest(): void {
    this.increment('interact', 1);
  }

  private onNpc(): void {
    this.increment('interact', 1);
  }

  updateLevel(level: number): void {
    for (const q of this.quests) {
      if (q.complete) continue;
      for (const o of q.objectives) {
        if (o.type === 'explore') {
          o.current = Math.min(level, o.target);
          o.done = level >= o.target;
          const label = o.text.split('(')[0].trim();
          o.text = `${label} (${o.current}/${o.target})`;
        }
      }
      if (q.id === this.activeQuestId) this.checkComplete();
    }
  }

  private increment(type: string, amount: number): void {
    for (const q of this.quests) {
      if (q.complete || q.id !== this.activeQuestId) continue;
      for (const o of q.objectives) {
        if (o.done) continue;
        if (type === 'boss' && o.type === 'boss' && amount > 0) {
          o.current = 1;
          o.done = true;
          o.text = 'Defeat elite or boss (1/1)';
        } else if (o.type === type || (type === 'kill' && o.type === 'kill')) {
          o.current = Math.min(o.target, o.current + (amount || 1));
          o.done = o.current >= o.target;
          const m = o.text.match(/^(.+?)\s*\(/);
          const label = m ? m[1] : o.text;
          o.text = `${label} (${o.current}/${o.target})`;
        }
      }
      this.checkComplete();
    }
  }

  private checkComplete(): void {
    const q = this.getActiveQuest();
    if (!q) return;
    if (q.objectives.every((o) => o.done)) {
      q.complete = true;
      this.bus.emit('quest_complete', q);
      const idx = this.quests.findIndex((x) => x.id === q.id);
      const next = this.quests[idx + 1];
      this.activeQuestId = next && !next.complete ? next.id : null;
      if (!this.activeQuestId) this.campaignComplete = true;
    }
  }

  getRewards(quest: Quest): { gold: number; xp: number } {
    return quest.rewards;
  }
}

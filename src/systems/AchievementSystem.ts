/** Meta progression - unlock tracking and rewards. Developed by n1ckar */

import type { EventBus } from '../utils/EventBus';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  secret?: boolean;
  rewardGold?: number;
}

export interface AchievementSave {
  unlocked: string[];
  nightKills: number;
  biomesVisited: string[];
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_blood', title: 'First Blood', description: 'Slay your first foe.', icon: 'X', rewardGold: 15 },
  { id: 'combo_master', title: 'Combo Artist', description: 'Reach a 5-hit combo.', icon: '5x', rewardGold: 25 },
  { id: 'rampage', title: 'Rampage', description: 'Achieve a 10-kill streak.', icon: '10', rewardGold: 50 },
  { id: 'night_hunter', title: 'Night Hunter', description: 'Slay 10 enemies after dark.', icon: 'N', rewardGold: 40 },
  { id: 'storm_chaser', title: 'Storm Chaser', description: 'Survive a thunderstorm.', icon: 'S', rewardGold: 35 },
  { id: 'angler', title: 'Angler', description: 'Catch your first fish.', icon: 'F', rewardGold: 20 },
  { id: 'artisan', title: 'Artisan', description: 'Craft your first item.', icon: 'C', rewardGold: 20 },
  { id: 'wealthy', title: 'Treasure Hoarder', description: 'Accumulate 1,000 gold.', icon: 'G', rewardGold: 0 },
  { id: 'veteran', title: 'Veteran', description: 'Reach level 10.', icon: '10', rewardGold: 100 },
  { id: 'champion', title: 'Champion', description: 'Reach level 20.', icon: '20', rewardGold: 250 },
  { id: 'boss_slayer', title: 'Boss Slayer', description: 'Defeat a world boss.', icon: 'B', rewardGold: 150 },
  { id: 'arena_warrior', title: 'Arena Warrior', description: 'Clear arena wave 5.', icon: 'A', rewardGold: 80 },
  { id: 'collector', title: 'Collector', description: 'Hold 25 items in inventory.', icon: 'I', rewardGold: 60 },
  { id: 'legendary_find', title: 'Legendary Find', description: 'Loot a legendary item.', icon: 'L', rewardGold: 120 },
  { id: 'campaign_hero', title: 'Voidbreaker', description: 'Complete the campaign.', icon: 'V', rewardGold: 500 },
  { id: 'explorer', title: 'Realm Explorer', description: 'Visit 5 different biomes.', icon: 'M', rewardGold: 75 },
  { id: 'spire_climber', title: 'Spire Climber', description: 'Clear floor 5 of the Aether Spire.', icon: '^', rewardGold: 200 },
  { id: 'dungeon_delver', title: 'Dungeon Delver', description: 'Enter your first forged dungeon.', icon: '[]', rewardGold: 35 },
  { id: 'secret_finder', title: 'Secret Finder', description: 'Open a hidden dungeon cache.', icon: '?', rewardGold: 80 },
  { id: 'rift_sealer', title: 'Rift Sealer', description: 'Complete an Aether Rift Trial.', icon: 'R', rewardGold: 90 },
  { id: 'social', title: 'Realm Socialite', description: 'Send a message in the online realm.', icon: '@', rewardGold: 10 },
  { id: 'perfectionist', title: 'Perfectionist', description: 'Raise any attribute to 25.', icon: '+', rewardGold: 100, secret: true },
  { id: 'mythical_hunter', title: 'Mythical Hunter', description: 'Loot a mythical item.', icon: '*', rewardGold: 300, secret: true },
];

export class AchievementSystem {
  unlocked = new Set<string>();
  private nightKills = 0;
  private biomesVisited = new Set<string>();
  private onUnlock: (def: AchievementDef) => void;

  constructor(private bus: EventBus, onUnlock: (def: AchievementDef) => void) {
    this.onUnlock = onUnlock;
    this.register();
  }

  load(ids: string[]): void {
    for (const id of ids) {
      this.unlocked.add(id === 'mythic_hunter' ? 'mythical_hunter' : id);
    }
  }

  loadState(data?: AchievementSave | string[]): void {
    if (!data) return;
    if (Array.isArray(data)) {
      this.load(data);
      return;
    }
    this.load(data.unlocked ?? []);
    this.nightKills = data.nightKills ?? this.nightKills;
    this.biomesVisited = new Set(data.biomesVisited ?? []);
  }

  export(): string[] {
    return [...this.unlocked];
  }

  toSave(): AchievementSave {
    return {
      unlocked: this.export(),
      nightKills: this.nightKills,
      biomesVisited: [...this.biomesVisited],
    };
  }

  getProgress(): { unlocked: number; total: number } {
    return { unlocked: this.unlocked.size, total: ACHIEVEMENTS.length };
  }

  getJournalHtml(): string {
    const rows = ACHIEVEMENTS.map((a) => {
      const done = this.unlocked.has(a.id);
      const hidden = a.secret && !done;
      const title = hidden ? '???' : a.title;
      const desc = hidden ? 'Hidden achievement.' : a.description;
      return `<div class="ach-row ${done ? 'done' : ''}">
        <span class="ach-icon">${done || !hidden ? a.icon : '?'}</span>
        <div><strong>${title}</strong><br><small>${desc}</small></div>
      </div>`;
    }).join('');
    return `<h3>Achievements (${this.unlocked.size}/${ACHIEVEMENTS.length})</h3>${rows}`;
  }

  private unlock(id: string): void {
    if (this.unlocked.has(id)) return;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return;
    this.unlocked.add(id);
    this.onUnlock(def);
    if (def.rewardGold) this.bus.emit('achievement_gold', def.rewardGold);
  }

  private register(): void {
    this.bus.on('enemy_killed', () => this.unlock('first_blood'));
    this.bus.on('night_kill', () => {
      this.nightKills++;
      if (this.nightKills >= 10) this.unlock('night_hunter');
    });
    this.bus.on('weather_storm', () => this.unlock('storm_chaser'));
    this.bus.on('fish_caught', () => this.unlock('angler'));
    this.bus.on('item_crafted', () => this.unlock('artisan'));
    this.bus.on('boss_killed', () => this.unlock('boss_slayer'));
    this.bus.on('campaign_complete', () => this.unlock('campaign_hero'));
    this.bus.on('player_chat', () => this.unlock('social'));
    this.bus.on('spire_floor', (floor: unknown) => {
      if (Number(floor) >= 5) this.unlock('spire_climber');
    });
    this.bus.on('loot_legendary', () => this.unlock('legendary_find'));
    this.bus.on('loot_mythical', () => this.unlock('mythical_hunter'));
    this.bus.on('dungeon_entered', () => this.unlock('dungeon_delver'));
    this.bus.on('secret_found', () => this.unlock('secret_finder'));
    this.bus.on('rift_complete', () => this.unlock('rift_sealer'));
    this.bus.on('biome_entered', (id: unknown) => {
      this.biomesVisited.add(String(id));
      if (this.biomesVisited.size >= 5) this.unlock('explorer');
    });
  }

  checkCombo(combo: number): void {
    if (combo >= 5) this.unlock('combo_master');
  }

  checkKillStreak(streak: number): void {
    if (streak >= 10) this.unlock('rampage');
  }

  checkLevel(level: number): void {
    if (level >= 10) this.unlock('veteran');
    if (level >= 20) this.unlock('champion');
  }

  checkGold(gold: number): void {
    if (gold >= 1000) this.unlock('wealthy');
  }

  checkInventory(count: number): void {
    if (count >= 25) this.unlock('collector');
  }

  checkAttributes(attrs: { str: number; dex: number; int: number; vit: number }): void {
    if (attrs.str >= 25 || attrs.dex >= 25 || attrs.int >= 25 || attrs.vit >= 25) {
      this.unlock('perfectionist');
    }
  }

  checkArenaWave(wave: number): void {
    if (wave >= 5) this.unlock('arena_warrior');
  }
}

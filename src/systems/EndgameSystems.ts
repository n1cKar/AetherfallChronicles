/**
 * Endgame & MMO-lite systems framework — expand for production seasons.
 * Developed by n1ckar
 */

export interface EndgameActivity {
  id: string;
  name: string;
  type: 'tower' | 'arena' | 'raid' | 'invasion' | 'rogue_dungeon' | 'daily';
  minLevel: number;
  scaling: boolean;
}

export const ENDGAME_ACTIVITIES: EndgameActivity[] = [
  { id: 'aether_spire', name: 'Aether Spire', type: 'tower', minLevel: 20, scaling: true },
  { id: 'void_arena', name: 'Void Arena', type: 'arena', minLevel: 15, scaling: true },
  { id: 'titan_raid', name: 'Titan Raid', type: 'raid', minLevel: 30, scaling: false },
  { id: 'corruption_invasion', name: 'World Invasion', type: 'invasion', minLevel: 25, scaling: true },
  { id: 'shifting_depths', name: 'Shifting Depths', type: 'rogue_dungeon', minLevel: 10, scaling: true },
];

export class EndgameManager {
  dailyCompleted = new Set<string>();
  seasonTier = 1;

  getAvailable(playerLevel: number): EndgameActivity[] {
    return ENDGAME_ACTIVITIES.filter((a) => playerLevel >= a.minLevel);
  }

  scaleDifficulty(baseLevel: number, floor: number): number {
    return baseLevel + Math.floor(floor * 1.15 * this.seasonTier);
  }
}

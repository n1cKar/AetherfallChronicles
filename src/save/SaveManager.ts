/** Local + cloud-save-ready persistence. Developed by n1ckar */

import type { ClassId } from '../config/constants';
import type { ItemInstance } from '../loot/ItemGenerator';
import type { LifeSkillsSave } from '../life/LifeSkillsManager';
import type { UpgradeSave } from '../systems/UpgradeSystem';
import type { ActivitySave } from '../systems/ActivityManager';
import type { StoryCampaignSave } from '../game/StoryCampaign';
import type { AchievementSave } from '../systems/AchievementSystem';
import type { DungeonSave } from '../dungeon/DungeonSystem';
import type { WorldInteractablesSave } from '../world/WorldInteractables';
import { cloneDefaultKeyBindings, normalizeKeyBindings, type KeyBindings } from '../core/KeyBindings';

export interface PlayerSaveData {
  saveVersion?: number;
  savedAt?: number;
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  xpToNext: number;
  attributes: { str: number; dex: number; int: number; vit: number };
  skillPoints: number;
  unlockedSkills: string[];
  position: { x: number; y: number; z: number };
  velocity?: { x: number; y: number; z: number };
  rotation?: number;
  worldSeed: number;
  inventory: ItemInstance[];
  equipped: Partial<Record<string, ItemInstance>>;
  health?: number;
  maxHealth?: number;
  mana?: number;
  maxMana?: number;
  deaths?: number;
  gold: number;
  playTimeSeconds: number;
  achievements: string[];
  achievementState?: AchievementSave;
  cosmetics: { title?: string; mount?: string; pet?: string };
  story?: StoryCampaignSave;
  lifeSkills?: LifeSkillsSave;
  upgrades?: UpgradeSave;
  activities?: ActivitySave;
  dungeons?: DungeonSave;
  interactables?: WorldInteractablesSave;
  dayTime?: number;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
  shadows: boolean;
  bloom: boolean;
  particles: 'low' | 'medium' | 'high';
  vsync: boolean;
  showDamageNumbers: boolean;
  autoLoot: boolean;
  controllerSensitivity: number;
  keyBindings: KeyBindings;
  serverUrl?: string;
}

const SAVE_KEY = 'aetherfall_save';
const SETTINGS_KEY = 'aetherfall_settings';

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.65,
  sfxVolume: 0.85,
  graphicsQuality: 'high',
  shadows: true,
  bloom: true,
  particles: 'high',
  vsync: true,
  showDamageNumbers: true,
  autoLoot: true,
  controllerSensitivity: 1,
  keyBindings: cloneDefaultKeyBindings(),
  serverUrl: 'ws://localhost:2567',
};

export class SaveManager {
  static loadSettings(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const settings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          keyBindings: normalizeKeyBindings(parsed.keyBindings),
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return settings;
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }

  static saveSettings(settings: GameSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  static loadPlayer(): PlayerSaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const save = JSON.parse(raw) as PlayerSaveData;
        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
        return save;
      }
    } catch { /* ignore */ }
    return null;
  }

  static savePlayer(data: PlayerSaveData): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  /** Cloud sync hook — implement with backend when multiplayer goes live */
  static async syncToCloud(_data: PlayerSaveData): Promise<boolean> {
    return false;
  }

  static async loadFromCloud(): Promise<PlayerSaveData | null> {
    return null;
  }
}

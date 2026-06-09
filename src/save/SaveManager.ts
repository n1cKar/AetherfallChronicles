/** Local + cloud-save-ready persistence. Developed by n1ckar */

import type { ClassId } from '../config/constants';
import type { ItemInstance } from '../loot/ItemGenerator';
import type { LifeSkillsSave } from '../life/LifeSkillsManager';
import type { UpgradeSave } from '../systems/UpgradeSystem';

export interface PlayerSaveData {
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  xpToNext: number;
  attributes: { str: number; dex: number; int: number; vit: number };
  skillPoints: number;
  unlockedSkills: string[];
  position: { x: number; y: number; z: number };
  worldSeed: number;
  inventory: ItemInstance[];
  equipped: Partial<Record<string, ItemInstance>>;
  gold: number;
  playTimeSeconds: number;
  achievements: string[];
  cosmetics: { title?: string; mount?: string; pet?: string };
  lifeSkills?: LifeSkillsSave;
  upgrades?: UpgradeSave;
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
  serverUrl: 'ws://localhost:2567',
};

export class SaveManager {
  static loadSettings(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }

  static saveSettings(settings: GameSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  static loadPlayer(): PlayerSaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return JSON.parse(raw) as PlayerSaveData;
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

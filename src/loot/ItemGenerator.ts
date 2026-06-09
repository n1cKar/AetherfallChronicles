import {
  RARITIES,
  RARITY_WEIGHTS,
  WEAPON_TYPES,
  type Rarity,
  type WeaponType,
} from '../config/constants';
import { pickWeighted } from '../utils/math';

export interface ItemAffix {
  id: string;
  name: string;
  stat: string;
  value: number;
}

export interface ItemInstance {
  id: string;
  name: string;
  baseName: string;
  rarity: Rarity;
  type: 'weapon' | 'armor' | 'accessory' | 'consumable' | 'gem';
  weaponType?: WeaponType;
  level: number;
  affixes: ItemAffix[];
  setId?: string;
  legendaryPower?: string;
  dps: number;
  sellValue: number;
}

const PREFIXES = ['Aether', 'Void', 'Storm', 'Ember', 'Frost', 'Soul', 'Rune', 'Star', 'Doom', 'Grace'];
const SUFFIXES = ['Edge', 'Fang', 'Heart', 'Crown', 'Shroud', 'Spire', 'Brand', 'Wing', 'Core', 'Bane'];

const AFFIX_POOL: Omit<ItemAffix, 'value'>[] = [
  { id: 'str', name: 'of Might', stat: 'strength', value: 0 },
  { id: 'dex', name: 'of Swiftness', stat: 'dexterity', value: 0 },
  { id: 'int', name: 'of Arcana', stat: 'intelligence', value: 0 },
  { id: 'vit', name: 'of Vitality', stat: 'vitality', value: 0 },
  { id: 'crit', name: 'of Precision', stat: 'critChance', value: 0 },
  { id: 'lifesteal', name: 'of Leech', stat: 'lifesteal', value: 0 },
  { id: 'cdr', name: 'of Haste', stat: 'cooldownReduction', value: 0 },
  { id: 'aoe', name: 'of Ruin', stat: 'areaDamage', value: 0 },
];

const LEGENDARY_POWERS = [
  'Chain Lightning on Crit',
  'Meteor Rain Ultimate',
  'Phoenix Rebirth',
  'Void Rift Pull',
  'Time Dilation Aura',
];

const SET_ITEMS = ['Aetherbound', 'Voidwalker', 'Stormcaller'];

let itemCounter = 0;

export class ItemGenerator {
  static generate(level: number, forceRarity?: Rarity): ItemInstance {
    const rarity = forceRarity ?? pickWeighted(RARITY_WEIGHTS);
    const weaponType = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    const baseName = `${weaponType.replace('_', ' ')}`;
    const name = `${prefix} ${baseName} ${suffix}`;

    const affixCount = RARITIES.indexOf(rarity);
    const affixes: ItemAffix[] = [];
    const used = new Set<string>();
    for (let i = 0; i < Math.min(affixCount + 1, 5); i++) {
      let aff = AFFIX_POOL[Math.floor(Math.random() * AFFIX_POOL.length)];
      while (used.has(aff.id)) {
        aff = AFFIX_POOL[Math.floor(Math.random() * AFFIX_POOL.length)];
      }
      used.add(aff.id);
      affixes.push({
        ...aff,
        value: Math.floor((1 + level * 0.12) * (1 + affixCount * 0.25) * (5 + Math.random() * 15)),
      });
    }

    const rarityMult = 1 + RARITIES.indexOf(rarity) * 0.35;
    const dps = Math.floor((8 + level * 3) * rarityMult * (0.9 + Math.random() * 0.2));

    return {
      id: `item_${++itemCounter}_${Date.now()}`,
      name,
      baseName,
      rarity,
      type: 'weapon',
      weaponType,
      level,
      affixes,
      setId: rarity === 'legendary' && Math.random() < 0.3
        ? SET_ITEMS[Math.floor(Math.random() * SET_ITEMS.length)]
        : undefined,
      legendaryPower:
        rarity === 'legendary' || rarity === 'mythic' || rarity === 'ancient' || rarity === 'divine'
          ? LEGENDARY_POWERS[Math.floor(Math.random() * LEGENDARY_POWERS.length)]
          : undefined,
      dps,
      sellValue: Math.floor(dps * 2.5 * rarityMult),
    };
  }

  static generateArmor(level: number, forceRarity?: Rarity): ItemInstance {
    const item = this.generate(level, forceRarity);
    const armorNames = ['Plate', 'Mail', 'Robe', 'Cloak', 'Guard'];
    item.type = 'armor';
    item.baseName = armorNames[Math.floor(Math.random() * armorNames.length)];
    item.name = `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]} ${item.baseName}`;
    item.dps = 0;
    item.sellValue = Math.floor(item.sellValue * 0.85);
    return item;
  }

  static generateAccessory(level: number, forceRarity?: Rarity): ItemInstance {
    const item = this.generate(level, forceRarity);
    const accNames = ['Ring', 'Amulet', 'Charm', 'Talisman'];
    item.type = 'accessory';
    item.baseName = accNames[Math.floor(Math.random() * accNames.length)];
    item.name = `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]} ${item.baseName}`;
    item.dps = 0;
    item.sellValue = Math.floor(item.sellValue * 0.9);
    return item;
  }

  static generateConsumable(level: number): ItemInstance {
    const kinds = [
      { name: 'Aether Potion', stat: 'heal', value: 40 + level * 6 },
      { name: 'Mana Draught', stat: 'mana', value: 35 + level * 5 },
      { name: 'Elixir of Might', stat: 'buff_damage', value: 15 + level * 2 },
    ];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    return {
      id: `item_${++itemCounter}_${Date.now()}`,
      name: kind.name,
      baseName: kind.name,
      rarity: 'common',
      type: 'consumable',
      level,
      affixes: [{ id: kind.stat, name: kind.name, stat: kind.stat, value: kind.value }],
      dps: 0,
      sellValue: 8 + level * 2,
    };
  }

  static generateLootBurst(level: number, count: number): ItemInstance[] {
    const items: ItemInstance[] = [];
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      if (roll < 0.12) {
        const boost = roll < 0.02 ? 'divine' : roll < 0.05 ? 'mythic' : 'legendary';
        const gen = Math.random() < 0.5 ? this.generate(level, boost as Rarity) : this.generateArmor(level, boost as Rarity);
        items.push(gen);
      } else if (roll < 0.22) {
        items.push(this.generateArmor(level));
      } else if (roll < 0.30) {
        items.push(this.generateAccessory(level));
      } else if (roll < 0.38) {
        items.push(this.generateConsumable(level));
      } else {
        items.push(this.generate(level));
      }
    }
    return items;
  }
}

import { type MaterialBag, type MaterialId, hasMaterials, consumeMaterials, addMaterial } from './Materials';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  requires: Partial<Record<MaterialId, number>>;
  output: Partial<Record<MaterialId, number>>;
  goldCost?: number;
  healAmount?: number;
  manaAmount?: number;
  buffId?: string;
  buffDuration?: number;
  damageMult?: number;
  speedMult?: number;
  regen?: number;
}

export const RECIPES: Recipe[] = [
  {
    id: 'health_potion',
    name: 'Healing Draught',
    description: 'Restores 40 HP.',
    requires: { herb: 2, water_vial: 1 },
    output: {},
    healAmount: 40,
  },
  {
    id: 'mana_tonic',
    name: 'Mana Tonic',
    description: 'Restores 35 MP.',
    requires: { herb: 1, fish: 1, water_vial: 1 },
    output: {},
    manaAmount: 35,
  },
  {
    id: 'cook_meat',
    name: 'Cook Meat',
    description: 'Turn raw meat into a hearty meal.',
    requires: { raw_meat: 1 },
    output: { cooked_meat: 1 },
  },
  {
    id: 'fishing_bait',
    name: 'Fishing Bait',
    description: 'Improves catch rate while fishing.',
    requires: { herb: 1, raw_meat: 1 },
    output: { bait: 2 },
  },
  {
    id: 'wooden_shield',
    name: 'Reinforced Plank',
    description: 'Craft timber into sellable goods.',
    requires: { wood: 4, hide: 1 },
    output: {},
    goldCost: 25,
  },
  {
    id: 'iron_ingot',
    name: 'Smelt Iron',
    description: 'Forge ore into refined metal (sell or future gear).',
    requires: { ore: 3, wood: 1 },
    output: {},
    goldCost: 40,
  },
  {
    id: 'feather_charm',
    name: 'Luck Charm',
    description: 'Slight XP boost when crafted.',
    requires: { feather: 3, herb: 2 },
    output: {},
    goldCost: 15,
  },
  {
    id: 'warrior_stew',
    name: 'Warrior Stew',
    description: 'Battle meal — +15% damage for 60s.',
    requires: { cooked_meat: 2, herb: 1, fish: 1 },
    output: {},
    buffId: 'war_stew',
    buffDuration: 60,
    damageMult: 1.15,
  },
  {
    id: 'swift_brew',
    name: 'Swift Brew',
    description: 'Travel tonic — +20% move speed for 45s.',
    requires: { herb: 2, water_vial: 1, feather: 1 },
    output: {},
    buffId: 'swift',
    buffDuration: 45,
    speedMult: 1.2,
  },
  {
    id: 'aether_elixir',
    name: 'Aether Elixir',
    description: 'Regenerate HP over time (90s).',
    requires: { crystal_shard: 2, herb: 3, water_vial: 2 },
    output: {},
    buffId: 'aether_regen',
    buffDuration: 90,
    regen: 2,
  },
  {
    id: 'relic_salve',
    name: 'Relic Salve',
    description: 'Restore 80 HP using ancient relics.',
    requires: { ancient_relic: 1, herb: 2 },
    output: {},
    healAmount: 80,
  },
];

export class CraftingSystem {
  craft(recipeId: string, bag: MaterialBag): { bag: MaterialBag; recipe: Recipe } | null {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe || !hasMaterials(bag, recipe.requires)) return null;
    let next = consumeMaterials(bag, recipe.requires);
    if (recipe.output) {
      for (const [id, amt] of Object.entries(recipe.output)) {
        next = addMaterial(next, id as MaterialId, amt ?? 0);
      }
    }
    return { bag: next, recipe };
  }

  getRecipeList(): Recipe[] {
    return RECIPES;
  }

  canCraft(bag: MaterialBag, recipe: Recipe): boolean {
    return hasMaterials(bag, recipe.requires);
  }
}

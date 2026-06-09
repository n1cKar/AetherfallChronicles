import type { EventBus } from '../utils/EventBus';
import type { MapPOI } from '../world/WorldManager';
import { CraftingSystem, type Recipe } from './CraftingSystem';
import { addMaterial, type MaterialBag, type MaterialId, MATERIALS } from './Materials';
import { WorldLifeEntities } from './WorldLifeEntities';

export interface LifeSkillsSave {
  materials: MaterialBag;
  fishCaught: number;
  wildlifeHunted: number;
  nodesGathered: number;
  itemsCrafted: number;
}

export class LifeSkillsManager {
  materials: MaterialBag = {};
  fishCaught = 0;
  wildlifeHunted = 0;
  nodesGathered = 0;
  itemsCrafted = 0;

  readonly crafting = new CraftingSystem();
  readonly worldLife: WorldLifeEntities;

  private fishingProgress = 0;
  private fishingActive = false;
  private fishingSpotId: string | null = null;
  private actionCooldown = 0;
  private wildlifeSpawnTimer = 0;

  constructor(
    private scene: import('three').Scene,
    private bus: EventBus,
  ) {
    this.worldLife = new WorldLifeEntities(scene);
  }

  loadFromSave(data?: LifeSkillsSave): void {
    if (!data) return;
    this.materials = { ...data.materials };
    this.fishCaught = data.fishCaught ?? 0;
    this.wildlifeHunted = data.wildlifeHunted ?? 0;
    this.nodesGathered = data.nodesGathered ?? 0;
    this.itemsCrafted = data.itemsCrafted ?? 0;
  }

  toSave(): LifeSkillsSave {
    return {
      materials: this.materials,
      fishCaught: this.fishCaught,
      wildlifeHunted: this.wildlifeHunted,
      nodesGathered: this.nodesGathered,
      itemsCrafted: this.itemsCrafted,
    };
  }

  spawnStarter(wx: number, wz: number, getHeight: (x: number, z: number) => number): void {
    this.worldLife.spawnStarterContent(wx, wz, getHeight);
  }

  update(
    dt: number,
    px: number,
    pz: number,
    getHeight: (x: number, z: number) => number,
    isNight: boolean,
    useAction: boolean,
    fishingWeatherBonus = 0,
  ): { hint: string; fishingPct: number } {
    if (this.actionCooldown > 0) this.actionCooldown -= dt;
    this.worldLife.update(dt, px, pz, getHeight);

    let hint = '';
    let fishingPct = 0;

    const fishSpot = this.worldLife.getNearestFishing(px, pz);
    const gather = this.worldLife.getNearestGather(px, pz);
    const wild = this.worldLife.getNearestWildlife(px, pz);

    if (fishSpot) {
      hint = this.fishingActive ? 'Fishing… hold F' : 'Press F to fish';
      if (useAction && this.actionCooldown <= 0) {
        if (!this.fishingActive) {
          this.fishingActive = true;
          this.fishingSpotId = fishSpot.id;
          this.fishingProgress = 0;
        }
      }
    } else if (this.fishingActive) {
      this.fishingActive = false;
      this.fishingProgress = 0;
    }

    if (this.fishingActive && fishSpot?.id === this.fishingSpotId) {
      const baitBonus = (this.materials.bait ?? 0) > 0 ? 1.4 : 1;
      const timeBonus = isNight ? 0.75 : 1.15;
      const rainBonus = 1 + fishingWeatherBonus;
      this.fishingProgress += dt * baitBonus * timeBonus * rainBonus;
      fishingPct = Math.min(1, this.fishingProgress / 2.8);
      if (this.fishingProgress >= 2.8) {
        this.completeFishing(isNight);
        this.fishingActive = false;
        this.fishingProgress = 0;
        this.actionCooldown = 0.8;
      }
      if (!useAction) {
        this.fishingActive = false;
        this.fishingProgress = 0;
      }
    } else if (gather && !this.fishingActive) {
      hint = `Press F to gather ${gather.type}`;
      if (useAction && this.actionCooldown <= 0) {
        const drop = this.worldLife.harvestNode(gather);
        if (drop.amount >= 0) {
          this.materials = addMaterial(this.materials, drop.type, 1);
          this.nodesGathered++;
          this.bus.emit('material_gathered', drop.type);
          this.actionCooldown = 0.5;
        }
      }
    } else if (wild && !this.fishingActive) {
      hint = 'Attack nearby wildlife to hunt';
    }

    this.wildlifeSpawnTimer -= dt;
    const alive = this.worldLife.wildlife.filter((w) => w.alive).length;
    if (this.wildlifeSpawnTimer <= 0 && alive < 3) {
      this.wildlifeSpawnTimer = 75;
      const angle = Math.random() * Math.PI * 2;
      const dist = 25 + Math.random() * 20;
      this.worldLife.spawnWildlife(
        px + Math.cos(angle) * dist,
        pz + Math.sin(angle) * dist,
        getHeight,
        Math.random() > 0.5 ? 'deer' : 'boar',
      );
    }

    return { hint, fishingPct };
  }

  private completeFishing(isNight: boolean): void {
    if ((this.materials.bait ?? 0) > 0) {
      this.materials.bait = (this.materials.bait ?? 1) - 1;
    }
    const roll = Math.random();
    const bonus = isNight ? 0.15 : 0;
    if (roll + bonus > 0.25) {
      const amt = roll > 0.7 ? 2 : 1;
      this.materials = addMaterial(this.materials, 'fish', amt);
      if (Math.random() < 0.35) this.materials = addMaterial(this.materials, 'water_vial', 1);
      this.fishCaught += amt;
      this.bus.emit('fish_caught', amt);
    }
  }

  tryHuntOnAttack(px: number, pz: number): string | null {
    const wild = this.worldLife.getNearestWildlife(px, pz, 2.8);
    if (!wild) return null;
    wild.hp -= 1;
    if (wild.hp > 0) return 'Wounded prey — strike again!';
    const drops = this.worldLife.killWildlife(wild);
    for (const d of drops) {
      this.materials = addMaterial(this.materials, d.type, d.amount);
    }
    this.wildlifeHunted++;
    this.bus.emit('wildlife_hunted');
    return `Hunted ${wild.type}! +${drops.map((d) => MATERIALS[d.type].name).join(', ')}`;
  }

  craft(recipeId: string): { ok: boolean; message: string; recipe?: Recipe } {
    const result = this.crafting.craft(recipeId, this.materials);
    if (!result) return { ok: false, message: 'Missing materials.' };
    this.materials = result.bag;
    this.itemsCrafted++;
    this.bus.emit('item_crafted', recipeId);
    let message = `Crafted ${result.recipe.name}.`;
    if (result.recipe.goldCost) message += ` (+${result.recipe.goldCost} gold value)`;
    return { ok: true, message, recipe: result.recipe };
  }

  getMapPOIs(): MapPOI[] {
    const pois: MapPOI[] = [];
    for (const s of this.worldLife.fishingSpots) {
      if (s.active) pois.push({ type: 'fish', x: s.position.x, z: s.position.z });
    }
    for (const n of this.worldLife.gatherNodes) {
      if (n.amount > 0) pois.push({ type: 'gather', x: n.position.x, z: n.position.z, meta: n.type });
    }
    for (const w of this.worldLife.wildlife) {
      if (w.alive) pois.push({ type: 'wildlife', x: w.position.x, z: w.position.z });
    }
    return pois;
  }

  sellMaterial(id: MaterialId, amount: number): number {
    const have = this.materials[id] ?? 0;
    const sell = Math.min(amount, have);
    if (sell <= 0) return 0;
    this.materials[id] = have - sell;
    const prices: Partial<Record<MaterialId, number>> = {
      herb: 4, fish: 6, ore: 8, hide: 5, feather: 3, wood: 2, cooked_meat: 7,
      crystal_shard: 15, ancient_relic: 40,
    };
    return (prices[id] ?? 3) * sell;
  }

  addMaterials(type: MaterialId, amount: number): void {
    const bonus = 1; // yield applied in Game via upgrades
    this.materials = addMaterial(this.materials, type, Math.max(1, Math.floor(amount * bonus)));
  }

  getMaterialList(): { id: MaterialId; count: number; def: typeof MATERIALS[MaterialId] }[] {
    return (Object.keys(this.materials) as MaterialId[])
      .filter((id) => (this.materials[id] ?? 0) > 0)
      .map((id) => ({ id, count: this.materials[id]!, def: MATERIALS[id] }));
  }
}

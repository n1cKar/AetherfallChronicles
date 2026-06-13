# Aetherfall Chronicles

**Developed by n1ckar**

A browser-based voxel-inspired dungeon-crawling action RPG built with **React**, **TypeScript**, **Three.js/WebGL**, **HTML5 Canvas**, and **Vite**.

## Features

- Procedural low-poly world with forests, caves, castles, ruins, lava zones, ice caverns, boss arenas, and generated dungeon sites
- Dungeon crawler layer with room clusters, traps, rune puzzles, secret passages, hidden chests, and themed enemy spawns
- Action combat with melee, bows, staffs, dodge rolling, critical hits, combo attacks, special abilities, and elemental gear damage
- Expanded enemy roster: skeletons, zombies, goblins, mages, spiders, golems, dragons, elites, and phase bosses
- Loot system with common, rare, epic, legendary, and mythical equipment, randomized affixes, enchantments, upgrades, and special effects
- Inventory, gear management, crafting, salvaging/selling, upgrades, skill trees, achievements, quests, and local save/load
- Hub NPCs including merchants, blacksmith, innkeeper, gatherers, and quest guidance
- Dynamic lighting, shadows, weather, day/night cycle, particles, minimap, world map, damage numbers, responsive touch controls, keyboard/mouse, and gamepad support
- Performance-focused chunk loading, object pooling, lazy page loading, and React-owned menu/settings/credits/character screens

## Pages

| Page | URL |
|------|-----|
| Title / Loading | `/index.html` |
| Character Select | `/character-select.html` |
| Game | `/game.html` |
| Settings | `/settings.html` |
| Credits | `/credits.html` |

Every major screen displays **Developed by n1ckar**.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5175/index.html`.

## Build

```bash
npm run typecheck
npm run build
```

## Project Structure

```text
src/
  core/         Game loop, camera, input, performance profile
  dungeon/      Procedural dungeon sites, traps, puzzles, secret chests
  world/        Chunked terrain, biomes, weather, interactables
  combat/       Enemies and combat system
  character/    Classes and player progression
  loot/         Item generation and rarities
  react/        React page components
  render/       Materials, meshes, post-processing
  ui/           HUD, minimap, inventory, damage numbers
  life/         Materials, gathering, crafting
  save/         Local persistence
  network/      Optional WebSocket realm client
```

Original work - Developed by n1ckar.

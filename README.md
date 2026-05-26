# Aetherfall Chronicles

**Developed by n1ckar**

An original browser-based 2.5D isometric low-poly fantasy Action RPG built with **Three.js**, **TypeScript**, and **Vite**.

## Features

- **Infinite procedural world** — chunked terrain streaming, 9 biomes, ruins, crystals, dungeon entrances
- **Action combat** — combos, dodge roll, 4 skills per class, hit-stop, screen shake, particles
- **5 playable classes** — Sentinel, Arcanist, Ranger, Reaver, Templar
- **Humanoid characters** — Full low-poly body with walk, attack, dodge animations
- **Physics** — Acceleration, collision, knockback, slope handling
- **World props** — Huts, chests, NPCs, torches, wells, ruins, shrines, and more
- **3-quest campaign** — Complete objectives to finish the story
- **Loot system** — 8 rarity tiers, procedural affixes, legendaries, set items
- **Immersion** — day/night cycle, dynamic weather, ambient audio
- **Polish** — post-processing, stylized PBR-ish materials, isometric camera
- **Persistence** — local save, settings, cloud-save-ready API stubs
- **Multiplayer-ready** — network manager stub for future WebSocket integration

## Pages

| Page | URL |
|------|-----|
| Title / Loading | `/index.html` |
| Character Select | `/character-select.html` |
| Game | `/game.html` |
| Settings | `/settings.html` |
| Credits | `/credits.html` |

Every screen displays **Developed by n1ckar**.

## Controls

| Input | Action |
|-------|--------|
| WASD / Arrows | Move |
| Mouse / Right-drag | Rotate camera |
| Scroll | Zoom |
| Left click / J | Attack |
| Space / K | Dodge |
| 1–4 | Skills |
| E | Interact |
| I | Inventory |
| Esc | Pause |
| Gamepad | Supported |

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/index.html`

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  core/         Game loop, camera, input
  world/        Procedural chunks, biomes, weather
  combat/       Enemies, combat system
  character/    Classes, player
  loot/         Item generation
  render/       Materials, meshes, post-FX
  ui/           HUD, damage numbers
  audio/        Web Audio manager
  save/         Local persistence
  network/      Multiplayer stubs
  pages/        Per-page entry scripts
```

## License

Original work — Developed by n1ckar

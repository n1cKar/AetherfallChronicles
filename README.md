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
- **Online realm (MMO-lite)** — WebSocket server, shared world seed, see other players with display names, realm chat
- **Life skills** — fishing, hunting, gathering, crafting

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
| E | Interact / trade with merchants |
| F | Fish / gather |
| C | Crafting panel |
| Enter | Realm chat (online) |
| I | Inventory |
| M | World map |
| Q | Journal |
| Esc | Pause |
| Gamepad | Supported |

## Quick Start

```bash
npm install
npm run dev
```

This starts **both** the Vite client and the game server (`ws://localhost:2567`).

Open `http://localhost:5173/index.html` → **Enter World** → pick a **display name** → choose **Online Realm (MMO)** → select class → play.

### Hosting multiplayer for friends

1. Run the server on a machine with a public IP or LAN IP:
   ```bash
   npm run server
   ```
2. Open port **2567** (TCP) on your firewall.
3. Friends set **Realm Server** to `ws://YOUR_IP:2567` on character select (or in Settings).

Everyone shares the same procedural world seed and sees each other in real time.

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

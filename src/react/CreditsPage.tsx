import { DEVELOPER_CREDIT, GAME_TITLE } from '../config/constants';
import { PageShell } from './PageShell';

export function CreditsPage() {
  return (
    <PageShell className="credits-page">
      <main className="credits-content panel">
        <h1 className="fantasy-title">Credits</h1>
        <section className="credit-block lead-credit">
          <h2>Game Development</h2>
          <p className="developer-name">{DEVELOPER_CREDIT}</p>
        </section>
        <section className="credit-block">
          <h2>{GAME_TITLE}</h2>
          <p>An original voxel-inspired browser dungeon crawler with low-poly action RPG combat.</p>
          <p>Engine: React, Three.js, TypeScript, Vite, HTML5 Canvas/WebGL</p>
        </section>
        <section className="credit-block">
          <h2>Systems</h2>
          <ul>
            <li>Procedural biomes, caves, ruins, castles, and dungeon arenas</li>
            <li>Action combat with melee, bows, staffs, dodge rolls, skills, and combos</li>
            <li>Common, rare, epic, legendary, and mythical loot</li>
            <li>NPC hub, merchants, blacksmith, quests, achievements, and local saves</li>
            <li>Dynamic weather, lighting, particles, minimap, and responsive controls</li>
          </ul>
        </section>
        <section className="credit-block">
          <h2>Special Thanks</h2>
          <p>To every adventurer who enters the forge and leaves with a legend.</p>
        </section>
        <a href="/index.html" className="btn">Return to Title</a>
      </main>
    </PageShell>
  );
}

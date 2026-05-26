import '../styles/global.css';
import { DEVELOPER_CREDIT, GAME_TITLE } from '../config/constants';

const tips = [
  'The Aether never ends — explore infinitely.',
  'Chain attacks to build devastating combos.',
  'World bosses lurk in corrupted biomes.',
  'Eight loot rarities await the bold.',
  DEVELOPER_CREDIT,
];

async function boot(): Promise<void> {
  document.title = GAME_TITLE;
  const fill = document.getElementById('loading-fill')!;
  const text = document.getElementById('loading-text')!;
  const menu = document.getElementById('main-menu')!;

  const steps = [
    { p: 15, t: 'Initializing Aether engine...' },
    { p: 35, t: 'Compiling procedural realms...' },
    { p: 55, t: 'Loading combat systems...' },
    { p: 75, t: 'Spawning biomes...' },
    { p: 90, t: tips[Math.floor(Math.random() * tips.length)] },
    { p: 100, t: 'Ready.' },
  ];

  for (const step of steps) {
    fill.style.width = `${step.p}%`;
    text.textContent = step.t;
    await delay(280 + Math.random() * 200);
  }

  document.getElementById('loading-bar')?.classList.add('done');
  menu.classList.remove('hidden');
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

boot();

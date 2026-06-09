import '../styles/global.css';
import { DEVELOPER_CREDIT, GAME_TITLE } from '../config/constants';

const tips = [
  'Chain kills for MULTI-KILL and RAMPAGE bonuses.',
  'Critical strikes deal double damage — build your combo.',
  'Follow the glowing quest beacon in the world.',
  'Press Enter to chat in the online realm.',
  'Fish at night for rare catches — craft bait first.',
  'World bosses await in corrupted biomes.',
  DEVELOPER_CREDIT,
];

function setupPageTransitions(): void {
  document.body.classList.add('page-enter');
  document.querySelectorAll('a[href]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = (a as HTMLAnchorElement).getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http')) return;
      e.preventDefault();
      document.body.classList.add('page-exit');
      setTimeout(() => { window.location.href = href; }, 420);
    });
  });
}

async function boot(): Promise<void> {
  document.title = GAME_TITLE;
  setupPageTransitions();
  const fill = document.getElementById('loading-fill')!;
  const text = document.getElementById('loading-text')!;
  const menu = document.getElementById('main-menu')!;
  const ring = document.querySelector('.logo-ring');

  const steps = [
    { p: 8, t: 'Awakening the Aether Engine…' },
    { p: 22, t: 'Compiling infinite procedural realms…' },
    { p: 38, t: 'Forging combat systems…' },
    { p: 52, t: 'Weaving day & night cycles…' },
    { p: 66, t: 'Spawning biomes & wildlife…' },
    { p: 80, t: 'Connecting realm network…' },
    { p: 88, t: 'Preloading realm assets…' },
    { p: 92, t: tips[Math.floor(Math.random() * tips.length)] },
    { p: 100, t: 'Enter Aetherfall.' },
  ];

  const preload = import('../core/Game').catch(() => null);
  for (const step of steps) {
    fill.style.width = `${step.p}%`;
    text.textContent = step.t;
    ring?.classList.toggle('pulse', step.p > 50);
    if (step.p >= 88) await preload;
    await delay(220 + Math.random() * 180);
  }

  document.getElementById('loading-bar')?.classList.add('done');
  await delay(200);
  menu.classList.remove('hidden');
  menu.classList.add('reveal');
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

boot();

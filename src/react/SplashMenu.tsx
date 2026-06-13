import { useEffect, useMemo, useState } from 'react';
import { DEVELOPER_CREDIT, GAME_TITLE } from '../config/constants';
import { PageShell } from './PageShell';

const tips = [
  'Chain kills for combo bonuses and critical strikes.',
  'Hidden rooms can reveal puzzle caches and rare loot.',
  'Dodge through danger, then counter with a special ability.',
  'Boss arenas scale with your level and reward stronger gear.',
  'Resources from forests, mines, caves, and ruins fuel upgrades.',
  DEVELOPER_CREDIT,
];

const loadingSteps = [
  { p: 8, t: 'Lighting the forge...' },
  { p: 22, t: 'Carving voxel dungeon halls...' },
  { p: 38, t: 'Rolling loot tables...' },
  { p: 52, t: 'Awakening skeletons, golems, and dragons...' },
  { p: 66, t: 'Threading secret doors and traps...' },
  { p: 80, t: 'Polishing low-poly shadows...' },
  { p: 90, t: 'Preparing local save data...' },
  { p: 100, t: 'Enter Aetherfall.' },
];

export function SplashMenu() {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Forging the first dungeon...');
  const [ready, setReady] = useState(false);
  const tip = useMemo(() => tips[Math.floor(Math.random() * tips.length)], []);

  useEffect(() => {
    document.title = GAME_TITLE;
    document.body.classList.add('page-enter');
    const preload = import('../core/Game').catch(() => null);
    let cancelled = false;

    async function run() {
      for (const step of loadingSteps) {
        if (cancelled) return;
        setProgress(step.p);
        setMessage(step.p === 90 ? tip : step.t);
        if (step.p >= 80) await preload;
        await new Promise((resolve) => setTimeout(resolve, 180 + Math.random() * 160));
      }
      if (!cancelled) setReady(true);
    }

    void run();
    return () => { cancelled = true; };
  }, [tip]);

  return (
    <PageShell className="splash-page" particles>
      <main className="splash-content">
        <div className={`logo-ring ${progress > 50 ? 'pulse' : ''}`} aria-hidden="true">
          <img className="logo-mark" src="/assets/aetherfall-logo.svg" alt="" />
        </div>
        <h1 className="game-title fantasy-title">{GAME_TITLE}</h1>
        <p className="developer-mark">{DEVELOPER_CREDIT}</p>
        <p className="tagline">A voxel-forged action RPG of dungeons, loot, and legends</p>

        <div className={`loading-bar ${ready ? 'done' : ''}`}>
          <div className="loading-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="loading-text">{message}</p>

        <nav className={`main-menu ${ready ? 'reveal' : 'hidden'}`} aria-label="Main menu">
          <a href="/character-select.html" className="btn">Enter Dungeon</a>
          <a href="/settings.html" className="btn btn-secondary">Settings</a>
          <a href="/credits.html" className="btn btn-secondary">Credits</a>
        </nav>
      </main>
    </PageShell>
  );
}

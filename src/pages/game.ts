import '../styles/global.css';
import { Game } from '../core/Game';
import type { ClassId } from '../config/constants';
import { CLASS_IDS } from '../config/constants';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const classId = sessionStorage.getItem('aetherfall_class') as ClassId | null;

if (!classId || !CLASS_IDS.includes(classId)) {
  window.location.href = '/character-select.html';
} else {
  const game = new Game(canvas);

  document.getElementById('btn-resume')?.addEventListener('click', () => {
    game.setPaused(false);
  });

  document.getElementById('btn-pause')?.addEventListener('click', () => {
    game.setPaused(true);
  });

  document.getElementById('btn-inventory')?.addEventListener('click', () => {
    document.getElementById('inventory-panel')?.classList.toggle('open');
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyI') {
      document.getElementById('inventory-panel')?.classList.toggle('open');
    }
  });

  const touchAttack = document.getElementById('touch-attack');
  const touchDodge = document.getElementById('touch-dodge');
  touchAttack?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ' }));
  });
  touchDodge?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  });

  game.start(classId).catch(console.error);

  window.addEventListener('beforeunload', () => game.dispose());
}

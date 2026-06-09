import '../styles/global.css';
import { Game } from '../core/Game';
import type { ClassId } from '../config/constants';
import {
  CLASS_IDS,
  SESSION_CLASS_KEY,
  SESSION_MODE_KEY,
  SESSION_NAME_KEY,
  SESSION_SERVER_KEY,
} from '../config/constants';
import { getDefaultServerUrl } from '../network/NetworkClient';
import { applyMobileDocumentClass } from '../utils/device';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const classId = sessionStorage.getItem(SESSION_CLASS_KEY) as ClassId | null;
const displayName = sessionStorage.getItem(SESSION_NAME_KEY)?.trim();
const online = sessionStorage.getItem(SESSION_MODE_KEY) === 'online';
const serverUrl = sessionStorage.getItem(SESSION_SERVER_KEY) ?? getDefaultServerUrl();

applyMobileDocumentClass();
window.addEventListener('resize', applyMobileDocumentClass);
window.addEventListener('orientationchange', () => {
  setTimeout(applyMobileDocumentClass, 150);
});

if (!classId || !CLASS_IDS.includes(classId) || !displayName || displayName.length < 2) {
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

  const unlockAudio = () => game.unlockAudio();
  document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  document.addEventListener('click', unlockAudio, { once: true });

  game.start(classId, displayName, { online, serverUrl }).catch(console.error);

  window.addEventListener('beforeunload', () => game.dispose());
}

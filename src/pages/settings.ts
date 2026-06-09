import '../styles/global.css';
import { SaveManager, type GameSettings } from '../save/SaveManager';

const form = document.getElementById('settings-form')!;
const status = document.getElementById('save-status')!;

function loadForm(s: GameSettings): void {
  (document.getElementById('masterVolume') as HTMLInputElement).value = String(s.masterVolume);
  (document.getElementById('musicVolume') as HTMLInputElement).value = String(s.musicVolume);
  (document.getElementById('sfxVolume') as HTMLInputElement).value = String(s.sfxVolume);
  (document.getElementById('graphicsQuality') as HTMLSelectElement).value = s.graphicsQuality;
  (document.getElementById('shadows') as HTMLInputElement).checked = s.shadows;
  (document.getElementById('bloom') as HTMLInputElement).checked = s.bloom;
  (document.getElementById('showDamageNumbers') as HTMLInputElement).checked = s.showDamageNumbers;
  (document.getElementById('autoLoot') as HTMLInputElement).checked = s.autoLoot;
  (document.getElementById('particles') as HTMLSelectElement).value = s.particles;
  (document.getElementById('controllerSensitivity') as HTMLInputElement).value = String(s.controllerSensitivity);
  (document.getElementById('serverUrl') as HTMLInputElement).value = s.serverUrl ?? 'ws://localhost:2567';
}

function readForm(): GameSettings {
  return {
    masterVolume: parseFloat((document.getElementById('masterVolume') as HTMLInputElement).value),
    musicVolume: parseFloat((document.getElementById('musicVolume') as HTMLInputElement).value),
    sfxVolume: parseFloat((document.getElementById('sfxVolume') as HTMLInputElement).value),
    graphicsQuality: (document.getElementById('graphicsQuality') as HTMLSelectElement).value as GameSettings['graphicsQuality'],
    shadows: (document.getElementById('shadows') as HTMLInputElement).checked,
    bloom: (document.getElementById('bloom') as HTMLInputElement).checked,
    showDamageNumbers: (document.getElementById('showDamageNumbers') as HTMLInputElement).checked,
    autoLoot: (document.getElementById('autoLoot') as HTMLInputElement).checked,
    particles: (document.getElementById('particles') as HTMLSelectElement).value as GameSettings['particles'],
    vsync: true,
    controllerSensitivity: parseFloat((document.getElementById('controllerSensitivity') as HTMLInputElement).value),
    serverUrl: (document.getElementById('serverUrl') as HTMLInputElement).value.trim() || 'ws://localhost:2567',
  };
}

loadForm(SaveManager.loadSettings());

document.getElementById('btn-save')?.addEventListener('click', () => {
  SaveManager.saveSettings(readForm());
  status.textContent = 'Settings saved.';
  setTimeout(() => { status.textContent = ''; }, 2500);
});

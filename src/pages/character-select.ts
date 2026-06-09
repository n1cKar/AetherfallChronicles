import '../styles/global.css';
import { CLASS_DEFINITIONS } from '../character/ClassDefinitions';
import type { ClassId } from '../config/constants';
import {
  DISPLAY_NAME_STORAGE_KEY,
  SESSION_CLASS_KEY,
  SESSION_MODE_KEY,
  SESSION_NAME_KEY,
  SESSION_SERVER_KEY,
} from '../config/constants';
import { getDefaultServerUrl } from '../network/NetworkClient';
import { SaveManager } from '../save/SaveManager';

let selected: ClassId | null = null;

const grid = document.getElementById('class-grid')!;
const startBtn = document.getElementById('btn-start') as HTMLButtonElement;
const nameInput = document.getElementById('player-name') as HTMLInputElement;
const serverRow = document.getElementById('server-row')!;
const serverInput = document.getElementById('server-url') as HTMLInputElement;
const modeRadios = document.querySelectorAll<HTMLInputElement>('input[name="play-mode"]');

const savedName = localStorage.getItem(DISPLAY_NAME_STORAGE_KEY)
  ?? SaveManager.loadPlayer()?.name
  ?? '';
nameInput.value = savedName;

const settings = SaveManager.loadSettings();
serverInput.value = sessionStorage.getItem(SESSION_SERVER_KEY) ?? settings.serverUrl ?? getDefaultServerUrl();

for (const radio of modeRadios) {
  radio.addEventListener('change', () => {
    const online = document.querySelector<HTMLInputElement>('input[name="play-mode"]:checked')?.value === 'online';
    serverRow.classList.toggle('hidden', !online);
  });
}

function validateName(): boolean {
  const name = nameInput.value.trim().replace(/[^\w\s\-'.]/g, '').slice(0, 16);
  const ok = name.length >= 2;
  startBtn.disabled = !selected || !ok;
  return ok;
}

nameInput.addEventListener('input', validateName);

for (const def of Object.values(CLASS_DEFINITIONS)) {
  const card = document.createElement('div');
  card.className = 'class-card panel';
  card.dataset.classId = def.id;
  card.innerHTML = `
    <h3>${def.name}</h3>
    <p class="title">${def.title}</p>
    <p>${def.description}</p>
    <p class="title">Weapon: ${def.defaultWeapon.replace('_', ' ')}</p>
  `;
  card.addEventListener('click', () => {
    document.querySelectorAll('.class-card').forEach((c) => c.classList.remove('selected'));
    card.classList.add('selected');
    selected = def.id;
    validateName();
  });
  grid.appendChild(card);
}

startBtn.addEventListener('click', () => {
  if (!selected || !validateName()) return;
  const name = nameInput.value.trim().replace(/[^\w\s\-'.]/g, '').slice(0, 16);
  const mode = document.querySelector<HTMLInputElement>('input[name="play-mode"]:checked')?.value ?? 'solo';
  localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, name);
  sessionStorage.setItem(SESSION_CLASS_KEY, selected);
  sessionStorage.setItem(SESSION_NAME_KEY, name);
  sessionStorage.setItem(SESSION_MODE_KEY, mode);
  if (mode === 'online') {
    sessionStorage.setItem(SESSION_SERVER_KEY, serverInput.value.trim() || getDefaultServerUrl());
  }
  window.location.href = '/game.html';
});

validateName();

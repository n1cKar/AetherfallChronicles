import '../styles/global.css';
import { CLASS_DEFINITIONS } from '../character/ClassDefinitions';
import type { ClassId } from '../config/constants';

let selected: ClassId | null = null;

const grid = document.getElementById('class-grid')!;
const startBtn = document.getElementById('btn-start') as HTMLButtonElement;

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
    startBtn.disabled = false;
  });
  grid.appendChild(card);
}

startBtn.addEventListener('click', () => {
  if (!selected) return;
  sessionStorage.setItem('aetherfall_class', selected);
  window.location.href = '/game.html';
});

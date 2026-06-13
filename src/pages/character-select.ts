import '../styles/global.css';
import '../styles/menu.css';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { CharacterSelectPage } from '../react/CharacterSelectPage';

createRoot(document.getElementById('character-root')!).render(createElement(CharacterSelectPage));

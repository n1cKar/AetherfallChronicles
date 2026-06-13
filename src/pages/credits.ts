import '../styles/global.css';
import '../styles/menu.css';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { CreditsPage } from '../react/CreditsPage';

createRoot(document.getElementById('credits-root')!).render(createElement(CreditsPage));

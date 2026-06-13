import '../styles/global.css';
import '../styles/menu.css';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsPage } from '../react/SettingsPage';

createRoot(document.getElementById('settings-root')!).render(createElement(SettingsPage));

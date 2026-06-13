import { useMemo, useState } from 'react';
import { CLASS_DEFINITIONS } from '../character/ClassDefinitions';
import type { ClassId } from '../config/constants';
import {
  DEVELOPER_CREDIT,
  DISPLAY_NAME_STORAGE_KEY,
  GAME_TITLE,
  SESSION_CLASS_KEY,
  SESSION_MODE_KEY,
  SESSION_NAME_KEY,
  SESSION_SERVER_KEY,
} from '../config/constants';
import { getDefaultServerUrl } from '../network/NetworkClient';
import { SaveManager } from '../save/SaveManager';
import { PageShell } from './PageShell';

export function CharacterSelectPage() {
  const savedName = useMemo(() => (
    localStorage.getItem(DISPLAY_NAME_STORAGE_KEY)
    ?? SaveManager.loadPlayer()?.name
    ?? ''
  ), []);
  const settings = useMemo(() => SaveManager.loadSettings(), []);
  const [selected, setSelected] = useState<ClassId | null>(null);
  const [name, setName] = useState(savedName);
  const [mode, setMode] = useState<'solo' | 'online'>('solo');
  const [serverUrl, setServerUrl] = useState(sessionStorage.getItem(SESSION_SERVER_KEY) ?? settings.serverUrl ?? getDefaultServerUrl());

  const cleanName = name.trim().replace(/[^\w\s\-'.]/g, '').slice(0, 16);
  const canStart = !!selected && cleanName.length >= 2;

  function start() {
    if (!selected || !canStart) return;
    localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, cleanName);
    sessionStorage.setItem(SESSION_CLASS_KEY, selected);
    sessionStorage.setItem(SESSION_NAME_KEY, cleanName);
    sessionStorage.setItem(SESSION_MODE_KEY, mode);
    if (mode === 'online') {
      sessionStorage.setItem(SESSION_SERVER_KEY, serverUrl.trim() || getDefaultServerUrl());
    }
    window.location.href = '/game.html';
  }

  return (
    <PageShell className="char-select-page">
      <main className="char-select-content">
        <h1 className="fantasy-title page-title">Choose Your Legend</h1>
        <p className="developer-mark">{DEVELOPER_CREDIT}</p>
        <p className="subtitle">{GAME_TITLE} begins at the hub forge.</p>

        <section className="join-panel panel">
          <label className="join-label" htmlFor="player-name">Display Name</label>
          <input
            id="player-name"
            className="join-input"
            type="text"
            maxLength={16}
            placeholder="2-16 characters"
            autoComplete="username"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="mode-row">
            <label className="mode-option">
              <input type="radio" name="play-mode" value="solo" checked={mode === 'solo'} onChange={() => setMode('solo')} />
              <span>Solo Adventure</span>
            </label>
            <label className="mode-option">
              <input type="radio" name="play-mode" value="online" checked={mode === 'online'} onChange={() => setMode('online')} />
              <span>Online Realm</span>
            </label>
          </div>

          <div className={`server-row ${mode === 'online' ? '' : 'hidden'}`}>
            <label className="join-label" htmlFor="server-url">Realm Server</label>
            <input id="server-url" className="join-input" type="text" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
            <p className="join-hint">Run <code>npm run dev</code> to start game + server together.</p>
          </div>
        </section>

        <div className="class-grid">
          {Object.values(CLASS_DEFINITIONS).map((def) => (
            <button
              key={def.id}
              className={`class-card panel ${selected === def.id ? 'selected' : ''}`}
              type="button"
              onClick={() => setSelected(def.id)}
            >
              <h3>{def.name}</h3>
              <p className="title">{def.title}</p>
              <p>{def.description}</p>
              <p className="title">Weapon: {def.defaultWeapon.replace('_', ' ')}</p>
            </button>
          ))}
        </div>
        <div className="char-actions">
          <a href="/index.html" className="btn btn-secondary">Back</a>
          <button type="button" className="btn" disabled={!canStart} onClick={start}>Begin Journey</button>
        </div>
      </main>
    </PageShell>
  );
}

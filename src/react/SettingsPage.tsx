import { useMemo, useState } from 'react';
import { DEVELOPER_CREDIT, GAME_TITLE } from '../config/constants';
import { SaveManager, type GameSettings } from '../save/SaveManager';
import { PageShell } from './PageShell';

export function SettingsPage() {
  const initial = useMemo(() => SaveManager.loadSettings(), []);
  const [settings, setSettings] = useState<GameSettings>(initial);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function save() {
    SaveManager.saveSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

  return (
    <PageShell className="settings-page">
      <main className="settings-content panel">
        <h1 className="fantasy-title">Settings</h1>
        <p className="developer-mark">{DEVELOPER_CREDIT}</p>
        <form className="settings-form">
          <label>Master Volume <input type="range" min="0" max="1" step="0.05" value={settings.masterVolume} onChange={(e) => update('masterVolume', Number(e.target.value))} /></label>
          <label>Music Volume <input type="range" min="0" max="1" step="0.05" value={settings.musicVolume} onChange={(e) => update('musicVolume', Number(e.target.value))} /></label>
          <label>SFX Volume <input type="range" min="0" max="1" step="0.05" value={settings.sfxVolume} onChange={(e) => update('sfxVolume', Number(e.target.value))} /></label>
          <label>Graphics Quality
            <select value={settings.graphicsQuality} onChange={(e) => update('graphicsQuality', e.target.value as GameSettings['graphicsQuality'])}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </label>
          <label className="toggle-row"><input type="checkbox" checked={settings.shadows} onChange={(e) => update('shadows', e.target.checked)} /> Shadows</label>
          <label className="toggle-row"><input type="checkbox" checked={settings.bloom} onChange={(e) => update('bloom', e.target.checked)} /> Bloom</label>
          <label className="toggle-row"><input type="checkbox" checked={settings.showDamageNumbers} onChange={(e) => update('showDamageNumbers', e.target.checked)} /> Damage Numbers</label>
          <label className="toggle-row"><input type="checkbox" checked={settings.autoLoot} onChange={(e) => update('autoLoot', e.target.checked)} /> Auto Loot</label>
          <label>Particles
            <select value={settings.particles} onChange={(e) => update('particles', e.target.value as GameSettings['particles'])}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>Controller Sensitivity <input type="range" min="0.5" max="2" step="0.1" value={settings.controllerSensitivity} onChange={(e) => update('controllerSensitivity', Number(e.target.value))} /></label>
          <label>Online Realm Server <input value={settings.serverUrl ?? ''} onChange={(e) => update('serverUrl', e.target.value || 'ws://localhost:2567')} placeholder="ws://localhost:2567" /></label>
        </form>
        <div className="settings-actions">
          <button type="button" className="btn" onClick={save}>Save</button>
          <a href="/index.html" className="btn btn-secondary">Back</a>
        </div>
        <p className="save-status">{saved ? `${GAME_TITLE} settings saved.` : ''}</p>
      </main>
    </PageShell>
  );
}

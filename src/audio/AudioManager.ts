/**
 * Dynamic music + SFX via Web Audio API.
 * Music shifts: exploration → tension → combat → boss by enemy proximity.
 * Developed by n1ckar
 */

import type { GameSettings } from '../save/SaveManager';
import { MusicEngine, type MusicContext } from './MusicEngine';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private natureGain: GainNode | null = null;
  private musicEngine: MusicEngine | null = null;
  private baseMusicLevel = 0.28;
  private lastTensionStinger = 0;
  private lastTrack = 'exploration';
  private musicStarted = false;

  init(settings: GameSettings): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.ambientGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.musicGain.connect(this.masterGain);
    this.ambientGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.createAmbientLayers();
    this.musicEngine = new MusicEngine(this.ctx, this.musicGain);
    this.applySettings(settings);
    this.musicStarted = true;
  }

  applySettings(settings: GameSettings): void {
    if (!this.masterGain) return;
    this.masterGain.gain.value = settings.masterVolume;
    this.baseMusicLevel = settings.musicVolume * 0.32;
    if (this.musicGain) this.musicGain.gain.value = this.baseMusicLevel;
    if (this.ambientGain) this.ambientGain.gain.value = settings.musicVolume * 0.14;
    if (this.sfxGain) this.sfxGain.gain.value = settings.sfxVolume;
    this.musicEngine?.setMasterLevel(1);
  }

  async resume(): Promise<void> {
    await this.ctx?.resume();
  }

  /** @deprecated Use updateMusic — kept for compatibility */
  startAmbient(_mood: string): void {
    if (!this.musicStarted && this.ctx) {
      this.musicStarted = true;
    }
  }

  updateMusic(ctx: MusicContext, dt: number): void {
    if (!this.musicEngine) return;
    this.musicEngine.update(ctx, dt);

    const track = this.musicEngine.resolveTrack(ctx);
    if (track === 'tension' && this.lastTrack === 'exploration') {
      const now = performance.now();
      if (now - this.lastTensionStinger > 6000) {
        this.lastTensionStinger = now;
        this.playEnemyAlert();
      }
    }
    this.lastTrack = track;
  }

  updateEnvironment(mood: string, weather: string, intensity: number): void {
    if (!this.ctx) return;
    const windy = ['windy', 'storm', 'blizzard'].includes(weather);
    const rainy = ['rain', 'heavy_rain', 'storm'].includes(weather);
    const snowy = ['snow', 'blizzard'].includes(weather);
    const calm = weather === 'sunny' || weather === 'clear';

    let weatherBoost = calm ? 0.04 : 0.12 + intensity * 0.22;
    if (windy) weatherBoost += 0.18;
    if (rainy) weatherBoost += 0.1;
    if (snowy) weatherBoost += 0.08;

    const moodBoost = (mood === 'eerie' || mood === 'dark' || mood === 'boss') ? 0.18 : 0.1;
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(weatherBoost + moodBoost * 0.3, this.ctx.currentTime, 0.7);
    }
    if (this.windFilter) {
      let base = 560;
      if (snowy) base = 420;
      else if (rainy) base = 780;
      else if (windy) base = 920;
      this.windFilter.frequency.setTargetAtTime(base + intensity * 280, this.ctx.currentTime, 0.8);
    }
    if (this.natureGain) {
      const n = (mood === 'peaceful' || mood === 'magical') && calm ? 0.1 : 0.03;
      this.natureGain.gain.setTargetAtTime(n * (1 - intensity * (rainy ? 0.8 : 0.5)), this.ctx.currentTime, 1);
    }
  }

  // ─── SFX ───

  playSwing(): void {
    this.playNoiseBurst(0.04, 800, 0.12);
    this.playTone(280 + Math.random() * 60, 0.05, 'triangle', 0.08);
  }

  playHit(): void {
    this.playTone(160 + Math.random() * 90, 0.09, 'square', 0.14);
    this.playNoiseBurst(0.06, 400, 0.1);
  }

  playPlayerHurt(): void {
    this.playTone(90 + Math.random() * 30, 0.15, 'sawtooth', 0.18);
    this.duckMusicBrief(0.55);
  }

  playEnemyDeath(tier: 'normal' | 'elite' | 'boss' = 'normal'): void {
    const base = tier === 'boss' ? 80 : tier === 'elite' ? 120 : 200;
    this.playTone(base, 0.12, 'sawtooth', 0.12);
    setTimeout(() => this.playTone(base * 0.6, 0.18, 'sine', 0.1), 60);
    if (tier === 'boss') this.playNoiseBurst(0.25, 200, 0.2);
  }

  playBossRoar(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 1.2);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.35, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 400;
    osc.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.5);
  }

  playEnemyAlert(): void {
    this.playTone(330, 0.08, 'triangle', 0.1);
    setTimeout(() => this.playTone(440, 0.1, 'triangle', 0.08), 90);
  }

  playLoot(): void {
    this.playTone(520, 0.12, 'sine', 0.14);
    setTimeout(() => this.playTone(780, 0.1, 'sine', 0.12), 80);
    setTimeout(() => this.playTone(1040, 0.08, 'sine', 0.1), 160);
  }

  playLevelUp(): void {
    [440, 554, 659, 880, 1108].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.22, 'sine', 0.16), i * 90);
    });
  }

  playCrit(): void {
    this.playTone(220, 0.06, 'sawtooth', 0.16);
    setTimeout(() => this.playTone(660, 0.12, 'square', 0.14), 40);
    this.playNoiseBurst(0.08, 1200, 0.12);
  }

  playDodge(): void {
    this.playTone(420, 0.04, 'triangle', 0.1);
    setTimeout(() => this.playTone(220, 0.1, 'sine', 0.08), 25);
    this.playNoiseBurst(0.05, 2000, 0.06);
  }

  playQuestComplete(): void {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.28, 'sine', 0.15), i * 110);
    });
  }

  playSkillCast(): void {
    this.playTone(600, 0.06, 'sine', 0.1);
    setTimeout(() => this.playTone(900, 0.1, 'triangle', 0.12), 40);
    this.playNoiseBurst(0.1, 3000, 0.08);
  }

  playFootstep(): void {
    this.playNoiseBurst(0.03, 300, 0.04);
  }

  duckMusicBrief(amount = 0.5): void {
    if (!this.musicGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.baseMusicLevel * amount, now);
    this.musicGain.gain.linearRampToValueAtTime(this.baseMusicLevel, now + 0.35);
  }

  dispose(): void {
    this.musicEngine?.dispose();
    this.musicEngine = null;
    try { this.windSource?.stop(); } catch { /* */ }
  }

  private playTone(freq: number, duration: number, type: OscillatorType, vol = 0.15): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private playNoiseBurst(duration: number, filterFreq: number, vol: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = filterFreq;
    f.Q.value = 0.8;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  private createAmbientLayers(): void {
    if (!this.ctx || !this.ambientGain) return;

    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.7;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 620;
    windFilter.Q.value = 0.45;
    const windGain = this.ctx.createGain();
    windGain.gain.value = 0.08;
    src.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.ambientGain);
    src.start();
    this.windSource = src;
    this.windFilter = windFilter;
    this.windGain = windGain;

    const natureGain = this.ctx.createGain();
    natureGain.gain.value = 0.05;
    natureGain.connect(this.ambientGain);
    const natureTone = this.ctx.createOscillator();
    const natureFilter = this.ctx.createBiquadFilter();
    natureTone.type = 'sine';
    natureTone.frequency.value = 240;
    natureFilter.type = 'bandpass';
    natureFilter.frequency.value = 980;
    natureFilter.Q.value = 0.7;
    natureTone.connect(natureFilter);
    natureFilter.connect(natureGain);
    natureTone.start();
    const lfo = this.ctx.createOscillator();
    const lfoAmp = this.ctx.createGain();
    lfo.frequency.value = 0.17;
    lfoAmp.gain.value = 0.02;
    lfo.connect(lfoAmp);
    lfoAmp.connect(natureGain.gain);
    lfo.start();
    this.natureGain = natureGain;
  }
}

export type { MusicContext };

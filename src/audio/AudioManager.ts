/**
 * Procedural ambient + combat audio via Web Audio API.
 * Replace with orchestral assets in production builds.
 * Developed by n1ckar
 */

import type { GameSettings } from '../save/SaveManager';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private padOscillators: OscillatorNode[] = [];
  private padGain: GainNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private natureLfo: OscillatorNode | null = null;
  private natureGain: GainNode | null = null;
  private musicPulseTimer: number | null = null;
  private currentMood = '';
  private baseMusicLevel = 0.22;

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
    this.applySettings(settings);
  }

  applySettings(settings: GameSettings): void {
    if (!this.masterGain) return;
    this.masterGain.gain.value = settings.masterVolume;
    this.baseMusicLevel = settings.musicVolume * 0.22;
    if (this.musicGain) this.musicGain.gain.value = this.baseMusicLevel;
    if (this.ambientGain) this.ambientGain.gain.value = settings.musicVolume * 0.12;
    if (this.sfxGain) this.sfxGain.gain.value = settings.sfxVolume;
  }

  async resume(): Promise<void> {
    await this.ctx?.resume();
  }

  startAmbient(mood: string): void {
    if (!this.ctx || !this.musicGain || mood === this.currentMood) return;
    this.stopMusic();
    this.currentMood = mood;
    const freqs: Record<string, number> = {
      peaceful: 110,
      eerie: 87,
      cold: 98,
      epic: 82,
      intense: 73,
      boss: 65,
      magical: 130,
      dark: 77,
      mystic: 105,
    };
    const root = freqs[mood] ?? 110;
    const chord = [root, root * 1.25, root * 1.5];
    const padGain = this.ctx.createGain();
    padGain.gain.value = 0.0001;
    padGain.connect(this.musicGain);
    this.padGain = padGain;

    for (const f of chord) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.value = f;
      filter.type = 'lowpass';
      filter.frequency.value = 950;
      osc.connect(filter);
      filter.connect(padGain);
      osc.start();
      this.padOscillators.push(osc);
    }

    padGain.gain.cancelScheduledValues(this.ctx.currentTime);
    padGain.gain.exponentialRampToValueAtTime(0.4, this.ctx.currentTime + 1.2);

    // Simple rhythmic pulse for "real game feel".
    if (this.musicPulseTimer) window.clearInterval(this.musicPulseTimer);
    this.musicPulseTimer = window.setInterval(() => {
      if (!this.ctx || !this.padGain) return;
      const now = this.ctx.currentTime;
      this.padGain.gain.cancelScheduledValues(now);
      this.padGain.gain.setValueAtTime(this.padGain.gain.value, now);
      this.padGain.gain.linearRampToValueAtTime(0.5, now + 0.25);
      this.padGain.gain.linearRampToValueAtTime(0.35, now + 0.95);
    }, 1200);
  }

  stopMusic(): void {
    for (const osc of this.padOscillators) {
      try { osc.stop(); } catch { /* */ }
    }
    this.padOscillators = [];
    if (this.padGain && this.ctx) {
      this.padGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.padGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.padGain.disconnect();
    }
    this.padGain = null;
    if (this.musicPulseTimer) {
      window.clearInterval(this.musicPulseTimer);
      this.musicPulseTimer = null;
    }
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

  playHit(): void {
    this.playTone(180 + Math.random() * 80, 0.08, 'square');
  }

  playLoot(): void {
    this.playTone(520, 0.12, 'sine');
    setTimeout(() => this.playTone(780, 0.1, 'sine'), 80);
  }

  playLevelUp(): void {
    [440, 554, 659, 880].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, 'sine'), i * 100);
    });
  }

  playCrit(): void {
    this.playTone(220, 0.06, 'sawtooth');
    setTimeout(() => this.playTone(440, 0.1, 'square'), 40);
  }

  playDodge(): void {
    this.playTone(320, 0.05, 'triangle');
    setTimeout(() => this.playTone(180, 0.08, 'sine'), 30);
  }

  playQuestComplete(): void {
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.25, 'sine'), i * 120);
    });
  }

  private playTone(freq: number, duration: number, type: OscillatorType): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private createAmbientLayers(): void {
    if (!this.ctx || !this.ambientGain) return;

    // Wind bed using filtered noise.
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

    // Nature motion layer (slow wobble).
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
    this.natureLfo = lfo;
  }

  duckCombat(active: boolean): void {
    if (!this.musicGain || !this.ctx) return;
    const target = active ? this.baseMusicLevel * 0.35 : this.baseMusicLevel;
    this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
  }
}

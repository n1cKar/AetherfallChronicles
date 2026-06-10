/**
 * Calm, ultra-smooth procedural ambient music engine with slow transitions
 * designed to minimize ear fatigue and maximize relaxation.
 */

export type MusicTrackId = 'exploration' | 'tension' | 'combat' | 'boss' | 'arena' | 'night';

interface TrackDef {
  root: number;
  bpm: number;
  padGain: number;
  bassGain: number;
  arpGain: number;
  drumGain: number;
  padFilter: number;
  darkness: number;
}

// Slightly lowered frequencies for a deeper, warmer foundational tone
const MOOD_ROOT: Record<string, number> = {
  peaceful: 130.81, // C3 - Very grounding
  eerie: 110.00,    // A2
  cold: 116.54,
  epic: 110.0,
  intense: 98.0,
  boss: 82.41,
  magical: 146.83,
  dark: 98.0,
  mystic: 130.81,
};

const TRACKS: Record<MusicTrackId, TrackDef> = {
  // Exploration is now incredibly quiet, slow, and completely drumless
  exploration: { root: 130, bpm: 60, padGain: 0.25, bassGain: 0.04, arpGain: 0.04, drumGain: 0, padFilter: 450, darkness: 0 },
  tension: { root: 130, bpm: 65, padGain: 0.28, bassGain: 0.08, arpGain: 0.03, drumGain: 0.02, padFilter: 400, darkness: 0.2 },
  combat: { root: 110, bpm: 95, padGain: 0.22, bassGain: 0.18, arpGain: 0.10, drumGain: 0.12, padFilter: 700, darkness: 0.1 },
  boss: { root: 82, bpm: 80, padGain: 0.30, bassGain: 0.22, arpGain: 0.08, drumGain: 0.16, padFilter: 500, darkness: 0.3 },
  arena: { root: 98, bpm: 100, padGain: 0.22, bassGain: 0.20, arpGain: 0.12, drumGain: 0.18, padFilter: 800, darkness: 0.1 },
  night: { root: 130, bpm: 52, padGain: 0.30, bassGain: 0.05, arpGain: 0.02, drumGain: 0, padFilter: 350, darkness: 0.4 },
};

// Pentagonic and minor scales for dreamy, non-resolving emotional beds
const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 7, 9],     // Pentatonic major - impossible to sound harsh
  minor: [0, 3, 5, 7, 10],    // Soft minor
  phrygian: [0, 1, 5, 7, 8],
  dorian: [0, 2, 3, 7, 9],
};

export interface MusicContext {
  biomeMood: string;
  nearestEnemy: number;
  enemiesChasing: number;
  enemiesAttacking: number;
  bossNearby: boolean;
  eliteNearby: boolean;
  inCombat: boolean;
  arenaActive: boolean;
  spireActive: boolean;
  nightFactor: number;
  weather: string;
}

export class MusicEngine {
  private ctx: AudioContext;
  private output: GainNode;
  private padBus: GainNode;
  private bassBus: GainNode;
  private arpBus: GainNode;
  private drumBus: GainNode;
  private delayNode: DelayNode;
  private delayFeedback: GainNode;

  private pads: { osc: OscillatorNode; filter: BiquadFilterNode }[] = [];
  private bassOsc: OscillatorNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;

  private arpOsc: OscillatorNode | null = null;
  private arpGain: GainNode | null = null;
  private drumTimer: any = null;
  private arpTimer: any = null;
  private arpStep = 0;

  private currentTrack: MusicTrackId = 'exploration';
  private targetTrack: MusicTrackId = 'exploration';
  private blend = 1;
  private moodRoot = 130;
  private currentScaleName = 'major';

  constructor(ctx: AudioContext, musicGain: GainNode) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 0.55; // Tamed master volume for background comfort
    this.output.connect(musicGain);

    this.padBus = ctx.createGain();
    this.bassBus = ctx.createGain();
    this.arpBus = ctx.createGain();
    this.drumBus = ctx.createGain();

    // Large space simulator (Lush Stereo Delay Environment)
    this.delayNode = ctx.createDelay();
    this.delayFeedback = ctx.createGain();
    this.delayNode.delayTime.value = 0.45; // Slow, echoing space
    this.delayFeedback.gain.value = 0.45;  // Sends sounds bouncing off into space

    this.arpBus.connect(this.delayNode);
    this.padBus.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);

    this.padBus.connect(this.output);
    this.bassBus.connect(this.output);
    this.arpBus.connect(this.output);
    this.drumBus.connect(this.output);
    this.delayNode.connect(this.output);

    this.initPads();
    this.initBass();

    this.startArpLoop();
    this.startDrumLoop();
    this.applyTrackMix('exploration', 1);
  }

  resolveTrack(ctx: MusicContext): MusicTrackId {
    if (ctx.arenaActive || ctx.spireActive) return 'arena';
    if (ctx.bossNearby || (ctx.enemiesAttacking > 0 && ctx.nearestEnemy < 10)) return 'boss';
    if (ctx.inCombat || ctx.enemiesChasing >= 2) return 'combat';
    if (ctx.nearestEnemy < 20 || ctx.eliteNearby) return 'tension';
    if (ctx.nightFactor > 0.55 && ctx.nearestEnemy > 25) return 'night';
    return 'exploration';
  }

  update(ctx: MusicContext, dt: number): void {
    const next = this.resolveTrack(ctx);
    this.moodRoot = MOOD_ROOT[ctx.biomeMood] ?? 130;
    this.currentScaleName = ctx.biomeMood === 'eerie' || ctx.biomeMood === 'dark' ? 'phrygian'
      : ctx.biomeMood === 'cold' ? 'minor' : ctx.biomeMood === 'magical' ? 'dorian' : 'major';

    if (next !== this.targetTrack) {
      this.targetTrack = next;
      this.blend = 0;
    }

    if (this.blend < 1) {
      // Intentionally slow transition rate (takes ~4-5 seconds to fully mutate tracks)
      this.blend = Math.min(1, this.blend + dt * 0.22);
    }

    this.applyTrackMix(this.targetTrack, this.blend);
    this.updateDynamicSynthParameters();
  }

  private updateDynamicSynthParameters(): void {
    const now = this.ctx.currentTime;
    const t = TRACKS[this.targetTrack];
    const scale = SCALES[this.currentScaleName] ?? SCALES.major;
    const targetRoot = this.moodRoot * (this.targetTrack === 'boss' ? 0.75 : 1);

    // Smoothly glide running pad frequencies over 2.5 seconds to morph chords seamlessly
    const chordOffsets = [scale[0], scale[2], scale[4]];
    this.pads.forEach((pad, index) => {
      const offset = chordOffsets[index % chordOffsets.length];
      const targetFreq = targetRoot * 2 ** (offset / 12);
      pad.osc.frequency.setTargetAtTime(targetFreq, now, 2.5);
      pad.filter.frequency.setTargetAtTime(t.padFilter, now, 1.2);
    });

    if (this.bassOsc && this.bassFilter) {
      this.bassOsc.frequency.setTargetAtTime(targetRoot * 0.5, now, 1.0);
      this.bassFilter.frequency.setTargetAtTime(t.padFilter * 0.5, now, 1.0);
    }
  }

  private applyTrackMix(track: MusicTrackId, blend: number): void {
    const t = TRACKS[track];
    const now = this.ctx.currentTime;

    this.padBus.gain.setTargetAtTime(t.padGain * blend, now, 1.0);
    this.bassBus.gain.setTargetAtTime(t.bassGain * blend, now, 1.0);
    this.arpBus.gain.setTargetAtTime(t.arpGain * blend, now, 0.8);
    this.drumBus.gain.setTargetAtTime(t.drumGain * blend, now, 0.8);
  }

  private initPads(): void {
    // 3 ultra-pure, comforting sine oscillators making up an ambient pad bed
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(this.moodRoot, this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime); // Low cut for a warm feel
      filter.Q.value = 0.5;

      osc.connect(filter);
      filter.connect(this.padBus);
      osc.start();

      this.pads.push({ osc, filter });
    }

    // Hypnotic, ultra-slow volume swell LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.03; // Very slow movement
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(this.padBus.gain);
    lfo.start();
  }

  private initBass(): void {
    this.bassOsc = this.ctx.createOscillator();
    this.bassFilter = this.ctx.createBiquadFilter();

    // Changed to a pure sine wave to create a pillow-soft sub bass instead of a buzz
    this.bassOsc.type = 'sine';
    this.bassOsc.frequency.setValueAtTime(this.moodRoot * 0.5, this.ctx.currentTime);

    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

    this.bassOsc.connect(this.bassFilter);
    this.bassFilter.connect(this.bassBus);
    this.bassOsc.start();
  }

  private startArpLoop(): void {
    this.arpOsc = this.ctx.createOscillator();
    this.arpGain = this.ctx.createGain();

    this.arpOsc.type = 'sine'; // Flawless round raindrop/bell sound
    this.arpGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.arpOsc.connect(this.arpGain);
    this.arpGain.connect(this.arpBus);
    this.arpOsc.start();

    const tick = () => {
      const t = TRACKS[this.targetTrack];
      const scale = SCALES[this.currentScaleName] ?? SCALES.major;
      const targetRoot = this.moodRoot * (this.targetTrack === 'boss' ? 0.75 : 1);

      if (this.arpOsc && this.arpGain && t.arpGain > 0) {
        // Slowing down the note patterns to create a sleepy, wandering melody
        const pattern = [0, 4, 2, 7, 4, 0, 2, 4];
        const noteIndex = pattern[this.arpStep % pattern.length];
        const note = scale[noteIndex % scale.length] ?? 0;

        // Softly floats up an octave occasionally
        const octave = this.arpStep % 32 > 20 ? 2 : 1;

        const freq = targetRoot * 2 ** ((note + (octave * 12)) / 12);
        const now = this.ctx.currentTime;

        this.arpOsc.frequency.setValueAtTime(freq, now);

        // Extremely soft envelope - slow attack, long release
        this.arpGain.gain.cancelScheduledValues(now);
        this.arpGain.gain.setValueAtTime(0.0001, now);
        this.arpGain.gain.linearRampToValueAtTime(0.06, now + 0.04); // Softer transient hit
        this.arpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4); // Long decay trail

        this.arpStep++;
      }

      // Notes fire at an easy-going 8th note speed relative to the low BPM
      const intervalMs = (60 / t.bpm) * 500;
      this.arpTimer = setTimeout(tick, intervalMs);
    };

    tick();
  }

  private startDrumLoop(): void {
    const tick = () => {
      const t = TRACKS[this.targetTrack];
      const now = this.ctx.currentTime;

      if (t.drumGain > 0) {
        const step = this.arpStep % 4;
        // Completely removed high hats and snares—relying purely on a soft heartbeat pulse
        if (step === 0) this.playSoftPulse(now);
      }

      const intervalMs = (60 / t.bpm) * 1000; // Calming down beat tracking to heavy downbeats
      this.drumTimer = setTimeout(tick, intervalMs);
    };

    tick();
  }

  private playSoftPulse(time: number): void {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    // Deep kick drum that sounds like a distant heartbeat rather than an electronic dance kick
    osc.type = 'sine';
    osc.frequency.setValueAtTime(75, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.15);

    g.gain.setValueAtTime(0.18, time); // Low volume presence
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(g);
    g.connect(this.drumBus);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  // Stingers are now gentle cinematic chimes rather than sudden loud interruptions
  private playStinger(baseFreq: number): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 2, now); // Sweet high chime note

    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, now);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.04, now + 0.2); // Slow rise
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5); // Long lingering finish

    osc.connect(f);
    f.connect(g);
    g.connect(this.output);
    osc.start(now);
    osc.stop(now + 1.6);
  }

  private stopPads(): void {
    this.pads.forEach(p => { try { p.osc.stop(); p.osc.disconnect(); } catch { } });
    this.pads = [];
  }

  private stopBass(): void {
    if (this.bassOsc) { try { this.bassOsc.stop(); this.bassOsc.disconnect(); } catch { } this.bassOsc = null; }
  }

  public setMasterLevel(level: number): void {
    this.output.gain.setTargetAtTime(level, this.ctx.currentTime, 0.4);
  }

  public dispose(): void {
    if (this.arpTimer) clearTimeout(this.arpTimer);
    if (this.drumTimer) clearTimeout(this.drumTimer);
    this.stopPads();
    this.stopBass();
    if (this.arpOsc) { try { this.arpOsc.stop(); } catch { } }
  }
}
import * as THREE from 'three';
import { clamp, lerp } from '../utils/math';
import type { BiomeId } from '../config/constants';

export type WeatherType =
  | 'sunny'
  | 'cloudy'
  | 'overcast'
  | 'rain'
  | 'heavy_rain'
  | 'snow'
  | 'blizzard'
  | 'windy'
  | 'storm'
  | 'mist'
  | 'arcane_mist'
  | 'clear';

export interface WeatherGameplay {
  moveSpeed: number;
  visibility: number;
  fishingBonus: number;
  enemyAggro: number;
  label: string;
  icon: string;
}

const WEATHER_META: Record<WeatherType, { label: string; icon: string }> = {
  sunny: { label: 'Sunny', icon: '☀' },
  cloudy: { label: 'Cloudy', icon: '⛅' },
  overcast: { label: 'Overcast', icon: '☁' },
  rain: { label: 'Rain', icon: '🌧' },
  heavy_rain: { label: 'Heavy Rain', icon: '🌧' },
  snow: { label: 'Snow', icon: '❄' },
  blizzard: { label: 'Blizzard', icon: '🌨' },
  windy: { label: 'Windy', icon: '💨' },
  storm: { label: 'Storm', icon: '⛈' },
  mist: { label: 'Mist', icon: '🌫' },
  arcane_mist: { label: 'Arcane Mist', icon: '✨' },
  clear: { label: 'Clear', icon: '☀' },
};

export class WeatherSystem {
  current: WeatherType = 'sunny';
  intensity = 0;
  windX = 0;
  windZ = 0;
  windStrength = 0;
  lightningFlash = 0;
  private target: WeatherType = 'sunny';
  private targetIntensity = 0;
  private timer = 0;
  private precip: THREE.Points | null = null;
  private windLeaves: THREE.Points | null = null;
  private stormTimer = 0;
  private onChange?: (w: WeatherType) => void;
  private lastAnnounced: WeatherType = 'sunny';

  constructor(private scene: THREE.Scene, particleCount = 500) {
    this.createPrecip(particleCount);
    this.createWindLeaves(80);
  }

  setChangeCallback(cb: (w: WeatherType) => void): void {
    this.onChange = cb;
  }

  private createPrecip(count: number): void {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      velocities[i * 2] = 0;
      velocities[i * 2 + 1] = 0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 2));
    const mat = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.14,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.precip = new THREE.Points(geo, mat);
    this.precip.visible = false;
    this.precip.frustumCulled = false;
    this.scene.add(this.precip);
  }

  private createWindLeaves(count: number): void {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = 2 + Math.random() * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x8a9a4a,
      size: 0.12,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.windLeaves = new THREE.Points(geo, mat);
    this.windLeaves.frustumCulled = false;
    this.scene.add(this.windLeaves);
  }

  private pickWeather(biome: BiomeId): WeatherType {
    const roll = Math.random();
    const pools: Record<BiomeId, WeatherType[]> = {
      forest: ['sunny', 'cloudy', 'overcast', 'rain', 'windy', 'mist'],
      swamp: ['mist', 'overcast', 'rain', 'heavy_rain', 'cloudy'],
      frozen: ['snow', 'blizzard', 'windy', 'overcast', 'cloudy'],
      mountain: ['windy', 'cloudy', 'snow', 'storm', 'overcast'],
      volcanic: ['windy', 'arcane_mist', 'overcast', 'storm'],
      desert: ['sunny', 'windy', 'cloudy', 'overcast'],
      hell: ['storm', 'arcane_mist', 'windy', 'heavy_rain'],
      magical: ['mist', 'arcane_mist', 'cloudy', 'sunny'],
      corrupted: ['arcane_mist', 'storm', 'heavy_rain', 'overcast', 'mist'],
    };
    const pool = pools[biome] ?? pools.forest;
    if (roll < 0.25) return 'sunny';
    return pool[Math.floor(Math.random() * pool.length)];
  }

  update(dt: number, playerPos: THREE.Vector3, biome: BiomeId, isNight: boolean): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 55 + Math.random() * 80;
      if (Math.random() < 0.42) {
        this.target = this.pickWeather(biome);
        this.targetIntensity = this.target === 'sunny' ? 0.15 : 0.45 + Math.random() * 0.55;
        if (this.target === 'storm' || this.target === 'blizzard') {
          this.targetIntensity = 0.75 + Math.random() * 0.25;
        }
      } else {
        this.target = 'sunny';
        this.targetIntensity = 0.1;
      }
      if (isNight && Math.random() < 0.3 && this.target === 'sunny') {
        this.target = 'clear';
        this.targetIntensity = 0.05;
      }
    }

    const prev = this.current;
    this.intensity = lerp(this.intensity, this.targetIntensity, dt * 0.35);
    if (this.intensity < 0.08 && this.targetIntensity < 0.15) {
      this.current = this.target === 'sunny' ? 'sunny' : 'clear';
    } else {
      this.current = this.target;
    }

    if (this.current !== prev && this.intensity > 0.2) {
      this.onChange?.(this.current);
    }

    // Wind vector shifts over time
    const windTarget = this.getWindStrength();
    this.windStrength = lerp(this.windStrength, windTarget, dt * 0.4);
    this.windX = Math.sin(Date.now() * 0.0004) * this.windStrength * 8;
    this.windZ = Math.cos(Date.now() * 0.00035) * this.windStrength * 6;

    this.updatePrecip(dt, playerPos);
    this.updateWindLeaves(dt, playerPos);

    if (this.current === 'storm' && this.intensity > 0.5) {
      this.stormTimer -= dt;
      if (this.stormTimer <= 0) {
        this.stormTimer = 4 + Math.random() * 8;
        this.lightningFlash = 1;
      }
    }
    this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.5);
  }

  private getWindStrength(): number {
    switch (this.current) {
      case 'windy': return 0.7 + this.intensity * 0.3;
      case 'storm': return 1.2;
      case 'blizzard': return 1;
      case 'heavy_rain': return 0.5;
      default: return this.intensity * 0.25;
    }
  }

  private updatePrecip(dt: number, playerPos: THREE.Vector3): void {
    if (!this.precip) return;
    const precipTypes: WeatherType[] = ['rain', 'heavy_rain', 'snow', 'blizzard', 'storm'];
    const show = precipTypes.includes(this.current) && this.intensity > 0.08;
    this.precip.visible = show;
    if (!show) return;

    const mat = this.precip.material as THREE.PointsMaterial;
    const isSnow = this.current === 'snow' || this.current === 'blizzard';
    mat.color.setHex(isSnow ? 0xffffff : 0x88bbee);
    mat.size = isSnow ? 0.18 : 0.12;
    mat.opacity = 0.4 + this.intensity * 0.45;

    const fallSpeed = isSnow ? 2.5 + this.intensity * 2 : 14 + this.intensity * 8;
    const pos = this.precip.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - dt * fallSpeed;
      let x = pos.getX(i) + this.windX * dt * (isSnow ? 0.5 : 1);
      let z = pos.getZ(i) + this.windZ * dt * (isSnow ? 0.5 : 1);
      if (y < 0) {
        x = playerPos.x + (Math.random() - 0.5) * 45;
        z = playerPos.z + (Math.random() - 0.5) * 45;
        y = 14 + Math.random() * 12;
      }
      pos.setX(i, x);
      pos.setY(i, y);
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    this.precip.position.set(playerPos.x, 0, playerPos.z);
  }

  private updateWindLeaves(dt: number, playerPos: THREE.Vector3): void {
    if (!this.windLeaves) return;
    const show = (this.current === 'windy' || this.current === 'storm' || this.windStrength > 0.4)
      && this.intensity > 0.1;
    const mat = this.windLeaves.material as THREE.PointsMaterial;
    mat.opacity = show ? 0.25 + this.windStrength * 0.35 : 0;
    if (!show) return;

    const pos = this.windLeaves.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i) + (this.windX + 2) * dt;
      let z = pos.getZ(i) + this.windZ * dt;
      let y = pos.getY(i) + Math.sin(Date.now() * 0.002 + i) * dt * 0.5;
      if (Math.abs(x - playerPos.x) > 30) x = playerPos.x - Math.sign(x - playerPos.x) * 28;
      if (Math.abs(z - playerPos.z) > 30) z = playerPos.z - Math.sign(z - playerPos.z) * 28;
      pos.setX(i, x);
      pos.setY(i, y);
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    this.windLeaves.position.set(playerPos.x, 0, playerPos.z);
  }

  getFogMultiplier(): number {
    const m: Partial<Record<WeatherType, number>> = {
      mist: 1.6, arcane_mist: 1.7, overcast: 1.2, blizzard: 1.5,
      heavy_rain: 1.35, storm: 1.45, cloudy: 1.1,
    };
    return (m[this.current] ?? 1) * (1 + this.intensity * 0.25);
  }

  getSkyDarken(): number {
    const d: Partial<Record<WeatherType, number>> = {
      overcast: 0.15, cloudy: 0.08, storm: 0.25, heavy_rain: 0.18,
      blizzard: 0.2, mist: 0.12, arcane_mist: 0.15,
    };
    return d[this.current] ?? 0;
  }

  getGameplay(): WeatherGameplay {
    const meta = WEATHER_META[this.current === 'clear' ? 'sunny' : this.current];
    let moveSpeed = 1;
    let visibility = 1;
    let fishingBonus = 0;
    let enemyAggro = 1;

    switch (this.current) {
      case 'rain':
      case 'heavy_rain':
        moveSpeed = 0.92;
        fishingBonus = 0.2;
        break;
      case 'snow':
      case 'blizzard':
        moveSpeed = 0.85;
        visibility = 0.75;
        break;
      case 'windy':
        moveSpeed = 0.95;
        enemyAggro = 1.1;
        break;
      case 'storm':
        moveSpeed = 0.88;
        visibility = 0.7;
        enemyAggro = 1.2;
        break;
      case 'mist':
      case 'arcane_mist':
        visibility = 0.8;
        fishingBonus = 0.1;
        break;
      case 'sunny':
        moveSpeed = 1.03;
        break;
      default:
        break;
    }

    return {
      moveSpeed,
      visibility,
      fishingBonus,
      enemyAggro,
      label: meta.label,
      icon: meta.icon,
    };
  }

  consumeLightningFlash(): number {
    const f = this.lightningFlash;
    return f;
  }

  dispose(): void {
    if (this.precip) {
      this.scene.remove(this.precip);
      this.precip.geometry.dispose();
      (this.precip.material as THREE.Material).dispose();
    }
    if (this.windLeaves) {
      this.scene.remove(this.windLeaves);
      this.windLeaves.geometry.dispose();
      (this.windLeaves.material as THREE.Material).dispose();
    }
  }
}

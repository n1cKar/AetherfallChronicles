import * as THREE from 'three';
import { clamp } from '../utils/math';

export type TimePeriod = 'dawn' | 'day' | 'dusk' | 'night';

export class DayNightCycle {
  time = 0.28;
  readonly cycleDuration = 360;

  private sun: THREE.DirectionalLight;
  private moon: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private hemisphere: THREE.HemisphereLight;
  private skyTint = new THREE.Color();
  private fogTint = new THREE.Color();

  constructor(
    private scene: THREE.Scene,
    biomeAmbient: number,
    biomeSun: number,
    shadowMapSize = 1024,
    shadowsEnabled = true,
  ) {
    this.ambient = new THREE.AmbientLight(biomeAmbient, 0.45);
    this.hemisphere = new THREE.HemisphereLight(0x88aacc, 0x332211, 0.35);
    this.sun = new THREE.DirectionalLight(biomeSun, 1.2);
    this.sun.castShadow = shadowsEnabled;
    this.sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 120;
    const s = 60;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.bias = -0.0002;

    this.moon = new THREE.DirectionalLight(0x6688cc, 0);
    this.moon.castShadow = false;

    scene.add(this.ambient, this.hemisphere, this.sun, this.moon);
    this.update(0);
  }

  update(dt: number): number {
    this.time = (this.time + dt / this.cycleDuration) % 1;
    const sunAngle = this.time * Math.PI * 2;
    const rawDay = Math.sin(sunAngle) * 0.5 + 0.5;
    const dayFactor = clamp(0.28 + rawDay * 0.72, 0.28, 1);
    const nightFactor = 1 - dayFactor;

    this.sun.position.set(
      Math.cos(sunAngle) * 50,
      Math.sin(sunAngle) * 40 + 10,
      Math.sin(sunAngle * 0.5) * 30,
    );
    this.sun.intensity = 0.35 + dayFactor * 1.25;
    this.ambient.intensity = 0.38 + dayFactor * 0.5;
    this.hemisphere.intensity = 0.3 + dayFactor * 0.4;

    this.moon.position.set(
      -Math.cos(sunAngle) * 40,
      Math.max(8, -Math.sin(sunAngle) * 35 + 18),
      -Math.sin(sunAngle * 0.5) * 25,
    );
    this.moon.intensity = nightFactor * 0.35;

    const daySky = new THREE.Color(0x5a88c8);
    const duskSky = new THREE.Color(0xc87858);
    const nightSky = new THREE.Color(0x121830);
    if (rawDay > 0.55) this.skyTint.copy(daySky);
    else if (rawDay > 0.25) this.skyTint.copy(duskSky).lerp(daySky, (rawDay - 0.25) / 0.3);
    else this.skyTint.copy(nightSky).lerp(duskSky, rawDay / 0.25);

    this.fogTint.copy(this.skyTint).lerp(new THREE.Color(0x0a1020), nightFactor * 0.35);
    return dayFactor;
  }

  getSkyColor(): THREE.Color {
    return this.skyTint;
  }

  getFogColor(): THREE.Color {
    return this.fogTint;
  }

  getPeriod(): TimePeriod {
    const t = this.time;
    if (t < 0.08 || t > 0.92) return 'dawn';
    if (t < 0.25) return 'day';
    if (t < 0.35) return 'dusk';
    if (t > 0.75) return 'dusk';
    if (t > 0.55) return 'night';
    return 'day';
  }

  isNight(): boolean {
    return this.time > 0.58 || this.time < 0.14;
  }

  getClockString(): string {
    const hours = Math.floor(this.time * 24);
    const mins = Math.floor((this.time * 24 - hours) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${mins.toString().padStart(2, '0')} ${ampm}`;
  }

  getSunHeight(): number {
    return Math.sin(this.time * Math.PI * 2);
  }

  followTarget(target: THREE.Vector3): void {
    this.sun.target.position.copy(target);
    this.sun.target.updateMatrixWorld();
    this.moon.target.position.copy(target);
    this.moon.target.updateMatrixWorld();
  }

  getSun(): THREE.DirectionalLight {
    return this.sun;
  }
}

import * as THREE from 'three';
import { clamp } from '../utils/math';

export type TimePeriod = 'dawn' | 'day' | 'dusk' | 'night';

export class DayNightCycle {
  time = 0.34;
  readonly cycleDuration = 420;

  private sun: THREE.DirectionalLight;
  private moon: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private hemisphere: THREE.HemisphereLight;
  private skyTint = new THREE.Color();
  private fogTint = new THREE.Color();
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private skyGroup: THREE.Group;

  constructor(
    private scene: THREE.Scene,
    biomeAmbient: number,
    biomeSun: number,
    shadowMapSize = 1024,
    shadowsEnabled = true,
  ) {
    this.ambient = new THREE.AmbientLight(biomeAmbient, 0.78);
    this.hemisphere = new THREE.HemisphereLight(0xb8d7f5, 0x66513c, 0.68);
    this.sun = new THREE.DirectionalLight(biomeSun, 1.55);
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

    this.moon = new THREE.DirectionalLight(0x8899cc, 0);
    this.moon.castShadow = false;

    this.skyGroup = new THREE.Group();
    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffeeaa, transparent: true, opacity: 0.9 }),
    );
    this.moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0.85 }),
    );
    this.skyGroup.add(this.sunMesh, this.moonMesh);
    scene.add(this.ambient, this.hemisphere, this.sun, this.moon, this.skyGroup);
    this.update(0);
  }

  update(dt: number): number {
    this.time = (this.time + dt / this.cycleDuration) % 1;
    const sunAngle = this.time * Math.PI * 2;
    const rawDay = Math.sin(sunAngle) * 0.5 + 0.5;
    const dayFactor = clamp(0.42 + rawDay * 0.58, 0.42, 1);
    const nightFactor = 1 - dayFactor;

    const sunX = Math.cos(sunAngle) * 55;
    const sunY = Math.sin(sunAngle) * 42 + 12;
    const sunZ = Math.sin(sunAngle * 0.5) * 32;
    this.sun.position.set(sunX, sunY, sunZ);
    this.sun.intensity = 0.62 + dayFactor * 1.45;
    this.ambient.intensity = 0.72 + dayFactor * 0.42;
    this.hemisphere.intensity = 0.62 + dayFactor * 0.38;

    const moonX = -Math.cos(sunAngle) * 48;
    const moonY = Math.max(10, -Math.sin(sunAngle) * 38 + 20);
    const moonZ = -Math.sin(sunAngle * 0.5) * 28;
    this.moon.position.set(moonX, moonY, moonZ);
    this.moon.intensity = 0.38 + nightFactor * 0.58;

    // Celestial billboards follow sun/moon
    this.sunMesh.position.set(sunX * 0.85, Math.max(sunY, 8), sunZ * 0.85);
    this.sunMesh.visible = dayFactor > 0.35;
    this.moonMesh.position.set(moonX * 0.85, Math.max(moonY, 12), moonZ * 0.85);
    this.moonMesh.visible = nightFactor > 0.35;

    const dawn = new THREE.Color(0xf0a878);
    const daySky = new THREE.Color(0x5a98d8);
    const dusk = new THREE.Color(0xc87858);
    const nightSky = new THREE.Color(0x253456);

    if (rawDay > 0.62) this.skyTint.copy(daySky);
    else if (rawDay > 0.38) this.skyTint.copy(daySky).lerp(dawn, (0.62 - rawDay) / 0.24);
    else if (rawDay > 0.18) this.skyTint.copy(dusk).lerp(dawn, (rawDay - 0.18) / 0.2);
    else this.skyTint.copy(nightSky).lerp(dusk, rawDay / 0.18);

    this.fogTint.copy(this.skyTint).lerp(new THREE.Color(0x26344f), nightFactor * 0.1);

    // Warm/cool hemisphere shift
    this.hemisphere.color.setHex(dayFactor > 0.4 ? 0xb8d7f5 : 0x829bcc);
    this.hemisphere.groundColor.setHex(dayFactor > 0.4 ? 0x66513c : 0x4b4056);

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
    if (t < 0.06 || t > 0.94) return 'dawn';
    if (t < 0.22) return 'day';
    if (t < 0.32) return 'dusk';
    if (t > 0.68 && t < 0.82) return 'dusk';
    if (t >= 0.55 && t <= 0.68) return 'night';
    if (t > 0.82) return 'night';
    return 'day';
  }

  isNight(): boolean {
    return this.time > 0.55 && this.time < 0.92;
  }

  isDawnOrDusk(): boolean {
    const p = this.getPeriod();
    return p === 'dawn' || p === 'dusk';
  }

  getNightFactor(): number {
    const sunAngle = this.time * Math.PI * 2;
    const rawDay = Math.sin(sunAngle) * 0.5 + 0.5;
    return 1 - clamp(0.42 + rawDay * 0.58, 0.42, 1);
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
    this.skyGroup.position.copy(target);
  }

  getSun(): THREE.DirectionalLight {
    return this.sun;
  }
}

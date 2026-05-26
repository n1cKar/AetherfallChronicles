import * as THREE from 'three';
import { clamp } from '../utils/math';

export class DayNightCycle {
  time = 0.35;
  readonly cycleDuration = 600;

  private sun: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private hemisphere: THREE.HemisphereLight;

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
    scene.add(this.ambient, this.hemisphere, this.sun);
    this.update(0);
  }

  update(dt: number): number {
    this.time = (this.time + dt / this.cycleDuration) % 1;
    const sunAngle = this.time * Math.PI * 2;
    // Keep nights readable for gameplay.
    const dayFactor = clamp(0.35 + (Math.sin(sunAngle) * 0.5 + 0.5) * 0.65, 0.35, 1);

    this.sun.position.set(
      Math.cos(sunAngle) * 50,
      Math.sin(sunAngle) * 40 + 10,
      Math.sin(sunAngle * 0.5) * 30,
    );
    this.sun.intensity = 0.45 + dayFactor * 1.15;
    this.ambient.intensity = 0.45 + dayFactor * 0.45;
    this.hemisphere.intensity = 0.35 + dayFactor * 0.35;

    const nightBlue = new THREE.Color(0x1a2040);
    const daySky = new THREE.Color(0x6a90c8);
    return dayFactor;
  }

  followTarget(target: THREE.Vector3): void {
    this.sun.target.position.copy(target);
    this.sun.target.updateMatrixWorld();
  }

  getSun(): THREE.DirectionalLight {
    return this.sun;
  }
}

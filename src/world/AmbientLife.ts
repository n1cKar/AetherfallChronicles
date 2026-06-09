import * as THREE from 'three';
import type { WeatherType } from './WeatherSystem';

/** Day/night ambient life — stars, fireflies, birds, campfire glow, dust. */
export class AmbientLife {
  private fireflies: THREE.Points | null = null;
  private stars: THREE.Points | null = null;
  private dust: THREE.Points | null = null;
  private birds: THREE.Points | null = null;
  private campfire: THREE.PointLight | null = null;
  private fireflyPhases: Float32Array | null = null;
  private birdAngles: Float32Array | null = null;

  constructor(private scene: THREE.Scene) {
    this.stars = this.createStars();
    this.dust = this.createDust();
    this.fireflies = this.createFireflies();
    this.birds = this.createBirds();
    this.campfire = new THREE.PointLight(0xff8844, 0, 14);
    this.campfire.position.set(6, 1.5, 4);
    scene.add(this.stars, this.dust, this.fireflies, this.birds, this.campfire);
  }

  private createStars(): THREE.Points {
    const n = 500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 80 + Math.random() * 140;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.38;
      pos[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
      pos[i * 3 + 1] = 28 + Math.sin(phi) * r * 0.85;
      pos[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xddeeff,
      size: 0.4,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }

  private createDust(): THREE.Points {
    const n = 70;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffeedd,
      size: 0.08,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }

  private createFireflies(): THREE.Points {
    const n = 45;
    const pos = new Float32Array(n * 3);
    this.fireflyPhases = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = 0.5 + Math.random() * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
      this.fireflyPhases[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xaaff66,
      size: 0.22,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }

  private createBirds(): THREE.Points {
    const n = 12;
    const pos = new Float32Array(n * 3);
    this.birdAngles = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = 12 + Math.random() * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      this.birdAngles[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x2a2a30,
      size: 0.35,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }

  update(
    dt: number,
    px: number,
    pz: number,
    nightFactor: number,
    time: number,
    weather: WeatherType,
    isStorm: boolean,
  ): void {
    const clearSky = weather === 'sunny' || weather === 'clear' || weather === 'cloudy';
    const badForFireflies = weather === 'rain' || weather === 'heavy_rain' || weather === 'storm' || isStorm;

    const starOp = Math.max(0, nightFactor - 0.15) * (clearSky ? 0.9 : 0.5);
    (this.stars!.material as THREE.PointsMaterial).opacity = starOp;

    const flyOp = badForFireflies ? 0 : nightFactor * 0.92;
    (this.fireflies!.material as THREE.PointsMaterial).opacity = flyOp;
    if (this.fireflyPhases && flyOp > 0) {
      const pos = this.fireflies!.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.fireflyPhases.length; i++) {
        this.fireflyPhases[i] += dt * (0.8 + (i % 5) * 0.1);
        pos.setX(i, px + Math.sin(this.fireflyPhases[i] * 1.3 + i) * (8 + i % 6));
        pos.setY(i, 0.8 + Math.sin(time * 2 + i) * 0.6 + (i % 3) * 0.4);
        pos.setZ(i, pz + Math.cos(this.fireflyPhases[i] * 0.9 + i * 0.7) * (8 + i % 5));
      }
      pos.needsUpdate = true;
    }

    const dayFactor = 1 - nightFactor;
    const birdOp = dayFactor * (clearSky ? 0.55 : 0.2) * (weather === 'storm' ? 0 : 1);
    (this.birds!.material as THREE.PointsMaterial).opacity = birdOp;
    if (this.birdAngles && birdOp > 0) {
      const pos = this.birds!.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.birdAngles.length; i++) {
        this.birdAngles[i] += dt * (0.15 + (i % 3) * 0.05);
        const r = 35 + (i % 4) * 8;
        pos.setX(i, px + Math.cos(this.birdAngles[i] + i) * r);
        pos.setY(i, 14 + Math.sin(time * 0.5 + i) * 3);
        pos.setZ(i, pz + Math.sin(this.birdAngles[i] + i * 0.7) * r);
      }
      pos.needsUpdate = true;
    }

    this.dust!.position.set(px, 0, pz);
    (this.dust!.material as THREE.PointsMaterial).opacity =
      weather === 'mist' || weather === 'arcane_mist' ? 0.2 : 0.06 + dayFactor * 0.12;

    if (this.campfire) {
      const nearCamp = (px - 6) ** 2 + (pz - 4) ** 2 < 1600;
      this.campfire.intensity = nearCamp ? nightFactor * 1.8 : nightFactor * 0.6;
      this.campfire.position.set(px < 80 ? 6 : px, 1.2, pz < 80 ? 4 : pz);
    }
  }

  dispose(): void {
    for (const p of [this.stars, this.dust, this.fireflies, this.birds]) {
      if (!p) continue;
      this.scene.remove(p);
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    }
    if (this.campfire) this.scene.remove(this.campfire);
  }
}

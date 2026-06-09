import * as THREE from 'three';

/** Night fireflies, starfield, and ambient dust for atmosphere. */
export class AmbientLife {
  private fireflies: THREE.Points | null = null;
  private stars: THREE.Points | null = null;
  private dust: THREE.Points | null = null;
  private fireflyPhases: Float32Array | null = null;

  constructor(private scene: THREE.Scene) {
    this.stars = this.createStars();
    this.dust = this.createDust();
    this.fireflies = this.createFireflies();
    scene.add(this.stars, this.dust, this.fireflies);
  }

  private createStars(): THREE.Points {
    const n = 400;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.35;
      pos[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
      pos[i * 3 + 1] = 25 + Math.sin(phi) * r * 0.8;
      pos[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xddeeff,
      size: 0.35,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }

  private createDust(): THREE.Points {
    const n = 60;
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
      opacity: 0.15,
      depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }

  private createFireflies(): THREE.Points {
    const n = 35;
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
      size: 0.2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }

  update(
    dt: number,
    px: number,
    pz: number,
    nightFactor: number,
    time: number,
  ): void {
    const starOp = Math.max(0, nightFactor - 0.2) * 0.85;
    (this.stars!.material as THREE.PointsMaterial).opacity = starOp;

    const flyOp = nightFactor * 0.9;
    (this.fireflies!.material as THREE.PointsMaterial).opacity = flyOp;
    if (this.fireflyPhases) {
      const pos = this.fireflies!.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.fireflyPhases.length; i++) {
        this.fireflyPhases[i] += dt * (0.8 + (i % 5) * 0.1);
        pos.setX(i, px + Math.sin(this.fireflyPhases[i] * 1.3 + i) * (8 + i % 6));
        pos.setY(i, 0.8 + Math.sin(time * 2 + i) * 0.6 + (i % 3) * 0.4);
        pos.setZ(i, pz + Math.cos(this.fireflyPhases[i] * 0.9 + i * 0.7) * (8 + i % 5));
      }
      pos.needsUpdate = true;
    }

    this.dust!.position.set(px, 0, pz);
    (this.dust!.material as THREE.PointsMaterial).opacity = 0.08 + (1 - nightFactor) * 0.1;
  }

  dispose(): void {
    for (const p of [this.stars, this.dust, this.fireflies]) {
      if (!p) continue;
      this.scene.remove(p);
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    }
  }
}

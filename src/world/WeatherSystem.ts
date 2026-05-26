import * as THREE from 'three';
import { clamp, lerp } from '../utils/math';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'ash' | 'arcane_mist';

export class WeatherSystem {
  current: WeatherType = 'clear';
  intensity = 0;
  private target: WeatherType = 'clear';
  private targetIntensity = 0;
  private timer = 0;
  private particles: THREE.Points | null = null;

  constructor(private scene: THREE.Scene, particleCount = 400) {
    this.createParticles(particleCount);
  }

  private createParticles(count: number): void {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    this.particles = new THREE.Points(geo, mat);
    this.particles.visible = false;
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 45 + Math.random() * 90;
      if (Math.random() < 0.35) {
        const types: WeatherType[] = ['clear', 'rain', 'snow', 'ash', 'arcane_mist'];
        this.target = types[Math.floor(Math.random() * types.length)];
        this.targetIntensity = this.target === 'clear' ? 0 : 0.4 + Math.random() * 0.6;
      } else {
        this.target = 'clear';
        this.targetIntensity = 0;
      }
    }

    this.intensity = lerp(this.intensity, this.targetIntensity, dt * 0.5);
    if (this.intensity < 0.05 && this.targetIntensity === 0) this.current = 'clear';
    else if (this.intensity > 0.1) this.current = this.target;

    if (!this.particles) return;
    const show = this.current !== 'clear' && this.intensity > 0.05;
    this.particles.visible = show;
    if (!show) return;

    const mat = this.particles.material as THREE.PointsMaterial;
    if (this.current === 'rain') mat.color.setHex(0x88aacc);
    else if (this.current === 'snow') mat.color.setHex(0xffffff);
    else if (this.current === 'ash') mat.color.setHex(0x886655);
    else mat.color.setHex(0xaa88ff);

    const pos = this.particles.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - dt * (this.current === 'snow' ? 3 : 12);
      if (y < 0) {
        pos.setX(i, playerPos.x + (Math.random() - 0.5) * 40);
        pos.setZ(i, playerPos.z + (Math.random() - 0.5) * 40);
        y = 15 + Math.random() * 10;
      }
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    this.particles.position.set(playerPos.x, 0, playerPos.z);
  }

  getFogMultiplier(): number {
    if (this.current === 'arcane_mist') return 1.5;
    if (this.current === 'ash') return 1.3;
    return 1 + this.intensity * 0.3;
  }
}

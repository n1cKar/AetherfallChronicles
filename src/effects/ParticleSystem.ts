import * as THREE from 'three';
import { ObjectPool } from '../utils/ObjectPool';

interface ParticleBurst {
  mesh: THREE.Points;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private bursts: ParticleBurst[] = [];
  private pool: ObjectPool<THREE.Points>;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pool = new ObjectPool(
      () => this.createBurstMesh(0xffffff),
      (p) => { p.visible = false; },
      32,
    );
  }

  private createBurstMesh(color: number): THREE.Points {
    const count = 24;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      velocities[i * 3] = (Math.random() - 0.5) * 8;
      velocities[i * 3 + 1] = Math.random() * 6 + 2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.25,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.visible = false;
    return points;
  }

  emitHit(position: THREE.Vector3, color: number): void {
    const points = this.pool.acquire();
    (points.material as THREE.PointsMaterial).color.setHex(color);
    points.position.copy(position);
    points.position.y += 1;
    points.visible = true;
    if (!points.parent) this.scene.add(points);
    this.bursts.push({ mesh: points, life: 0.5, maxLife: 0.5 });
  }

  emitLoot(position: THREE.Vector3, color: number): void {
    this.emitHit(position, color);
  }

  emitMagic(position: THREE.Vector3, color = 0x88aaff): void {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.emitHit(position, color), i * 50);
    }
  }

  emitFootstep(position: THREE.Vector3): void {
    const points = this.pool.acquire();
    (points.material as THREE.PointsMaterial).color.setHex(0x8a7a60);
    (points.material as THREE.PointsMaterial).size = 0.12;
    points.position.copy(position);
    points.position.y += 0.1;
    points.visible = true;
    if (!points.parent) this.scene.add(points);
    this.bursts.push({ mesh: points, life: 0.25, maxLife: 0.25 });
  }

  emitLevelUp(position: THREE.Vector3): void {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => this.emitHit(position, 0xffd700), i * 40);
    }
    this.emitMagic(position, 0xffee88);
  }

  update(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt;
      const pos = b.mesh.geometry.attributes.position as THREE.BufferAttribute;
      const vel = b.mesh.geometry.attributes.velocity as THREE.BufferAttribute;
      for (let j = 0; j < pos.count; j++) {
        pos.setX(j, pos.getX(j) + vel.getX(j) * dt);
        pos.setY(j, pos.getY(j) + vel.getY(j) * dt);
        pos.setZ(j, pos.getZ(j) + vel.getZ(j) * dt);
        vel.setY(j, vel.getY(j) - 12 * dt);
      }
      pos.needsUpdate = true;
      (b.mesh.material as THREE.PointsMaterial).opacity = b.life / b.maxLife;
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        this.pool.release(b.mesh);
        this.bursts.splice(i, 1);
      }
    }
  }
}

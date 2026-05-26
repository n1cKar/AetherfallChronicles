import * as THREE from 'three';
import type { PerformanceProfile } from '../core/PerformanceProfile';

export interface PhysicsBody {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  height: number;
  onGround: boolean;
  mass: number;
}

const _playerMin = new THREE.Vector3();
const _playerMax = new THREE.Vector3();
const _boxCenter = new THREE.Vector3();
const _boxSize = new THREE.Vector3();

export class PhysicsSystem {
  readonly gravity = -28;
  readonly groundSnap = 0.15;
  readonly maxFallSpeed = 35;
  private colliders: THREE.Box3[] = [];
  private subSteps = 1;

  setColliders(boxes: THREE.Box3[]): void {
    this.colliders = boxes;
  }

  setSubSteps(steps: number): void {
    this.subSteps = Math.max(1, steps);
  }

  /** Keep only colliders near the player */
  static filterNearby(boxes: THREE.Box3[], px: number, pz: number, radius: number): THREE.Box3[] {
    const r2 = radius * radius;
    const out: THREE.Box3[] = [];
    for (const box of boxes) {
      box.getCenter(_boxCenter);
      const dx = _boxCenter.x - px;
      const dz = _boxCenter.z - pz;
      if (dx * dx + dz * dz <= r2) out.push(box);
    }
    return out;
  }

  createBody(position: THREE.Vector3): PhysicsBody {
    return {
      position: position.clone(),
      velocity: new THREE.Vector3(),
      radius: 0.45,
      height: 1.8,
      onGround: true,
      mass: 1,
    };
  }

  move(
    body: PhysicsBody,
    wishDirX: number,
    wishDirZ: number,
    maxSpeed: number,
    dt: number,
    getHeight: (x: number, z: number) => number,
    sprint = false,
  ): { moving: boolean; speed: number } {
    const wishLen = Math.hypot(wishDirX, wishDirZ);
    const accel = sprint ? 55 : 42;
    const friction = body.onGround ? 12 : 2;

    if (wishLen > 0.01) {
      const nx = wishDirX / wishLen;
      const nz = wishDirZ / wishLen;
      body.velocity.x += (nx * maxSpeed - body.velocity.x) * Math.min(1, accel * dt);
      body.velocity.z += (nz * maxSpeed - body.velocity.z) * Math.min(1, accel * dt);
    } else {
      body.velocity.x *= Math.max(0, 1 - friction * dt);
      body.velocity.z *= Math.max(0, 1 - friction * dt);
    }

    if (!body.onGround) {
      body.velocity.y += this.gravity * dt;
      body.velocity.y = Math.max(body.velocity.y, -this.maxFallSpeed);
    }

    this.integrate(body, dt, getHeight);

    const horizontalSpeed = Math.hypot(body.velocity.x, body.velocity.z);
    return { moving: wishLen > 0.1 && horizontalSpeed > 0.5, speed: horizontalSpeed };
  }

  applyImpulse(body: PhysicsBody, ix: number, iy: number, iz: number): void {
    body.velocity.x += ix;
    body.velocity.y += iy;
    body.velocity.z += iz;
    body.onGround = false;
  }

  integrate(body: PhysicsBody, dt: number, getHeight: (x: number, z: number) => number): void {
    const steps = this.subSteps;
    const stepDt = dt / steps;

    for (let s = 0; s < steps; s++) {
      body.position.x += body.velocity.x * stepDt;
      body.position.z += body.velocity.z * stepDt;
      body.position.y += body.velocity.y * stepDt;

      this.resolveColliders(body);

      const groundY = getHeight(body.position.x, body.position.z);
      if (s === 0) {
        const sampleX = getHeight(body.position.x + 0.3, body.position.z);
        const sampleZ = getHeight(body.position.x, body.position.z + 0.3);
        const slopeX = (sampleX - groundY) / 0.3;
        const slopeZ = (sampleZ - groundY) / 0.3;
        const slopeMag = Math.hypot(slopeX, slopeZ);
        if (slopeMag > 0.85 && body.onGround) {
          body.velocity.x += (-slopeX / slopeMag) * 8 * stepDt;
          body.velocity.z += (-slopeZ / slopeMag) * 8 * stepDt;
        }
      }

      if (body.position.y <= groundY + this.groundSnap) {
        body.position.y = groundY;
        body.velocity.y = 0;
        body.onGround = true;
      } else {
        body.onGround = false;
      }
    }
  }

  private resolveColliders(body: PhysicsBody): void {
    if (this.colliders.length === 0) return;

    _playerMin.set(body.position.x - body.radius, body.position.y, body.position.z - body.radius);
    _playerMax.set(body.position.x + body.radius, body.position.y + body.height, body.position.z + body.radius);

    for (const box of this.colliders) {
      if (_playerMax.x < box.min.x || _playerMin.x > box.max.x ||
          _playerMax.z < box.min.z || _playerMin.z > box.max.z ||
          _playerMax.y < box.min.y || _playerMin.y > box.max.y) {
        continue;
      }

      box.getCenter(_boxCenter);
      box.getSize(_boxSize);
      const dx = body.position.x - _boxCenter.x;
      const dz = body.position.z - _boxCenter.z;
      const penX = body.radius + _boxSize.x * 0.5 - Math.abs(dx);
      const penZ = body.radius + _boxSize.z * 0.5 - Math.abs(dz);

      if (penX > 0 && penX < penZ) {
        body.position.x += (dx > 0 ? 1 : -1) * penX * 1.02;
        body.velocity.x *= 0.2;
      } else if (penZ > 0) {
        body.position.z += (dz > 0 ? 1 : -1) * penZ * 1.02;
        body.velocity.z *= 0.2;
      }
    }
  }

  knockback(body: PhysicsBody, fromX: number, fromZ: number, force: number): void {
    const dx = body.position.x - fromX;
    const dz = body.position.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.applyImpulse(body, (dx / len) * force, 2, (dz / len) * force);
  }
}

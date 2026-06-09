import * as THREE from 'three';

export interface PhysicsBody {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  height: number;
  onGround: boolean;
  mass: number;
  coyoteTimer: number;
  jumpBuffer: number;
  wasOnGround: boolean;
  fallStartY: number;
}

const _playerMin = new THREE.Vector3();
const _playerMax = new THREE.Vector3();
const _boxCenter = new THREE.Vector3();
const _boxSize = new THREE.Vector3();

export interface PhysicsModifiers {
  airControl?: number;
  slopeLimit?: number;
  stepHeight?: number;
  frictionMult?: number;
  speedMult?: number;
}

export class PhysicsSystem {
  readonly gravity = -32;
  readonly groundSnap = 0.12;
  readonly maxFallSpeed = 42;
  readonly jumpForce = 11;
  readonly coyoteTime = 0.12;
  readonly jumpBufferTime = 0.15;
  readonly fallDamageThreshold = 6;
  readonly fallDamagePerUnit = 2.5;

  private colliders: THREE.Box3[] = [];
  private subSteps = 1;

  setColliders(boxes: THREE.Box3[]): void {
    this.colliders = boxes;
  }

  setSubSteps(steps: number): void {
    this.subSteps = Math.max(1, steps);
  }

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
      coyoteTimer: 0,
      jumpBuffer: 0,
      wasOnGround: true,
      fallStartY: position.y,
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
    mods: PhysicsModifiers = {},
  ): { moving: boolean; speed: number; fallDamage: number } {
    const wishLen = Math.hypot(wishDirX, wishDirZ);
    const accel = (sprint ? 58 : 46) * (mods.speedMult ?? 1);
    const friction = (body.onGround ? 14 : 3) * (mods.frictionMult ?? 1);
    const airCtrl = body.onGround ? 1 : (mods.airControl ?? 0.55);

    if (wishLen > 0.01) {
      const nx = wishDirX / wishLen;
      const nz = wishDirZ / wishLen;
      const targetX = nx * maxSpeed * (mods.speedMult ?? 1);
      const targetZ = nz * maxSpeed * (mods.speedMult ?? 1);
      body.velocity.x += (targetX - body.velocity.x) * Math.min(1, accel * dt * airCtrl);
      body.velocity.z += (targetZ - body.velocity.z) * Math.min(1, accel * dt * airCtrl);
    } else {
      body.velocity.x *= Math.max(0, 1 - friction * dt);
      body.velocity.z *= Math.max(0, 1 - friction * dt);
    }

    if (!body.onGround) {
      body.velocity.y += this.gravity * dt;
      body.velocity.y = Math.max(body.velocity.y, -this.maxFallSpeed);
    }

    if (body.jumpBuffer > 0) body.jumpBuffer -= dt;
    if (body.coyoteTimer > 0) body.coyoteTimer -= dt;

    const fallDamage = this.integrate(body, dt, getHeight, mods);
    const horizontalSpeed = Math.hypot(body.velocity.x, body.velocity.z);
    return { moving: wishLen > 0.1 && horizontalSpeed > 0.5, speed: horizontalSpeed, fallDamage };
  }

  tryJump(body: PhysicsBody, forceMult = 1): boolean {
    body.jumpBuffer = this.jumpBufferTime;
    if (body.onGround || body.coyoteTimer > 0) {
      body.velocity.y = this.jumpForce * forceMult;
      body.onGround = false;
      body.coyoteTimer = 0;
      body.jumpBuffer = 0;
      return true;
    }
    return false;
  }

  applyImpulse(body: PhysicsBody, ix: number, iy: number, iz: number): void {
    body.velocity.x += ix;
    body.velocity.y += iy;
    body.velocity.z += iz;
    body.onGround = false;
  }

  integrate(
    body: PhysicsBody,
    dt: number,
    getHeight: (x: number, z: number) => number,
    mods: PhysicsModifiers = {},
  ): number {
    let fallDamage = 0;
    const steps = this.subSteps;
    const stepDt = dt / steps;
    const slopeLimit = mods.slopeLimit ?? 0.75;
    const stepHeight = mods.stepHeight ?? 0.45;

    for (let s = 0; s < steps; s++) {
      body.wasOnGround = body.onGround;
      body.position.x += body.velocity.x * stepDt;
      body.position.z += body.velocity.z * stepDt;
      body.position.y += body.velocity.y * stepDt;

      this.resolveColliders(body);
      this.tryStepUp(body, getHeight, stepHeight);

      const groundY = getHeight(body.position.x, body.position.z);
      const sampleX = getHeight(body.position.x + 0.35, body.position.z);
      const sampleZ = getHeight(body.position.x, body.position.z + 0.35);
      const slopeX = (sampleX - groundY) / 0.35;
      const slopeZ = (sampleZ - groundY) / 0.35;
      const slopeMag = Math.hypot(slopeX, slopeZ);

      if (slopeMag > slopeLimit && body.onGround) {
        const slide = Math.min(1, (slopeMag - slopeLimit) * 4);
        body.velocity.x += (-slopeX / (slopeMag || 1)) * 14 * slide * stepDt;
        body.velocity.z += (-slopeZ / (slopeMag || 1)) * 14 * slide * stepDt;
      } else if (slopeMag > 0.2 && body.onGround) {
        body.velocity.x += slopeX * 2 * stepDt;
        body.velocity.z += slopeZ * 2 * stepDt;
      }

      if (body.position.y <= groundY + this.groundSnap) {
        if (!body.wasOnGround && body.velocity.y < -4) {
          const fallDist = Math.max(0, body.fallStartY - groundY);
          if (fallDist > this.fallDamageThreshold) {
            fallDamage = Math.floor((fallDist - this.fallDamageThreshold) * this.fallDamagePerUnit);
          }
        }
        body.position.y = groundY;
        body.velocity.y = 0;
        body.onGround = true;
        body.coyoteTimer = this.coyoteTime;
        body.fallStartY = groundY;
      } else {
        if (body.onGround) body.fallStartY = body.position.y;
        body.onGround = false;
      }

      if (body.jumpBuffer > 0 && (body.onGround || body.coyoteTimer > 0)) {
        this.tryJump(body);
      }
    }
    return fallDamage;
  }

  private tryStepUp(
    body: PhysicsBody,
    getHeight: (x: number, z: number) => number,
    stepHeight: number,
  ): void {
    if (!body.onGround || body.velocity.y > 0) return;
    const fwdX = body.velocity.x;
    const fwdZ = body.velocity.z;
    const len = Math.hypot(fwdX, fwdZ);
    if (len < 2) return;
    const nx = fwdX / len;
    const nz = fwdZ / len;
    const aheadY = getHeight(body.position.x + nx * 0.5, body.position.z + nz * 0.5);
    const hereY = getHeight(body.position.x, body.position.z);
    const rise = aheadY - hereY;
    if (rise > 0.05 && rise <= stepHeight) {
      body.position.y = aheadY;
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
        body.velocity.x *= -0.15;
      } else if (penZ > 0) {
        body.position.z += (dz > 0 ? 1 : -1) * penZ * 1.02;
        body.velocity.z *= -0.15;
      }
    }
  }

  knockback(body: PhysicsBody, fromX: number, fromZ: number, force: number): void {
    const dx = body.position.x - fromX;
    const dz = body.position.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.applyImpulse(body, (dx / len) * force, 3, (dz / len) * force);
  }
}

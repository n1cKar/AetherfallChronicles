import * as THREE from 'three';
import { clamp, lerp } from '../utils/math';

export class IsometricCamera {
  camera: THREE.PerspectiveCamera;
  private target = new THREE.Vector3();
  private currentDistance = 28;
  private targetDistance = 28;
  private azimuth = Math.PI * 0.25;
  private targetAzimuth = Math.PI * 0.25;
  private elevation = 0.65;
  private shakeOffset = new THREE.Vector3();
  private cinematicTimer = 0;
  private fovBase = 48;
  private fovTarget = 48;
  private lookOffset = new THREE.Vector3(0, 1, 0);
  private smoothTarget = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(this.fovBase, aspect, 0.5, 500);
    this.update(0);
  }

  punchZoom(amount: number, duration = 0.15): void {
    this.fovTarget = this.fovBase + amount;
    setTimeout(() => { this.fovTarget = this.fovBase; }, duration * 1000);
  }

  getYaw(): number {
    return this.azimuth;
  }

  setTarget(pos: THREE.Vector3): void {
    this.target.copy(pos);
  }

  rotate(delta: number): void {
    this.targetAzimuth += delta;
  }

  zoom(delta: number): void {
    this.targetDistance = clamp(this.targetDistance + delta, 14, 50);
  }

  setScreenShake(intensity: number): void {
    if (intensity > 0) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * intensity,
        (Math.random() - 0.5) * intensity * 0.5,
        (Math.random() - 0.5) * intensity,
      );
    } else {
      this.shakeOffset.set(0, 0, 0);
    }
  }

  startBossCinematic(duration = 3): void {
    this.cinematicTimer = duration;
    this.targetDistance = 22;
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    if (this.cinematicTimer > 0) {
      this.cinematicTimer -= dt;
      this.elevation = lerp(this.elevation, 0.55, dt * 2);
      this.targetDistance = lerp(this.targetDistance, 20, dt * 1.5);
    } else {
      this.elevation = lerp(this.elevation, 0.65, dt * 2);
    }

    this.smoothTarget.lerp(this.target, Math.min(1, dt * 8));
    this.currentDistance = lerp(this.currentDistance, this.targetDistance, dt * 4);
    this.azimuth = lerp(this.azimuth, this.targetAzimuth, dt * 6);
    this.camera.fov = lerp(this.camera.fov, this.fovTarget, dt * 12);
    this.camera.updateProjectionMatrix();

    const offset = new THREE.Vector3(
      Math.sin(this.azimuth) * Math.cos(this.elevation) * this.currentDistance,
      Math.sin(this.elevation) * this.currentDistance,
      Math.cos(this.azimuth) * Math.cos(this.elevation) * this.currentDistance,
    );

    this.camera.position.copy(this.smoothTarget).add(offset).add(this.shakeOffset);
    this.camera.lookAt(
      this.smoothTarget.x + this.lookOffset.x,
      this.smoothTarget.y + this.lookOffset.y,
      this.smoothTarget.z + this.lookOffset.z,
    );
  }

  getCamera(): THREE.Camera {
    return this.camera;
  }
}

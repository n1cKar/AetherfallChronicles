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

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 500);
    this.update(0);
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
    } else {
      this.elevation = lerp(this.elevation, 0.65, dt * 2);
    }

    this.currentDistance = lerp(this.currentDistance, this.targetDistance, dt * 4);
    this.azimuth = lerp(this.azimuth, this.targetAzimuth, dt * 6);

    const offset = new THREE.Vector3(
      Math.sin(this.azimuth) * Math.cos(this.elevation) * this.currentDistance,
      Math.sin(this.elevation) * this.currentDistance,
      Math.cos(this.azimuth) * Math.cos(this.elevation) * this.currentDistance,
    );

    this.camera.position.copy(this.target).add(offset).add(this.shakeOffset);
    this.camera.lookAt(this.target.x, this.target.y + 1, this.target.z);
  }

  getCamera(): THREE.Camera {
    return this.camera;
  }
}

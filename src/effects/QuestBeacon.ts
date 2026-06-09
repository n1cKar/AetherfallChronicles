import * as THREE from 'three';
import { createStylizedMaterial } from '../render/shaders/StylizedMaterial';

/** Glowing quest objective marker in the world. */
export class QuestBeacon {
  private group = new THREE.Group();
  private beam: THREE.Mesh;
  private ring: THREE.Mesh;
  private crystal: THREE.Mesh;
  private active = false;

  constructor(scene: THREE.Scene) {
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 12, 8, 1, true), beamMat);
    this.beam.position.y = 6;
    this.group.add(this.beam);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.6, 32),
      new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.15;
    this.group.add(this.ring);

    this.crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      createStylizedMaterial(0x00ffcc, { emissive: 0x00ffcc, emissiveIntensity: 0.8 }),
    );
    this.crystal.position.y = 2.5;
    this.group.add(this.crystal);

    this.group.visible = false;
    scene.add(this.group);
  }

  setTarget(x: number, z: number, y: number, visible: boolean): void {
    this.active = visible;
    this.group.visible = visible;
    if (visible) this.group.position.set(x, y, z);
  }

  update(dt: number, time: number): void {
    if (!this.active) return;
    this.crystal.rotation.y += dt * 2.2;
    this.crystal.position.y = 2.5 + Math.sin(time * 3) * 0.2;
    this.ring.rotation.z += dt * 0.5;
    const pulse = 0.35 + Math.sin(time * 4) * 0.15;
    (this.beam.material as THREE.MeshBasicMaterial).opacity = pulse;
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
    this.beam.geometry.dispose();
    (this.beam.material as THREE.Material).dispose();
    this.ring.geometry.dispose();
    (this.ring.material as THREE.Material).dispose();
    this.crystal.geometry.dispose();
    (this.crystal.material as THREE.Material).dispose();
  }
}

import * as THREE from 'three';
import { createStylizedMaterial } from './shaders/StylizedMaterial';

/** Instanced grass — throttled updates, fixed layout */
export class GrassField {
  private mesh: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  private offsets = new Float32Array(0);
  private scales = new Float32Array(0);
  private lastX = NaN;
  private lastZ = NaN;
  private updateTimer = 0;
  private enabled: boolean;

  constructor(
    private scene: THREE.Scene,
    count: number,
  ) {
    this.enabled = count > 0;
    if (!this.enabled) return;

    this.offsets = new Float32Array(count * 2);
    this.scales = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.offsets[i * 2] = (Math.random() - 0.5) * 28;
      this.offsets[i * 2 + 1] = (Math.random() - 0.5) * 28;
      this.scales[i] = 0.7 + Math.random() * 0.5;
    }

    const geo = new THREE.ConeGeometry(0.07, 0.3, 3);
    geo.translate(0, 0.15, 0);
    const mat = createStylizedMaterial(0x3a8a48, { roughness: 0.9 }, false);
    mat.side = THREE.DoubleSide;
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = count;
    scene.add(this.mesh);
  }

  update(
    dt: number,
    playerX: number,
    playerZ: number,
    getHeight: (x: number, z: number) => number,
    biomeGreen: number,
    minInterval: number,
  ): void {
    if (!this.enabled || !this.mesh) return;

    this.updateTimer -= dt;
    const dx = playerX - this.lastX;
    const dz = playerZ - this.lastZ;
    const moved = Number.isNaN(this.lastX) || dx * dx + dz * dz > 36;
    if (!moved && this.updateTimer > 0) return;

    this.updateTimer = minInterval;
    this.lastX = playerX;
    this.lastZ = playerZ;

    (this.mesh.material as THREE.MeshStandardMaterial).color.setHex(biomeGreen);

    const count = this.scales.length;
    for (let i = 0; i < count; i++) {
      const x = playerX + this.offsets[i * 2];
      const z = playerZ + this.offsets[i * 2 + 1];
      const y = getHeight(x, z);
      this.dummy.position.set(x, y, z);
      this.dummy.rotation.y = i * 0.7;
      this.dummy.scale.setScalar(this.scales[i]);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh = null;
  }
}

import * as THREE from 'three';
import { createStylizedMaterial } from './shaders/StylizedMaterial';

export type LandmarkType = 'cave' | 'mountain' | 'boulder_cluster' | 'ruin_large';

export interface LandmarkSpawn {
  type: LandmarkType;
  wx: number;
  wz: number;
  id: string;
}

/** Dark cave entrance with rocky arch */
export function createCaveEntrance(): THREE.Group {
  const g = new THREE.Group();
  const stone = createStylizedMaterial(0x4a4a55, { roughness: 0.95 });
  const dark = createStylizedMaterial(0x0a0810, { roughness: 1 });

  for (let i = 0; i < 6; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + Math.random() * 1.5, 0), stone);
    const a = (i / 6) * Math.PI * 2;
    rock.position.set(Math.cos(a) * 3.5, 0.8 + Math.random(), Math.sin(a) * 2.5);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(rock);
  }

  const archL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.5, 1.5), stone);
  archL.position.set(-2.2, 1.75, 0);
  g.add(archL);
  const archR = archL.clone();
  archR.position.x = 2.2;
  g.add(archR);
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 1.8), stone);
  archTop.position.set(0, 3.5, 0);
  g.add(archTop);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 1.2), dark);
  mouth.position.set(0, 1.1, 0.8);
  g.add(mouth);

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.25, 0),
    createStylizedMaterial(0x6644aa, { emissive: 0x4422aa, emissiveIntensity: 0.6 }),
  );
  crystal.position.set(0, 1.5, 1.2);
  g.add(crystal);

  g.userData.landmark = 'cave';
  return g;
}

/** Tall mountain stack — visible from far away */
export function createMountainPeak(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const rock = createStylizedMaterial(0x6a6a75, { roughness: 0.9 });
  const snow = createStylizedMaterial(0xe8eef5, { roughness: 0.7 });

  const base = new THREE.Mesh(new THREE.ConeGeometry(4 * scale, 6 * scale, 6), rock);
  base.position.y = 3 * scale;
  g.add(base);
  const mid = new THREE.Mesh(new THREE.ConeGeometry(2.8 * scale, 5 * scale, 6), rock);
  mid.position.y = 7 * scale;
  g.add(mid);
  const peak = new THREE.Mesh(new THREE.ConeGeometry(1.6 * scale, 3 * scale, 5), snow);
  peak.position.y = 10.5 * scale;
  g.add(peak);

  for (let i = 0; i < 5; i++) {
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.8, 0), rock);
    boulder.position.set((Math.random() - 0.5) * 6 * scale, Math.random() * 2, (Math.random() - 0.5) * 6 * scale);
    g.add(boulder);
  }
  g.userData.landmark = 'mountain';
  return g;
}

export function createBoulderCluster(): THREE.Group {
  const g = new THREE.Group();
  const stone = createStylizedMaterial(0x5a5a62);
  for (let i = 0; i < 7; i++) {
    const s = 0.4 + Math.random() * 1.1;
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), stone);
    b.position.set((Math.random() - 0.5) * 3, s * 0.4, (Math.random() - 0.5) * 3);
    b.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(b);
  }
  return g;
}

export function createLargeRuin(): THREE.Group {
  const g = new THREE.Group();
  const stone = createStylizedMaterial(0x5a5a68);
  for (let i = 0; i < 6; i++) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2 + Math.random() * 3, 0.9), stone);
    pillar.position.set((i - 2.5) * 2.2, 1.5, (Math.random() - 0.5) * 3);
    pillar.rotation.y = (Math.random() - 0.5) * 0.4;
    g.add(pillar);
  }
  const broken = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 1.2), stone);
  broken.position.set(0, 3.8, 0);
  broken.rotation.z = 0.15;
  g.add(broken);
  return g;
}

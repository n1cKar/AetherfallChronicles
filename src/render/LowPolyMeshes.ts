import * as THREE from 'three';
import { createStylizedMaterial } from './shaders/StylizedMaterial';
import { createHumanCharacter } from './HumanCharacter';

/** Procedural low-poly mesh factory — no external assets required */

export function createLowPolyTree(variant = 0): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = createStylizedMaterial(0x4a3528);
  const leafColors = [0x2d6b3a, 0x3a8a48, 0x1f5530];
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25 + variant * 0.05, 0.35, 2.2 + variant * 0.3, 6),
    trunkMat,
  );
  trunk.position.y = 1.1;
  g.add(trunk);

  const foliage = new THREE.Mesh(
    new THREE.ConeGeometry(1.4 + variant * 0.2, 2.8, 6),
    createStylizedMaterial(leafColors[variant % 3]),
  );
  foliage.position.y = 3.2;
  g.add(foliage);
  if (variant % 2 === 0) {
    const foliage2 = foliage.clone();
    foliage2.scale.set(0.7, 0.6, 0.7);
    foliage2.position.y = 4.2;
    g.add(foliage2);
  }
  return g;
}

export function createLowPolyRock(size = 1): THREE.Mesh {
  const geo = new THREE.DodecahedronGeometry(size, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) * (0.6 + Math.random() * 0.5));
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, createStylizedMaterial(0x6a6a72, { roughness: 0.9 }));
}

export function createLowPolyCrystal(color = 0x6b8cff): THREE.Group {
  const g = new THREE.Group();
  const mat = createStylizedMaterial(color, {
    emissive: color,
    emissiveIntensity: 0.4,
    metalness: 0.3,
  });
  for (let i = 0; i < 5; i++) {
    const shard = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.8 + Math.random() * 0.4, 4),
      mat,
    );
    shard.position.set((Math.random() - 0.5) * 0.4, 0.4, (Math.random() - 0.5) * 0.4);
    shard.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(shard);
  }
  return g;
}

/** @deprecated Use createHumanCharacter */
export function createCharacterMesh(primaryColor: number, accent: number): THREE.Group {
  return createHumanCharacter(primaryColor, accent, 0xd4a574, 'sword').root;
}

export function createEnemyMesh(color: number, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.7 * scale, 0),
    createStylizedMaterial(color, { emissive: color, emissiveIntensity: 0.15 }),
  );
  body.position.y = 0.9 * scale;
  g.add(body);
  const horn = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.5, 4),
    createStylizedMaterial(0x222222),
  );
  horn.position.set(0, 1.5 * scale, 0.3 * scale);
  horn.rotation.x = -0.4;
  g.add(horn);
  return g;
}

export function createStructureRuin(): THREE.Group {
  const g = new THREE.Group();
  const stone = createStylizedMaterial(0x5a5a62);
  for (let i = 0; i < 4; i++) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3 + Math.random() * 2, 0.8), stone);
    pillar.position.set((i - 1.5) * 2.5, 1.5, (Math.random() - 0.5) * 2);
    pillar.rotation.y = Math.random() * 0.3;
    g.add(pillar);
  }
  const arch = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 1), stone);
  arch.position.y = 3.5;
  g.add(arch);
  return g;
}

export function createProjectileMesh(color: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.OctahedronGeometry(0.2, 0),
    createStylizedMaterial(color, { emissive: color, emissiveIntensity: 0.8 }),
  );
}

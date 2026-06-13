import * as THREE from 'three';
import { createStylizedMaterial } from './shaders/StylizedMaterial';

export type PropType =
  | 'bush'
  | 'barrel'
  | 'crate'
  | 'torch'
  | 'chest'
  | 'well'
  | 'fence'
  | 'campfire'
  | 'village_hut'
  | 'temple_pillar'
  | 'bridge'
  | 'mushroom'
  | 'bones'
  | 'banner'
  | 'wagon'
  | 'castle_wall'
  | 'rune_gate'
  | 'lava_vent'
  | 'ice_spire'
  | 'aether_statue'
  | 'spike_trap';

export interface PropCollider {
  box: THREE.Box3;
  solid: boolean;
}

export function createWorldProp(type: PropType, biomeAccent?: number): { group: THREE.Group; collider?: PropCollider } {
  switch (type) {
    case 'bush': return { group: createBush() };
    case 'barrel': return createBarrel();
    case 'crate': return createCrate();
    case 'torch': return { group: createTorch() };
    case 'chest': return createChest(false);
    case 'well': return createWell();
    case 'fence': return createFence();
    case 'campfire': return { group: createCampfire() };
    case 'village_hut': return createVillageHut(biomeAccent);
    case 'temple_pillar': return createTemplePillar();
    case 'bridge': return createBridge();
    case 'mushroom': return { group: createMushroom() };
    case 'bones': return { group: createBones() };
    case 'banner': return { group: createBanner(biomeAccent ?? 0xd4a84b) };
    case 'wagon': return createWagon();
    case 'castle_wall': return createCastleWall();
    case 'rune_gate': return createRuneGate(biomeAccent ?? 0x88ccff);
    case 'lava_vent': return { group: createLavaVent() };
    case 'ice_spire': return { group: createIceSpire() };
    case 'aether_statue': return createAetherStatue();
    case 'spike_trap': return { group: createSpikeTrap() };
    default: return { group: createBush() };
  }
}

function createBush(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.35 + Math.random() * 0.2, 0),
      createStylizedMaterial(0x2d6b3a),
    );
    m.position.set((Math.random() - 0.5) * 0.5, 0.25 + Math.random() * 0.2, (Math.random() - 0.5) * 0.5);
    g.add(m);
  }
  return g;
}

function createBarrel(): { group: THREE.Group; collider: PropCollider } {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.38, 0.7, 8),
    createStylizedMaterial(0x6a4a2a),
  );
  mesh.position.y = 0.35;
  mesh.castShadow = true;
  g.add(mesh);
  return {
    group: g,
    collider: {
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0.8, 0.8, 0.8)),
      solid: true,
    },
  };
}

function createCrate(): { group: THREE.Group; collider: PropCollider } {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), createStylizedMaterial(0x5a4a38));
  mesh.position.y = 0.35;
  mesh.castShadow = true;
  g.add(mesh);
  return {
    group: g,
    collider: {
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0.75, 0.75, 0.75)),
      solid: true,
    },
  };
}

function createTorch(): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 6), createStylizedMaterial(0x3a2a18));
  pole.position.y = 0.6;
  g.add(pole);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.25, 6),
    createStylizedMaterial(0xff8844, { emissive: 0xff6622, emissiveIntensity: 1 }),
  );
  flame.position.y = 1.25;
  g.add(flame);
  return g;
}

export function createChest(opened = false): { group: THREE.Group; collider: PropCollider } {
  const g = new THREE.Group();
  const wood = createStylizedMaterial(0x5a4028);
  const gold = createStylizedMaterial(0xd4a84b, { metalness: 0.5 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), wood);
  base.position.y = 0.25;
  base.castShadow = true;
  g.add(base);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.15, 0.62), wood);
  lid.position.y = 0.55;
  if (opened) lid.rotation.x = -1.2;
  g.add(lid);
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.08), gold);
  lock.position.set(0, 0.45, 0.32);
  g.add(lock);
  g.userData.chestLid = lid;
  return {
    group: g,
    collider: {
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(1, 0.7, 0.7)),
      solid: true,
    },
  };
}

function createWell(): { group: THREE.Group; collider: PropCollider } {
  const g = new THREE.Group();
  const stone = createStylizedMaterial(0x6a6a72);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.5, 8), stone);
  base.position.y = 0.25;
  g.add(base);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.6, 6), createStylizedMaterial(0x4a3528));
  roof.position.y = 1.8;
  g.add(roof);
  for (let i = 0; i < 4; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 6), stone);
    const a = (i / 4) * Math.PI * 2;
    post.position.set(Math.cos(a) * 0.7, 0.9, Math.sin(a) * 0.7);
    g.add(post);
  }
  return {
    group: g,
    collider: {
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(2.2, 2.5, 2.2)),
      solid: true,
    },
  };
}

function createFence(): { group: THREE.Group; collider: PropCollider } {
  const g = new THREE.Group();
  const wood = createStylizedMaterial(0x4a3528);
  for (let i = 0; i < 4; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), wood);
    post.position.set(i * 0.9, 0.4, 0);
    g.add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.08), wood);
  rail.position.set(1.35, 0.55, 0);
  g.add(rail);
  return {
    group: g,
    collider: {
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(1.35, 0.4, 0), new THREE.Vector3(3.5, 1, 0.3)),
      solid: true,
    },
  };
}

function createCampfire(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 6), createStylizedMaterial(0x3a2818));
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i / 5) * Math.PI;
    log.position.y = 0.08;
    g.add(log);
  }
  const fire = new THREE.Mesh(
    new THREE.ConeGeometry(0.25, 0.5, 6),
    createStylizedMaterial(0xff6622, { emissive: 0xff4400, emissiveIntensity: 1.2 }),
  );
  fire.position.y = 0.35;
  g.add(fire);
  return g;
}

function createVillageHut(accent?: number): { group: THREE.Group; collider: PropCollider } {
  const g = new THREE.Group();
  const wall = createStylizedMaterial(0x6a5a48);
  const roof = createStylizedMaterial(accent ?? 0x4a3828);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2), wall);
  body.position.y = 0.7;
  body.castShadow = true;
  g.add(body);
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.2, 4), roof);
  roofMesh.position.y = 1.9;
  roofMesh.rotation.y = Math.PI / 4;
  g.add(roofMesh);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.08), createStylizedMaterial(0x3a2818));
  door.position.set(0, 0.4, 1.02);
  g.add(door);
  return {
    group: g,
    collider: {
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 1, 0), new THREE.Vector3(2.5, 2.8, 2.2)),
      solid: true,
    },
  };
}

function createTemplePillar(): { group: THREE.Group; collider: PropCollider } {
  const g = new THREE.Group();
  const stone = createStylizedMaterial(0x8a8a95, { metalness: 0.1 });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.5, 8), stone);
  pillar.position.y = 1.75;
  pillar.castShadow = true;
  g.add(pillar);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.9), stone);
  cap.position.y = 3.6;
  g.add(cap);
  return {
    group: g,
    collider: {
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 1.75, 0), new THREE.Vector3(1, 3.8, 1)),
      solid: true,
    },
  };
}

function createBridge(): { group: THREE.Group; collider: PropCollider } {
  const g = new THREE.Group();
  const wood = createStylizedMaterial(0x5a4030);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 1.5), wood);
  deck.position.y = 0.5;
  g.add(deck);
  return {
    group: g,
    collider: {
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(4.2, 0.5, 1.6)),
      solid: false,
    },
  };
}

function createMushroom(): THREE.Group {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 6), createStylizedMaterial(0xd4c4a8));
  stem.position.y = 0.18;
  g.add(stem);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), createStylizedMaterial(0xcc4444));
  cap.scale.y = 0.6;
  cap.position.y = 0.42;
  g.add(cap);
  return g;
}

function createBones(): THREE.Group {
  const g = new THREE.Group();
  const bone = createStylizedMaterial(0xd4ccc0);
  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6), bone);
  b1.rotation.z = Math.PI / 2;
  b1.position.y = 0.05;
  g.add(b1);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), bone);
  skull.position.set(0.3, 0.1, 0);
  g.add(skull);
  return g;
}

function createBanner(color: number): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.5, 6), createStylizedMaterial(0x4a4038));
  pole.position.y = 1.25;
  g.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), createStylizedMaterial(color));
  cloth.position.set(0.35, 2, 0);
  cloth.rotation.y = Math.PI / 2;
  g.add(cloth);
  return g;
}

function createWagon(): { group: THREE.Group; collider: PropCollider } {
  const g = new THREE.Group();
  const wood = createStylizedMaterial(0x5a4030);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.9), wood);
  body.position.y = 0.6;
  g.add(body);
  for (const [x, z] of [[-0.5, 0.35], [0.5, 0.35], [-0.5, -0.35], [0.5, -0.35]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 10), createStylizedMaterial(0x2a2228));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.25, z);
    g.add(wheel);
  }
  return {
    group: g,
    collider: {
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(1.6, 1.2, 1.2)),
      solid: true,
    },
  };
}

function createCastleWall(): { group: THREE.Group; collider: PropCollider } {
  const g = new THREE.Group();
  const stone = createStylizedMaterial(0x5d6068, { roughness: 0.92 });
  for (let i = 0; i < 5; i++) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2 + (i % 2) * 0.25, 0.8), stone);
    block.position.set((i - 2) * 0.95, block.geometry.parameters.height / 2, 0);
    block.castShadow = true;
    block.receiveShadow = true;
    g.add(block);
  }
  for (let i = 0; i < 4; i++) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.9), stone);
    cap.position.set((i - 1.5) * 1.2, 1.55, 0);
    g.add(cap);
  }
  return {
    group: g,
    collider: {
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 0.8, 0), new THREE.Vector3(5.2, 1.8, 1)),
      solid: true,
    },
  };
}

function createRuneGate(color: number): { group: THREE.Group; collider: PropCollider } {
  const g = new THREE.Group();
  const stone = createStylizedMaterial(0x4e5260);
  const rune = createStylizedMaterial(color, { emissive: color, emissiveIntensity: 0.6 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.2, 0.7), stone);
  const right = left.clone();
  left.position.set(-1.25, 1.6, 0);
  right.position.set(1.25, 1.6, 0);
  g.add(left, right);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 0.75), stone);
  top.position.y = 3.15;
  g.add(top);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), rune);
  gem.position.y = 2.45;
  g.add(gem);
  return {
    group: g,
    collider: {
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(3.5, 3.4, 1)),
      solid: true,
    },
  };
}

function createLavaVent(): THREE.Group {
  const g = new THREE.Group();
  const rock = createStylizedMaterial(0x34201a);
  const lava = createStylizedMaterial(0xff4a18, { emissive: 0xff2700, emissiveIntensity: 1 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.35, 7), rock);
  base.position.y = 0.18;
  g.add(base);
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.08, 7), lava);
  glow.position.y = 0.4;
  g.add(glow);
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 6), lava);
  plume.position.y = 0.82;
  g.add(plume);
  const light = new THREE.PointLight(0xff5522, 0.8, 7);
  light.position.y = 1.2;
  g.add(light);
  return g;
}

function createIceSpire(): THREE.Group {
  const g = new THREE.Group();
  const ice = createStylizedMaterial(0x9fdcff, { emissive: 0x5aaee0, emissiveIntensity: 0.2, metalness: 0.1 });
  for (let i = 0; i < 4; i++) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.22 + i * 0.06, 1.2 + i * 0.35, 5), ice);
    shard.position.set((i - 1.5) * 0.35, (1.2 + i * 0.35) / 2, (i % 2 - 0.5) * 0.35);
    shard.rotation.z = (i - 1.5) * 0.12;
    g.add(shard);
  }
  return g;
}

function createAetherStatue(): { group: THREE.Group; collider: PropCollider } {
  const g = new THREE.Group();
  const stone = createStylizedMaterial(0x77747c);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.45, 6), stone);
  base.position.y = 0.22;
  g.add(base);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.5, 0.45), stone);
  body.position.y = 1.15;
  g.add(body);
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), stone);
  head.position.y = 2.15;
  g.add(head);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.04, 6, 16),
    createStylizedMaterial(0xd4a84b, { emissive: 0xd4a84b, emissiveIntensity: 0.35 }),
  );
  halo.position.y = 2.45;
  halo.rotation.x = Math.PI / 2;
  g.add(halo);
  return {
    group: g,
    collider: {
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(1.4, 2.6, 1.2)),
      solid: true,
    },
  };
}

function createSpikeTrap(): THREE.Group {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.6), createStylizedMaterial(0x3a3330));
  plate.position.y = 0.06;
  g.add(plate);
  const metal = createStylizedMaterial(0xa8a8a8, { metalness: 0.3 });
  for (let x = -1; x <= 1; x++) {
    for (let z = -1; z <= 1; z++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 4), metal);
      spike.position.set(x * 0.45, 0.38, z * 0.45);
      g.add(spike);
    }
  }
  return g;
}

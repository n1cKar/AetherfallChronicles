import * as THREE from 'three';
import { createStylizedMaterial } from './shaders/StylizedMaterial';
import type { WeaponType } from '../config/constants';

export interface HumanoidRig {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  weapon: THREE.Group;
}

/** Low-poly humanoid hero with limbs for procedural animation */
export function createHumanCharacter(
  armorColor: number,
  accentColor: number,
  skinColor = 0xd4a574,
  weaponType: WeaponType = 'sword',
): HumanoidRig {
  const root = new THREE.Group();
  root.name = 'humanoid';

  const skin = createStylizedMaterial(skinColor, { roughness: 0.75 });
  const armor = createStylizedMaterial(armorColor, { metalness: 0.15 });
  const accent = createStylizedMaterial(accentColor, { metalness: 0.45 });
  const cloth = createStylizedMaterial(0x3a3548, { roughness: 0.9 });
  const boot = createStylizedMaterial(0x2a2228);

  const torso = new THREE.Group();
  torso.position.y = 1.05;
  torso.name = 'torso';

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.32), cloth);
  pelvis.position.y = -0.35;
  torso.add(pelvis);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.38), armor);
  chest.position.y = 0.05;
  chest.name = 'body';
  chest.castShadow = true;
  torso.add(chest);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.4), accent);
  belt.position.y = -0.22;
  torso.add(belt);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.15, 6), skin);
  neck.position.y = 0.42;
  torso.add(neck);

  const head = new THREE.Group();
  head.position.y = 0.55;
  head.name = 'head';

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.42), skin);
  skull.castShadow = true;
  head.add(skull);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.44), createStylizedMaterial(0x2a2018));
  hair.position.y = 0.22;
  head.add(hair);

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), createStylizedMaterial(0x1a1a28));
  eyeL.position.set(-0.1, 0.05, 0.22);
  head.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  head.add(eyeR);

  torso.add(head);

  const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.28), accent);
  pauldronL.position.set(-0.42, 0.28, 0);
  torso.add(pauldronL);
  const pauldronR = pauldronL.clone();
  pauldronR.position.x = 0.42;
  torso.add(pauldronR);

  const armL = new THREE.Group();
  armL.position.set(-0.42, 0.15, 0);
  armL.name = 'armL';
  const upperArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.38, 6), skin);
  upperArmL.position.y = -0.19;
  upperArmL.castShadow = true;
  armL.add(upperArmL);
  const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.34, 6), skin);
  forearmL.position.y = -0.52;
  armL.add(forearmL);
  const handL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), skin);
  handL.position.y = -0.72;
  armL.add(handL);

  const armR = new THREE.Group();
  armR.position.set(0.42, 0.15, 0);
  armR.name = 'armR';
  const upperArmR = upperArmL.clone();
  upperArmR.position.y = -0.19;
  armR.add(upperArmR);
  const forearmR = forearmL.clone();
  forearmR.position.y = -0.52;
  armR.add(forearmR);
  const handR = handL.clone();
  handR.position.y = -0.72;
  armR.add(handR);

  torso.add(armL, armR);

  const legL = new THREE.Group();
  legL.position.set(-0.16, -0.35, 0);
  legL.name = 'legL';
  const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.42, 6), cloth);
  thighL.position.y = -0.21;
  thighL.castShadow = true;
  legL.add(thighL);
  const shinL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.4, 6), skin);
  shinL.position.y = -0.58;
  legL.add(shinL);
  const footL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.32), boot);
  footL.position.set(0, -0.82, 0.06);
  legL.add(footL);

  const legR = new THREE.Group();
  legR.position.set(0.16, -0.35, 0);
  legR.name = 'legR';
  const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.42, 6), cloth);
  thighR.position.y = -0.21;
  thighR.castShadow = true;
  legR.add(thighR);
  const shinR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.4, 6), skin);
  shinR.position.y = -0.58;
  legR.add(shinR);
  const footR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.32), boot);
  footR.position.set(0, -0.82, 0.06);
  legR.add(footR);

  torso.add(legL, legR);

  const weapon = createWeaponMesh(weaponType, accentColor);
  weapon.position.set(0.5, 0, -0.15);
  armR.add(weapon);

  root.add(torso);

  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.receiveShadow = true;
      o.castShadow = o.name === 'body' || o.parent?.name === 'head';
    }
  });

  return { root, torso, head, armL, armR, legL, legR, weapon };
}

function createWeaponMesh(type: WeaponType, accent: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'weapon';
  const metal = createStylizedMaterial(accent, { metalness: 0.6, roughness: 0.35 });

  switch (type) {
    case 'bow':
    case 'staff': {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 6), metal);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.z = -0.5;
      g.add(shaft);
      if (type === 'staff') {
        const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), createStylizedMaterial(0x88aaff, { emissive: 0x4488ff, emissiveIntensity: 0.5 }));
        orb.position.z = -1.1;
        g.add(orb);
      }
      break;
    }
    case 'hammer': {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), createStylizedMaterial(0x4a3528));
      handle.rotation.x = Math.PI / 2;
      handle.position.z = -0.35;
      g.add(handle);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.28), metal);
      head.position.z = -0.85;
      g.add(head);
      break;
    }
    case 'greatsword': {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 1.2), metal);
      blade.position.z = -0.65;
      g.add(blade);
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 6), createStylizedMaterial(0x3a2a18));
      hilt.rotation.x = Math.PI / 2;
      g.add(hilt);
      break;
    }
    case 'dual_blades': {
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.55), metal);
      b1.position.set(0.15, 0, -0.35);
      b1.rotation.y = 0.3;
      g.add(b1);
      const b2 = b1.clone();
      b2.position.set(-0.1, 0, -0.3);
      b2.rotation.y = -0.2;
      g.add(b2);
      break;
    }
    case 'spear': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.6, 6), createStylizedMaterial(0x5a4030));
      pole.rotation.x = Math.PI / 2;
      pole.position.z = -0.7;
      g.add(pole);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 4), metal);
      tip.rotation.x = -Math.PI / 2;
      tip.position.z = -1.45;
      g.add(tip);
      break;
    }
    case 'gauntlets': {
      const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.22), metal);
      gauntlet.position.z = -0.1;
      g.add(gauntlet);
      break;
    }
    default: {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.75), metal);
      blade.position.z = -0.45;
      g.add(blade);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.08), metal);
      guard.name = 'guard';
      g.add(guard);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6), createStylizedMaterial(0x3a2a18));
      handle.rotation.x = Math.PI / 2;
      handle.position.z = 0.12;
      g.add(handle);
    }
  }

  g.rotation.x = -0.4;
  return g;
}

/** Procedural walk / attack animation on humanoid rig */
export function animateHumanoid(
  rig: HumanoidRig,
  state: string,
  phase: number,
  moveBlend: number,
): void {
  const walk = Math.sin(phase * 10) * moveBlend;
  const walk2 = Math.sin(phase * 10 + Math.PI) * moveBlend;

  rig.legL.rotation.x = walk * 0.55;
  rig.legR.rotation.x = walk2 * 0.55;
  rig.armL.rotation.x = walk2 * 0.35;
  rig.armR.rotation.x = walk * 0.25;

  if (state === 'attack') {
    const swing = Math.sin(phase * 18);
    rig.armR.rotation.x = -1.2 + swing * 0.8;
    rig.armR.rotation.z = -0.4;
    rig.torso.rotation.y = swing * 0.25;
    rig.weapon.rotation.x = -0.8 + swing * 0.5;
  } else if (state === 'dodge') {
    rig.torso.rotation.z = 0.35;
    rig.legL.rotation.x = 0.6;
    rig.legR.rotation.x = -0.3;
  } else if (state === 'hurt') {
    rig.torso.rotation.x = 0.2;
    rig.head.rotation.x = -0.15;
  } else if (state === 'idle') {
    rig.torso.position.y = 1.05 + Math.sin(phase * 2) * 0.02;
    rig.torso.rotation.set(0, 0, 0);
    rig.head.rotation.x = Math.sin(phase * 1.5) * 0.03;
  } else {
    rig.torso.rotation.y = 0;
    rig.torso.rotation.x = 0;
    rig.torso.rotation.z = 0;
    rig.torso.position.y = 1.05;
  }

  if (state !== 'attack') {
    rig.armR.rotation.z = 0;
    rig.weapon.rotation.x = -0.4;
  }
}

export function createHumanoidEnemy(color: number, tier: 'normal' | 'elite' | 'boss', scale = 1): HumanoidRig {
  const rig = createHumanCharacter(
    color,
    0x222222,
    new THREE.Color(color).offsetHSL(0, -0.2, 0.15).getHex(),
    'sword',
  );
  rig.root.scale.setScalar(scale * (tier === 'boss' ? 1.4 : tier === 'elite' ? 1.15 : 1));

  if (tier === 'boss') {
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.35, 4),
      createStylizedMaterial(0xffd700, { emissive: 0xffaa00, emissiveIntensity: 0.3 }),
    );
    crown.position.y = 0.45;
    rig.head.add(crown);
  }

  return rig;
}

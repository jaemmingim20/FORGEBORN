import * as THREE from 'three';
import { METALS, METAL_STATS } from './CraftingManager';
import type { CraftedWeapon } from './CraftingManager';
export function weaponModel(w: CraftedWeapon): THREE.Group {
  const root = new THREE.Group(),
    color = new THREE.Color(0, 0, 0);
  let total = 0;
  METALS.forEach((m, i) => {
    color.add(new THREE.Color(METAL_STATS[i]!.color).multiplyScalar(w.metals[m]));
    total += w.metals[m];
  });
  color.multiplyScalar(1 / Math.max(1, total));
  const metal = new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.33 }),
    wood = new THREE.MeshStandardMaterial({
      color: w.parts[0]! > 1 ? '#38261c' : '#735037',
      roughness: 0.8,
    }),
    trim = new THREE.MeshStandardMaterial({
      color: w.parts[1]! > 1 ? '#c9a254' : '#79868b',
      metalness: 0.8,
      roughness: 0.35,
    });
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    root.add(o);
    return o;
  };
  const shaft = (length: number) =>
    add(new THREE.CylinderGeometry(0.045, 0.055, length, 12), wood, 0, -0.3);
  if (w.kind === 'sword') {
    shaft(0.45);
    const s = new THREE.Shape();
    s.moveTo(-0.09, 0);
    s.lineTo(-0.09, 0.85);
    s.lineTo(0, 1.1);
    s.lineTo(0.09, 0.85);
    s.lineTo(0.09, 0);
    s.closePath();
    add(
      new THREE.ExtrudeGeometry(s, {
        depth: 0.035,
        bevelEnabled: true,
        bevelSize: 0.012,
        bevelThickness: 0.008,
        bevelSegments: 1,
        steps: 1,
      }),
      metal,
      0,
      -0.04,
      -0.018,
    );
    add(new THREE.BoxGeometry(0.5, 0.055, 0.09), trim, 0, -0.07);
    add(new THREE.SphereGeometry(0.065, 12, 8), trim, 0, -0.56);
  } else if (w.kind === 'shield') {
    add(new THREE.CylinderGeometry(0.58, 0.58, 0.075, 48), metal, 0, 0.1).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.57, 0.045, 8, 48), trim, 0, 0.1, 0.055);
    add(new THREE.SphereGeometry(0.17, 20, 12), metal, 0, 0.1, 0.07).scale.z = 0.55;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      add(
        new THREE.SphereGeometry(0.018, 6, 4),
        trim,
        Math.cos(a) * 0.56,
        0.1 + Math.sin(a) * 0.56,
        0.09,
      );
    }
    add(new THREE.BoxGeometry(0.08, 0.45, 0.1), wood, 0, 0.1, -0.11);
  } else {
    shaft(1.25);
    add(new THREE.CylinderGeometry(0.075, 0.075, 0.17, 12), trim, 0, 0.32);
    if (w.kind === 'hammer') add(new THREE.BoxGeometry(0.63, 0.27, 0.25), metal, 0, 0.35);
    else {
      const s = new THREE.Shape();
      if (w.kind === 'axe') {
        s.moveTo(-0.05, 0.45);
        s.quadraticCurveTo(0.25, 0.35, 0.48, 0.6);
        s.quadraticCurveTo(0.65, 0.24, 0.47, -0.02);
        s.quadraticCurveTo(0.25, 0.2, -0.05, 0.2);
      } else {
        s.moveTo(-0.55, 0.2);
        s.quadraticCurveTo(0, 0.64, 0.55, 0.2);
        s.quadraticCurveTo(0, 0.42, -0.55, 0.2);
      }
      s.closePath();
      add(
        new THREE.ExtrudeGeometry(s, {
          depth: 0.075,
          bevelEnabled: true,
          bevelSize: 0.015,
          bevelThickness: 0.01,
          bevelSegments: 2,
          steps: 1,
        }),
        metal,
        0,
        0,
        -0.04,
      );
    }
  }
  for (let i = 0; i <= w.parts[1]!; i++) {
    add(
      new THREE.TorusGeometry(0.07 + w.parts[1]! * 0.006, 0.01, 6, 20),
      trim,
      0,
      -0.08 + i * 0.035,
    ).rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 8 + w.parts[0]! * 3; i++)
    add(new THREE.TorusGeometry(0.05, 0.006, 4, 12), trim, 0, -0.45 + i * 0.017).rotation.x =
      Math.PI / 2;
  for (let i = 0; i < w.parts[2]! * 3; i++) {
    const a = i * 2.4;
    add(new THREE.SphereGeometry(0.025, 8, 6), trim, Math.cos(a) * 0.11, 0.02 + i * 0.045, 0.1);
  }
  return root;
}

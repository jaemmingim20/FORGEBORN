import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Materials } from '../render/materials';
import { halfWidth, MINE_LENGTH, MINE_START, mineSection } from '../mining/data';
import { box, beam, textSign, mesh } from './primitives';

export function buildMine(root: THREE.Group, physics: PhysicsWorld, m: Materials): void {
  function solid(
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    mat = m.rockDark,
  ): void {
    box(root, mat, size, at);
    physics.addBox({
      center: { x: at[0], y: at[1], z: at[2] },
      size: { x: size[0], y: size[1], z: size[2] },
    });
  }
  for (let depth = 10; depth < MINE_LENGTH; depth += 10) {
    const width = halfWidth(depth);
    const z = MINE_START - depth - 5;
    box(root, m.earth, [width * 2, 0.04, 10], [0, -0.005, z]);
    solid([0.65, 5, 10], [-width - 0.325, 2.5, z]);
    solid([0.65, 5, 10], [width + 0.325, 2.5, z]);
    solid([width * 2 + 1.3, 0.6, 10], [0, 5.1, z]);
    const previousWidth = halfWidth(depth - 10);
    if (previousWidth !== width)
      for (const side of [-1, 1])
        solid(
          [Math.abs(previousWidth - width), 5, 0.6],
          [(side * (previousWidth + width)) / 2, 2.5, z + 5],
        );
    if (width > 3 && depth % 50 === 30) {
      // Walking around the support creates a small loop inside the side mining chamber.
      solid([1.1, 4.8, 1.5], [3.4, 2.4, z], m.rock);
    }
    for (const x of [-width + 0.2, width - 0.2]) {
      solid([0.22, 4.6, 0.25], [x, 2.3, z + 4], m.timber);
      beam(root, m.wood, [x, 3.5, z + 4], [x * 0.65, 4.6, z + 4], 0.14);
    }
    box(root, m.wood, [width * 2, 0.24, 0.3], [0, 4.6, z + 4]);
    for (const x of [-0.8, 0.8]) box(root, m.iron, [0.06, 0.035, 10], [x, 0.035, z]);
    const flame = mesh(root, new THREE.ConeGeometry(0.12, 0.4, 5), m.fire, [
      -width + 0.45,
      2.6,
      z + 3.5,
    ]);
    flame.castShadow = false;
    box(root, m.timber, [0.12, 0.6, 0.12], [-width + 0.45, 2.2, z + 3.5]);
    if (depth % 50 === 0)
      textSign(
        root,
        `${depth} m`,
        mineSection(depth).includes('입구') ? 'ENTRANCE' : 'FOLLOW THE RAILS HOME',
        [0, 3.7, z + 4.2],
        2.3,
      );
  }
  solid([12, 5, 0.7], [0, 2.5, MINE_START - MINE_LENGTH - 0.35]);
  textSign(
    root,
    '500 m · THE ABYSS',
    'END OF THE OLD MINE',
    [0, 2.4, MINE_START - MINE_LENGTH + 0.1],
    3.8,
  );
}

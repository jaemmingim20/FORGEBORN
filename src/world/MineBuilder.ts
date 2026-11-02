import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Materials } from '../render/materials';
import { DIRECTIONS, MINE_LAYOUT, cellKey, cellPosition } from './mineLayout';
import { box, beam, textSign, mesh } from './primitives';

export function buildMine(root: THREE.Group, physics: PhysicsWorld, m: Materials): void {
  const solid = (
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    mat = m.rockDark,
  ): void => {
    box(root, mat, size, at);
    physics.addBox({
      center: { x: at[0], y: at[1], z: at[2] },
      size: { x: size[0], y: size[1], z: size[2] },
    });
  };
  let signs = 0;
  for (const cell of MINE_LAYOUT.values()) {
    const p = cellPosition(cell),
      height = cell.chamber ? 7.2 : 5;
    box(root, m.earth, [10, 0.04, 10], [p.x, -0.005, p.z]);
    solid([10.65, 0.6, 10.65], [p.x, height + 0.3, p.z]);
    let connections = 0;
    for (const d of DIRECTIONS) {
      const neighbor = MINE_LAYOUT.get(cellKey(cell.x + d.x, cell.row + d.row));
      const dx = d.x,
        dz = -d.row;
      const entrance = cell.x === 0 && cell.row === 0 && d.row === -1;
      if (!neighbor && !entrance)
        solid(
          dx ? [0.65, height, 10.65] : [10.65, height, 0.65],
          [p.x + dx * 5.325, height / 2, p.z + dz * 5.325],
          cell.distance > 400 ? m.rockDark : m.rock,
        );
      if (neighbor) {
        connections++;
        if (cell.chamber && !neighbor.chamber)
          solid(dx ? [0.65, 2.2, 10] : [10, 2.2, 0.65], [p.x + dx * 5, 6.1, p.z + dz * 5]);
      }
      if (neighbor || entrance)
        for (const offset of [-0.8, 0.8])
          box(root, m.iron, dx ? [5, 0.04, 0.07] : [0.07, 0.04, 5], [
            p.x + dx * 2.5 + (dx ? 0 : offset),
            0.035,
            p.z + dz * 2.5 + (dx ? offset : 0),
          ]);
    }
    // Supports stay at the outer corners, leaving every connected tile opening walkable.
    for (const x of [-4.7, 4.7]) {
      solid([0.2, height, 0.22], [p.x + x, height / 2, p.z + 4.7], m.timber);
      beam(
        root,
        m.wood,
        [p.x + x, height - 1, p.z + 4.7],
        [p.x + x * 0.75, height - 0.2, p.z + 4.7],
        0.14,
      );
    }
    box(root, m.wood, [9.6, 0.22, 0.22], [p.x, height - 0.2, p.z + 4.7]);
    if ((cell.x + cell.row) % 3 === 0) {
      const flame = mesh(root, new THREE.ConeGeometry(0.12, 0.4, 5), m.fire, [p.x + 4.6, 2.7, p.z]);
      flame.castShadow = false;
      box(root, m.timber, [0.1, 0.6, 0.1], [p.x + 4.6, 2.3, p.z]);
    }
    if (connections >= 3 && signs < 28 && cell.distance % 30 === 15) {
      const parent = cell.parent ? MINE_LAYOUT.get(cell.parent) : undefined;
      const direction =
        !parent || parent.row < cell.row
          ? 'SOUTH'
          : parent.row > cell.row
            ? 'NORTH'
            : parent.x < cell.x
              ? 'WEST'
              : 'EAST';
      textSign(
        root,
        `EXIT · ${direction}`,
        `PASSAGE ${cell.x}:${cell.row} · ${cell.distance}m`,
        [p.x, 3.6, p.z + 0.15],
        3,
      );
      signs++;
    }
  }
  // Close the wider first cell around the preserved 6m entrance.
  for (const side of [-1, 1]) solid([2, 5, 0.6], [side * 4, 2.5, -42]);
}

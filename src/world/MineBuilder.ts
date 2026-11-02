import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Materials } from '../render/materials';
import { DIRECTIONS, MINE_LAYOUT, cellKey, cellPosition } from './mineLayout';
import { box, beam, textSign, mesh } from './primitives';
import {
  caveWallGeometry,
  caveCeilingGeometry,
  caveFloorGeometry,
  caveBoulderGeometry,
  caveCeilingHeight,
} from './caveGeometry';

export function buildMine(root: THREE.Group, physics: PhysicsWorld, m: Materials): void {
  const collider = (
    size: readonly [number, number, number],
    at: readonly [number, number, number],
  ): void => {
    physics.addBox({
      center: { x: at[0], y: at[1], z: at[2] },
      size: { x: size[0], y: size[1], z: size[2] },
    });
  };
  const solid = (
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    material = m.timber,
  ): void => {
    box(root, material, size, at);
    collider(size, at);
  };
  let signs = 0;
  for (const cell of MINE_LAYOUT.values()) {
    const p = cellPosition(cell),
      height = cell.chamber ? 7.2 : 5;
    const seed = cell.x * 37 + cell.row * 19 + 7026;
    const variation = (i: number): number => 0.5 + Math.sin(seed * 1.73 + i * 13.71) * 0.5;
    const floor = mesh(root, caveFloorGeometry(p.x, p.z), m.earth, [p.x, 0, p.z]);
    floor.castShadow = false;
    // The flat cap is collision-only. The visible roof is a continuous, sagging rock vault.
    collider([10.65, 0.6, 10.65], [p.x, height + 0.3, p.z]);
    mesh(root, caveCeilingGeometry(p.x, p.z, height), m.rockDark, [p.x, 0, p.z]);
    let connections = 0;
    const closedWalls: (typeof DIRECTIONS)[number][] = [];
    for (const d of DIRECTIONS) {
      const neighbor = MINE_LAYOUT.get(cellKey(cell.x + d.x, cell.row + d.row));
      const dx = d.x,
        dz = -d.row;
      const entrance = cell.x === 0 && cell.row === 0 && d.row === -1;
      if (!neighbor && !entrance) {
        closedWalls.push(d);
        const wall = mesh(
          root,
          caveWallGeometry(10.65, height, seed + d.x * 11 + d.row * 7),
          cell.distance > 400 ? m.rockDark : m.rock,
          [p.x + dx * 5, 0, p.z + dz * 5],
        );
        wall.rotation.y = Math.atan2(dx, dz);
        const positions = wall.geometry.getAttribute('position');
        const indices = wall.geometry.getIndex()!;
        physics.world.createCollider(
          RAPIER.ColliderDesc.trimesh(
            new Float32Array(positions.array),
            new Uint32Array(indices.array),
          )
            .setTranslation(wall.position.x, wall.position.y, wall.position.z)
            .setRotation({
              x: 0,
              y: Math.sin(wall.rotation.y / 2),
              z: 0,
              w: Math.cos(wall.rotation.y / 2),
            })
            .setFriction(0.85),
        );
        // Fractured upper shoulders round the meeting of rock walls and vaults.
        for (let i = 0; i < 2; i++) {
          const u = (i ? 1 : -1) * (1.9 + variation(i) * 1.4);
          const rock = mesh(root, caveBoulderGeometry(seed + i * 31), i ? m.rock : m.rockDark, [
            p.x + dx * 5.55 + (dx ? 0 : u),
            Math.max(3.45, height * 0.69),
            p.z + dz * 5.55 + (dx ? u : 0),
          ]);
          rock.scale.set(dx ? 0.7 : 1.6, 0.48 + variation(i + 4) * 0.2, dx ? 1.6 : 0.7);
          rock.rotation.y = variation(i + 8) * 0.45;
        }
        // Loose edge scree never occupies the rail cross or covers a low ore cluster.
        for (let i = 0; i < 3; i++) {
          const u = (i - 1) * 2.9 + (variation(i + 10) - 0.5) * 0.7;
          const stone = mesh(root, caveBoulderGeometry(seed + i * 17), i % 2 ? m.stone : m.rock, [
            p.x + dx * 5.12 + (dx ? 0 : u),
            0.1,
            p.z + dz * 5.12 + (dx ? u : 0),
          ]);
          stone.scale.set(dx ? 0.2 : 0.55, 0.11, dx ? 0.55 : 0.2);
          stone.rotation.y = variation(i + 14);
        }
      }
      if (neighbor) {
        connections++;
        if (cell.chamber && !neighbor.chamber) {
          collider(dx ? [0.65, 2.2, 10] : [10, 2.2, 0.65], [p.x + dx * 5, 6.1, p.z + dz * 5]);
          const header = mesh(root, caveWallGeometry(10.65, 2.35, seed + 61), m.rockDark, [
            p.x + dx * 5,
            4.95,
            p.z + dz * 5,
          ]);
          header.rotation.y = Math.atan2(dx, dz);
        }
      }
      if (neighbor || entrance) {
        for (const offset of [-0.8, 0.8])
          box(root, m.iron, dx ? [5, 0.045, 0.065] : [0.065, 0.045, 5], [
            p.x + dx * 2.5 + (dx ? 0 : offset),
            0.045,
            p.z + dz * 2.5 + (dx ? offset : 0),
          ]);
        for (let step = 1; step <= 4; step++)
          box(root, m.timber, dx ? [0.19, 0.04, 2.1] : [2.1, 0.04, 0.19], [
            p.x + dx * step,
            0.015,
            p.z + dz * step,
          ]);
      }
    }
    // Old mine timber supports punctuate the rock, instead of framing every square tile.
    if ((cell.row + Math.abs(cell.x)) % 3 === 0 || connections >= 3) {
      for (const x of [-4.7, 4.7]) {
        solid([0.23, height - 0.45, 0.24], [p.x + x, (height - 0.45) / 2, p.z + 4.7]);
        beam(
          root,
          m.wood,
          [p.x + x, height - 1.3, p.z + 4.7],
          [p.x + x * 0.72, height - 0.55, p.z + 4.7],
          0.17,
        );
        box(root, m.iron, [0.27, 0.13, 0.28], [p.x + x, 1.0, p.z + 4.7]);
        box(root, m.iron, [0.27, 0.13, 0.28], [p.x + x, height - 1, p.z + 4.7]);
      }
      box(root, m.timber, [9.7, 0.25, 0.25], [p.x, height - 0.52, p.z + 4.7]);
    }
    // Stalactites start well above jump/head height; the walkable openings remain unchanged.
    if ((cell.row + Math.abs(cell.x)) % 2 === 0)
      for (let i = 0; i < 2; i++) {
        const x = (i ? 1 : -1) * (2.2 + variation(i + 21) * 0.7),
          z = (variation(i + 23) - 0.5) * 4;
        const top = caveCeilingHeight(p.x + x, p.z + z, height) + 0.15;
        const length = Math.min(0.7 + variation(i + 24) * 0.75, top - 3.2);
        const stalactite = mesh(
          root,
          new THREE.ConeGeometry(0.2 + variation(i + 26) * 0.2, length, 7, 2),
          m.rock,
          [p.x + x, top - length / 2, p.z + z],
        );
        stalactite.rotation.z = Math.PI;
      }
    if ((cell.x + cell.row) % 6 === 0 && closedWalls.length > 0) {
      const puddle = mesh(root, new THREE.CircleGeometry(0.65 + variation(31) * 0.5, 12), m.water, [
        p.x + 2.8,
        0.035,
        p.z - 2.6,
      ]);
      puddle.rotation.x = -Math.PI / 2;
      puddle.scale.y = 0.48;
      puddle.castShadow = false;
    }
    if ((cell.x + cell.row) % 3 === 0) {
      // Prefer an actual rock face rather than placing lamps in the middle of branch openings.
      const d = closedWalls[0];
      if (d) {
        const x = p.x + d.x * 4.85,
          z = p.z - d.row * 4.85;
        const flame = mesh(root, new THREE.ConeGeometry(0.1, 0.36, 6), m.fire, [x, 2.65, z]);
        flame.castShadow = false;
        box(root, m.iron, [0.16, 0.24, 0.16], [x, 2.35, z]);
        box(root, m.timber, [0.08, 0.5, 0.08], [x, 2.08, z]);
      }
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
  // Rough stone collars marry the wider natural cave to the original entrance's clear throat.
  for (const side of [-1, 1]) {
    collider([2, 5, 0.6], [side * 4, 2.5, -42]);
    mesh(root, caveWallGeometry(2, 5, side * 23 + 21), m.rock, [side * 4, 0, -42.5]);
  }
}

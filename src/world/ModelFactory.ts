import * as THREE from 'three';
import type { BoxColliderSpec, ModelKind } from '../core/types';
import { Materials } from '../render/materials';
import { beam, box, cylinder, mesh } from './primitives';

export interface WorldModel {
  group: THREE.Group;
  colliders: BoxColliderSpec[];
}

/** All models use local origin at floor level, front facing +Z. Replace here with GLB later. */
export class ModelFactory {
  constructor(private readonly m: Materials) {}

  create(kind: ModelKind): WorldModel {
    const group = new THREE.Group();
    const m = this.m;
    const colliders: BoxColliderSpec[] = [];
    const solid = (sx: number, sy: number, sz: number, x = 0, y = sy / 2, z = 0): void => {
      colliders.push({ center: { x, y, z }, size: { x: sx, y: sy, z: sz } });
    };
    const table = (width: number, depth: number, height = 1.05): void => {
      const boards = Math.max(3, Math.round(depth / 0.19));
      for (let i = 0; i < boards; i++) {
        const z = -depth / 2 + ((i + 0.5) * depth) / boards;
        box(group, m.wood, [width, 0.16, depth / boards - 0.012], [0, height, z]);
        for (const x of [-width / 2 + 0.12, width / 2 - 0.12])
          mesh(group, new THREE.SphereGeometry(0.012, 6, 4), m.iron, [x, height + 0.081, z]);
      }
      box(group, m.timber, [width, 0.14, 0.045], [0, height - 0.08, depth / 2 - 0.02]);
      for (const x of [-width / 2 + 0.17, width / 2 - 0.17])
        for (const z of [-depth / 2 + 0.15, depth / 2 - 0.15])
          box(group, m.timber, [0.17, height, 0.17], [x, height / 2, z]);
      beam(group, m.timber, [-width / 2 + 0.17, 0.25, 0], [width / 2 - 0.17, 0.25, 0], 0.13);
      for (const side of [-1, 1])
        beam(
          group,
          m.timber,
          [side * (width / 2 - 0.17), 0.27, -depth / 2 + 0.15],
          [side * width * 0.25, height - 0.12, -depth / 2 + 0.15],
          0.08,
        );
      solid(width, height + 0.1, depth);
    };
    const book = (x: number, y: number, z: number): void => {
      box(group, m.timber, [0.65, 0.06, 0.47], [x, y, z]);
      box(group, m.parchment, [0.58, 0.045, 0.42], [x, y + 0.05, z]);
      box(group, m.brass, [0.05, 0.012, 0.45], [x + 0.09, y + 0.08, z]);
      box(group, m.timber, [0.025, 0.055, 0.46], [x - 0.29, y + 0.032, z]);
      for (let i = 0; i < 5; i++)
        box(
          group,
          m.timber,
          [0.35 - (i % 2) * 0.07, 0.002, 0.008],
          [x - 0.02, y + 0.075, z - 0.14 + i * 0.055],
        );
    };
    switch (kind) {
      case 'furnace': {
        box(group, m.stone, [3.1, 0.3, 2.5], [0, 0.15, 0]);
        box(group, m.dark, [2.1, 1.8, 0.2], [0, 1.1, -0.95]);
        for (const x of [-1.12, 1.12]) {
          for (let y = 0; y < 5; y++)
            box(group, y % 2 ? m.stoneLight : m.stone, [0.7, 0.46, 2], [x, 0.5 + y * 0.47, 0]);
        }
        box(group, m.stone, [2.95, 0.5, 2], [0, 2.65, 0]);
        for (let i = 0; i < 7; i++) {
          const a = (i / 6) * Math.PI;
          const block = box(
            group,
            m.stoneLight,
            [0.45, 0.48, 0.6],
            [Math.cos(a) * 0.95, 1.65 + Math.sin(a) * 0.9, 1.05],
          );
          block.rotation.z = a - Math.PI / 2;
        }
        box(group, m.stone, [1.4, 3.8, 1.35], [0, 4.7, -0.3]);
        box(group, m.stoneLight, [1.75, 0.3, 1.65], [0, 6.65, -0.3]);
        box(group, m.fire, [1.5, 0.09, 1.3], [0, 0.4, 0]);
        for (let i = 0; i < 5; i++) {
          const coal = mesh(group, new THREE.DodecahedronGeometry(0.24), i % 2 ? m.iron : m.fire, [
            (i - 2) * 0.28,
            0.52,
            0.4,
          ]);
          coal.scale.y = 0.45;
          const flame = mesh(group, new THREE.ConeGeometry(0.14, 0.6 + i * 0.09, 5), m.flame, [
            (i - 2) * 0.27,
            0.82,
            0.18,
          ]);
          flame.userData.unbatched = true;
          flame.name = 'flame';
        }
        const light = new THREE.PointLight('#ff9148', 32, 10, 2);
        light.position.set(0, 1.4, 1.4);
        light.name = 'firelight';
        group.add(light);
        solid(2.9, 2.9, 2.4);
        break;
      }
      case 'anvil': {
        cylinder(group, m.timber, 0.53, 0.62, 0.65, [0, 0.33, 0], 18);
        for (const y of [0.12, 0.52]) {
          cylinder(group, m.iron, 0.58 - y * 0.06, 0.59 - y * 0.06, 0.055, [0, y, 0], 18);
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            mesh(group, new THREE.SphereGeometry(0.021, 6, 4), m.iron, [
              Math.cos(angle) * 0.575,
              y,
              Math.sin(angle) * 0.575,
            ]);
          }
        }
        box(group, m.iron, [0.9, 0.1, 0.55], [-0.08, 0.74, 0]);
        const waist = new THREE.Shape();
        waist.moveTo(-0.47, 0.78);
        waist.lineTo(0.31, 0.78);
        waist.bezierCurveTo(0.11, 0.92, 0.11, 1.05, 0.31, 1.15);
        waist.lineTo(-0.42, 1.15);
        waist.bezierCurveTo(-0.21, 1.02, -0.23, 0.9, -0.47, 0.78);
        const body = new THREE.ExtrudeGeometry(waist, {
          depth: 0.35,
          bevelEnabled: true,
          bevelSize: 0.025,
          bevelThickness: 0.025,
          bevelSegments: 2,
          curveSegments: 8,
        });
        body.translate(0, 0, -0.175);
        mesh(group, body, m.iron);
        const top = new THREE.BoxGeometry(0.87, 0.15, 0.44);
        mesh(group, top, m.metal, [-0.12, 1.225, 0]);
        const hornProfile = new THREE.Shape();
        hornProfile.moveTo(0.29, 1.3);
        hornProfile.bezierCurveTo(0.49, 1.31, 0.66, 1.28, 0.74, 1.225);
        hornProfile.bezierCurveTo(0.57, 1.2, 0.41, 1.17, 0.29, 1.16);
        hornProfile.closePath();
        const horn = new THREE.ExtrudeGeometry(hornProfile, {
          depth: 0.28,
          bevelEnabled: true,
          bevelSize: 0.008,
          bevelThickness: 0.008,
          bevelSegments: 1,
          curveSegments: 10,
        });
        horn.translate(0, 0, -0.14);
        mesh(group, horn, m.metal);
        box(group, m.dark, [0.07, 0.003, 0.07], [-0.38, 1.303, 0.04]);
        beam(group, m.wood, [-0.26, 0.83, 0.39], [0.09, 1.15, 0.39], 0.045);
        box(group, m.iron, [0.23, 0.11, 0.13], [0.1, 1.16, 0.39]);
        solid(1.5, 1.33, 1.2);
        break;
      }
      case 'quench': {
        mesh(group, new THREE.CylinderGeometry(0.83, 0.68, 0.9, 12, 1, true), m.wood, [0, 0.45, 0]);
        for (const y of [0.18, 0.72])
          cylinder(group, m.iron, 0.79 + y * 0.06, 0.78 + y * 0.06, 0.08, [0, y, 0], 12);
        cylinder(group, m.water, 0.75, 0.75, 0.025, [0, 0.87, 0], 20);
        const rim = mesh(group, new THREE.TorusGeometry(0.79, 0.055, 4, 16), m.wood, [0, 0.9, 0]);
        rim.rotation.x = Math.PI / 2;
        solid(1.65, 0.95, 1.65);
        break;
      }
      case 'workbench': {
        table(2.8, 1.05);
        box(group, m.timber, [2.8, 0.18, 0.7], [0, 1.52, -0.42]);
        for (const x of [-1.2, 1.2]) box(group, m.timber, [0.12, 1, 0.12], [x, 1.35, -0.46]);
        box(group, m.metal, [0.28, 0.25, 0.35], [0.9, 1.25, 0.15]);
        cylinder(group, m.iron, 0.05, 0.05, 0.6, [0.95, 1.2, 0.35]).rotation.z = Math.PI / 2;
        for (let i = 0; i < 3; i++)
          beam(group, m.wood, [-0.8 + i * 0.3, 1.15, -0.08], [-0.65 + i * 0.3, 1.15, 0.3], 0.06);
        book(-0.55, 1.17, 0);
        break;
      }
      case 'storage': {
        box(group, m.wood, [2.2, 1.1, 1], [0, 0.6, 0]);
        box(group, m.timber, [2.3, 0.15, 1.08], [0, 1.2, 0]);
        for (const x of [-0.8, 0.8]) box(group, m.iron, [0.14, 1.15, 1.04], [x, 0.62, 0]);
        box(group, m.brass, [0.18, 0.25, 0.06], [0, 0.95, 0.54]);
        for (let i = 0; i < 8; i++)
          box(group, m.timber, [0.012, 1.03, 0.008], [-0.98 + i * 0.28, 0.6, 0.508]);
        for (const x of [-0.8, 0.8])
          for (const y of [0.16, 0.47, 0.79, 1.08])
            mesh(group, new THREE.SphereGeometry(0.025, 6, 4), m.metal, [x, y, 0.535]);
        solid(2.3, 1.3, 1.1);
        break;
      }
      case 'rack': {
        for (const x of [-1.1, 1.1]) {
          box(group, m.timber, [0.16, 2.1, 0.2], [x, 1.05, 0]);
          box(group, m.wood, [0.5, 0.15, 1], [x, 0.08, 0]);
        }
        for (const y of [0.3, 1.55, 1.95]) box(group, m.wood, [2.4, 0.14, 0.22], [0, y, 0]);
        for (let i = 0; i < 5; i++)
          box(group, m.iron, [0.06, 0.06, 0.3], [-0.8 + i * 0.4, 1.5, 0.18]);
        solid(2.45, 2.15, 0.8);
        break;
      }
      case 'ledger':
        table(1.1, 0.85);
        book(0, 1.18, 0);
        break;
      case 'bed': {
        box(group, m.timber, [2.7, 0.45, 1.3], [0, 0.3, 0]);
        box(group, m.parchment, [2.45, 0.2, 1.15], [0, 0.62, 0]);
        box(group, m.cloth, [1.8, 0.08, 1.18], [0.27, 0.75, 0]);
        box(group, m.parchment, [0.45, 0.17, 0.88], [-0.83, 0.8, 0]);
        box(group, m.wood, [0.15, 1.15, 1.4], [-1.35, 0.57, 0]);
        solid(2.8, 0.9, 1.4);
        break;
      }
      case 'counter': {
        table(5, 1.2, 1.15);
        box(group, m.timber, [4.8, 0.9, 0.15], [0, 0.6, 0.5]);
        for (const x of [-1.8, -0.6, 0.6, 1.8])
          box(group, m.wood, [0.08, 0.8, 0.07], [x, 0.6, 0.6]);
        book(-1.4, 1.27, 0);
        cylinder(group, m.brass, 0.13, 0.2, 0.15, [1.5, 1.32, 0.1]);
        cylinder(group, m.brass, 0.025, 0.025, 0.12, [1.5, 1.45, 0.1]);
        break;
      }
      case 'submission':
        table(2, 1.05, 0.86);
        box(group, m.cloth, [1.6, 0.03, 0.82], [0, 0.97, 0]);
        break;
      case 'waiting': {
        table(2.8, 0.65, 0.46);
        box(group, m.wood, [2.8, 0.55, 0.1], [0, 0.94, -0.3]);
        solid(2.8, 1.22, 0.7);
        break;
      }
      case 'cart': {
        box(group, m.wood, [1.6, 0.14, 2.2], [0, 0.85, 0]);
        for (const x of [-0.8, 0.8])
          for (let i = 0; i < 3; i++) box(group, m.wood, [0.1, 0.18, 2.2], [x, 1.05 + i * 0.22, 0]);
        box(group, m.timber, [1.6, 0.7, 0.14], [0, 1.24, -1.05]);
        for (const x of [-1, 1]) {
          const wheel = mesh(group, new THREE.TorusGeometry(0.58, 0.075, 4, 12), m.iron, [
            x,
            0.6,
            0.15,
          ]);
          wheel.rotation.y = Math.PI / 2;
          for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 4;
            beam(
              group,
              m.wood,
              [x, 0.6 + Math.cos(a) * 0.55, 0.15 + Math.sin(a) * 0.55],
              [x, 0.6 - Math.cos(a) * 0.55, 0.15 - Math.sin(a) * 0.55],
              0.08,
            );
          }
          beam(group, m.timber, [x * 0.6, 0.85, 1], [x * 0.6, 0.5, 2.8], 0.1);
        }
        solid(2.2, 1.55, 2.3);
        solid(1.5, 0.6, 1.5, 0, 0.35, 2);
        break;
      }
      case 'dummy': {
        cylinder(group, m.timber, 0.18, 0.23, 2.5, [0, 1.25, 0]);
        cylinder(group, m.hay, 0.45, 0.35, 0.95, [0, 1.55, 0], 8);
        mesh(group, new THREE.IcosahedronGeometry(0.32, 1), m.hay, [0, 2.3, 0]);
        beam(group, m.timber, [-0.95, 1.8, 0], [0.95, 1.8, 0], 0.15);
        for (const y of [1.3, 1.85]) cylinder(group, m.timber, 0.46, 0.46, 0.08, [0, y, 0], 8);
        const target = cylinder(group, m.cloth, 0.26, 0.26, 0.035, [0, 1.65, 0.43], 12);
        target.rotation.x = Math.PI / 2;
        cylinder(group, m.stone, 0.65, 0.8, 0.16, [0, 0.08, 0]);
        solid(1.9, 2.65, 0.9);
        break;
      }
      case 'shield': {
        for (const x of [-0.6, 0.6]) beam(group, m.timber, [x, 0, -0.4], [0, 1.65, 0], 0.12);
        beam(group, m.wood, [-0.58, 0.13, -0.37], [0.58, 0.13, -0.37], 0.09);
        const backing = cylinder(group, m.timber, 0.64, 0.64, 0.07, [0, 1.55, 0], 32);
        backing.rotation.x = Math.PI / 2;
        for (let i = -3; i <= 3; i++) {
          const x = i * 0.17;
          const height = 2 * Math.sqrt(Math.max(0, 0.64 ** 2 - (Math.abs(x) + 0.078) ** 2));
          box(group, i % 2 ? m.wood : m.timber, [0.158, height, 0.05], [x, 1.55, 0.055]);
        }
        mesh(group, new THREE.TorusGeometry(0.635, 0.043, 7, 32), m.metal, [0, 1.55, 0.075]);
        mesh(group, new THREE.TorusGeometry(0.585, 0.013, 5, 32), m.iron, [0, 1.55, 0.095]);
        for (const y of [1.25, 1.85]) box(group, m.iron, [1.02, 0.045, 0.018], [0, y, 0.096]);
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          mesh(group, new THREE.SphereGeometry(0.021, 7, 5), m.metal, [
            Math.cos(angle) * 0.635,
            1.55 + Math.sin(angle) * 0.635,
            0.11,
          ]);
        }
        mesh(group, new THREE.TorusGeometry(0.21, 0.025, 6, 20), m.iron, [0, 1.55, 0.12]);
        const boss = mesh(group, new THREE.SphereGeometry(0.19, 16, 10), m.metal, [0, 1.55, 0.115]);
        boss.scale.z = 0.68;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          mesh(group, new THREE.SphereGeometry(0.018, 6, 4), m.iron, [
            Math.cos(angle) * 0.25,
            1.55 + Math.sin(angle) * 0.25,
            0.14,
          ]);
        }
        solid(1.4, 2.25, 0.9);
        break;
      }
      case 'panel': {
        for (const x of [-0.75, 0.75]) box(group, m.timber, [0.13, 2.1, 0.15], [x, 1.05, 0]);
        box(group, m.wood, [1.9, 1.1, 0.15], [0, 1.5, 0]);
        box(group, m.dark, [1.65, 0.85, 0.025], [0, 1.5, 0.09]);
        for (let i = 0; i < 3; i++)
          box(group, m.parchment, [0.6, 0.015, 0.015], [0, 1.7 - i * 0.2, 0.12]);
        solid(1.95, 2.15, 0.4);
        break;
      }
    }
    return { group, colliders };
  }
}

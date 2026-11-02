import * as THREE from 'three';
import type { BoxColliderSpec } from '../core/types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Materials } from '../render/materials';
import { FIXTURES, seededRandom, WORLD_BOUNDS, WORLD_SEED } from './data';
import { ModelFactory } from './ModelFactory';
import { batchStatic, beam, box, cylinder, mesh, textSign } from './primitives';
import type { Triple } from './primitives';

export class WorldBuilder {
  readonly root = new THREE.Group();
  private readonly factory: ModelFactory;

  constructor(
    private readonly physics: PhysicsWorld,
    readonly materials: Materials,
  ) {
    this.root.name = 'forgeborn-world';
    this.factory = new ModelFactory(materials);
  }

  build(): THREE.Group {
    this.ground();
    this.building();
    this.yard();
    this.mine();
    this.fixtures();
    this.landscape();
    batchStatic(this.root);
    return this.root;
  }

  private solid(material: THREE.Material, size: Triple, at: Triple): THREE.Mesh {
    this.physics.addBox({
      center: { x: at[0], y: at[1], z: at[2] },
      size: { x: size[0], y: size[1], z: size[2] },
    });
    return box(this.root, material, size, at);
  }

  private ground(): void {
    const m = this.materials;
    box(this.root, m.grass, [200, 0.6, 200], [0, -0.32, -10]);
    this.physics.addGround();
    box(this.root, m.cobble, [18, 0.035, 24], [0, -0.005, 8]);
    box(this.root, m.earth, [7, 0.025, 25], [0, -0.006, -16.5]);
    box(this.root, m.cobble, [3.3, 0.027, 18], [0, -0.005, -12.5]);
    box(this.root, m.earth, [21, 0.024, 4], [9, -0.006, -13.5]);
    box(this.root, m.earth, [17, 0.023, 19], [20.5, -0.005, -14.5]);
    box(this.root, m.earth, [4.5, 0.02, 12], [0, -0.007, 26]);
    // Boundaries coincide with visible fences, cliffs and dense trees.
    const b = WORLD_BOUNDS;
    for (const x of [b.minX, b.maxX])
      this.physics.addBox({ center: { x, y: 5, z: -7.5 }, size: { x: 0.5, y: 12, z: 79 } });
    for (const z of [b.minZ, b.maxZ])
      this.physics.addBox({ center: { x: 0, y: 5, z }, size: { x: 68, y: 12, z: 0.5 } });
  }

  private building(): void {
    const m = this.materials;
    // Solid wall segments leave full-height doors/windows open visually and physically.
    for (const x of [-9, 9]) {
      this.solid(m.stone, [0.45, 0.8, 24], [x, 0.4, 8]);
      this.solid(m.plaster, [0.3, 1.0, 24], [x, 1.25, 8]);
      for (const [z, length] of [
        [-2, 4],
        [6, 6],
        [15, 6],
        [19.5, 1],
      ] as const)
        this.solid(m.plaster, [0.3, 2.2, length], [x, 2.7, z]);
      box(this.root, m.timber, [0.5, 0.28, 24.4], [x, 3.9, 8]);
      for (const z of [-4, 2, 10, 12, 20]) box(this.root, m.timber, [0.42, 4, 0.4], [x, 2, z]);
      // Diagonal timber framing.
      for (const z of [3, 13]) beam(this.root, m.timber, [x, 1.85, z], [x, 3.75, z + 3], 0.12);
    }
    for (const z of [-4, 20]) {
      for (const x of [-5.6, 5.6]) {
        this.solid(m.stone, [6.8, 0.65, 0.45], [x, 0.325, z]);
        this.solid(m.plaster, [6.8, 3.1, 0.3], [x, 2.2, z]);
      }
      this.solid(m.timber, [4.4, 0.5, 0.45], [0, 3.65, z]);
      for (const x of [-2.2, 2.2]) this.solid(m.timber, [0.28, 3.5, 0.35], [x, 1.75, z]);
      box(this.root, m.timber, [18.5, 0.3, 0.4], [0, 3.95, z]);
      for (const x of [-6.5, -3.5, 3.5, 6.5])
        box(this.root, m.timber, [0.18, 3.3, 0.4], [x, 2.3, z]);
      for (const x of [-4.5, 4.5]) beam(this.root, m.timber, [x, 4, z], [0, 6.65, z], 0.18);
      for (let i = -8; i <= 8; i++) {
        const height = (1 - Math.abs(i) / 9) * 2.5;
        box(this.root, m.wood, [0.98, height, 0.15], [i, 4 + height / 2, z]);
      }
    }
    // Interior divider between sales room and forge, open 4m in the middle.
    for (const x of [-5.65, 5.65]) {
      this.solid(m.timber, [6.7, 0.23, 0.25], [x, 0.65, 12]);
      this.solid(m.timber, [0.28, 3.8, 0.3], [Math.sign(x) * 2.3, 1.9, 12]);
    }
    box(this.root, m.timber, [18, 0.22, 0.3], [0, 3.7, 12]);
    const slope = Math.atan2(2.7, 9.8);
    for (const side of [-1, 1]) {
      const roof = box(this.root, m.roof, [10.25, 0.18, 26], [side * 4.9, 5.3, 8]);
      roof.rotation.z = -side * slope;
      this.physics.addBox({
        center: { x: side * 4.9, y: 5.3, z: 8 },
        size: { x: 10.25, y: 0.18, z: 26 },
        quaternion: { x: 0, y: 0, z: Math.sin((-side * slope) / 2), w: Math.cos(slope / 2) },
      });
      // Horizontal slate courses, visible from the yard and title vista.
      for (let i = 0; i < 11; i++) {
        const x = side * (i * 0.88 + 0.2);
        const y = 6.65 - Math.abs(x) * Math.tan(slope);
        box(this.root, m.roofEdge, [0.08, 0.09, 26], [x, y + 0.12, 8]);
      }
    }
    box(this.root, m.roofEdge, [0.25, 0.2, 26.3], [0, 6.8, 8]);
    for (const z of [0, 7, 15]) {
      beam(this.root, m.timber, [-8.8, 3.9, z], [8.8, 3.9, z], 0.22);
      beam(this.root, m.timber, [-8.8, 3.9, z], [0, 6.55, z], 0.16);
      beam(this.root, m.timber, [8.8, 3.9, z], [0, 6.55, z], 0.16);
    }
    // Front porch and rear doorway lamps.
    for (const x of [-3, 3]) {
      this.solid(m.timber, [0.23, 3.3, 0.23], [x, 1.65, 22.2]);
      this.torch(x, 2.4, 20.35);
    }
    const awning = box(this.root, m.roof, [7, 0.15, 3], [0, 3.4, 21.6]);
    awning.rotation.x = 0.12;
    textSign(this.root, 'F O R G E B O R N', 'SMITHY & WORKSHOP', [0, 4.65, 20.12], 4.5);
    textSign(this.root, 'THE FORGE', 'EST. IN FIRE', [0, 3.15, 11.8], 2.8);
    textSign(this.root, 'THE BACKYARD', 'MINE  ↑     TRAINING  →', [0, 3.05, -3.8], 2.9, Math.PI);
    this.torch(-2.8, 2.1, -4.3, true);
    this.torch(2.8, 2.1, -4.3);
    // Warm practical lighting inside, soft daylight entering through the open windows.
    for (const z of [6, 16]) {
      const light = new THREE.PointLight('#ffd5a0', 22, 16, 2);
      light.position.set(1, 3.1, z);
      this.root.add(light);
      cylinder(this.root, m.iron, 0.035, 0.035, 0.8, [1, 3.5, z]);
      box(this.root, m.brass, [0.35, 0.12, 0.35], [1, 3.1, z]);
      box(this.root, m.flame, [0.2, 0.3, 0.2], [1, 2.9, z]);
    }
  }

  private fence(start: Triple, end: Triple): void {
    const m = this.materials;
    const length = Math.hypot(end[0] - start[0], end[2] - start[2]);
    const segments = Math.ceil(length / 2.6);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = start[0] + (end[0] - start[0]) * t;
      const z = start[2] + (end[2] - start[2]) * t;
      box(this.root, m.timber, [0.18, 1.35, 0.18], [x, 0.675, z]);
      mesh(this.root, new THREE.ConeGeometry(0.17, 0.22, 4), m.wood, [x, 1.44, z]).rotation.y =
        Math.PI / 4;
    }
    for (const y of [0.45, 1])
      beam(this.root, m.wood, [start[0], y, start[2]], [end[0], y, end[2]], 0.12);
    this.physics.addBox({
      center: { x: (start[0] + end[0]) / 2, y: 0.68, z: (start[2] + end[2]) / 2 },
      size: { x: length + 0.2, y: 1.5, z: 0.2 },
      rotation: -Math.atan2(end[2] - start[2], end[0] - start[0]),
    });
  }

  private yard(): void {
    const m = this.materials;
    this.fence([-14, 0, -4], [-14, 0, -26]);
    this.fence([-14, 0, -26], [-4, 0, -26]);
    this.fence([4, 0, -26], [12, 0, -26]);
    for (const [a, b] of [
      [
        [12, 0, -24],
        [29, 0, -24],
      ],
      [
        [29, 0, -24],
        [29, 0, -5],
      ],
      [
        [29, 0, -5],
        [12, 0, -5],
      ],
      [
        [12, 0, -5],
        [12, 0, -11],
      ],
      [
        [12, 0, -16],
        [12, 0, -24],
      ],
    ] as const)
      this.fence(a, b);
    // Outer boundary is visible instead of an unexplained invisible edge.
    this.fence([-33.5, 0, 30.5], [33.5, 0, 30.5]);
    this.fence([-33.5, 0, 30.5], [-33.5, 0, -45.5]);
    this.fence([33.5, 0, 30.5], [33.5, 0, -45.5]);
    for (const x of [12, 29]) this.torch(x, 1.85, -11);
    for (const x of [-3.5, 3.5]) {
      box(this.root, m.timber, [0.18, 2.4, 0.18], [x, 1.2, -23]);
      this.torch(x, 2.1, -23);
    }
    box(this.root, m.timber, [3.8, 0.15, 0.15], [-5.1, 2.5, -8.5]);
    this.solid(m.timber, [0.2, 2.7, 0.2], [-6.9, 1.35, -8.5]);
    textSign(this.root, 'THE OLD MINE', '↑ NORTH PATH', [-5.1, 2.03, -8.4], 2.4);
    textSign(
      this.root,
      'TRAINING GROUNDS',
      'A PLACE TO FIND YOUR EDGE',
      [12, 2.55, -13.5],
      3,
      -Math.PI / 2,
    );
    // Split logs, barrels and crates remain scenery, not collectible resources.
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 5 - row; i++) {
        const log = cylinder(
          this.root,
          m.timber,
          0.18,
          0.2,
          2.2,
          [-10.2 + i * 0.4 + row * 0.2, 0.2 + row * 0.34, -6.2],
          8,
        );
        log.rotation.x = Math.PI / 2;
      }
    this.physics.addBox({ center: { x: -9.3, y: 0.5, z: -6.2 }, size: { x: 2.8, y: 1, z: 2.4 } });
    for (const [x, z] of [
      [-7.5, 2.8],
      [-7.7, 13.2],
      [-11.7, -16],
      [10.6, 17.5],
    ] as const) {
      cylinder(this.root, m.wood, 0.48, 0.45, 1, [x, 0.5, z], 12);
      for (const y of [0.2, 0.8]) cylinder(this.root, m.iron, 0.49, 0.49, 0.08, [x, y, z], 12);
      this.physics.addBox({ center: { x, y: 0.55, z }, size: { x: 1, y: 1.1, z: 1 } });
    }
  }

  private mine(): void {
    const m = this.materials;
    // Short walkable entrance only. The 500m mine belongs to Phase 2+.
    this.solid(m.rockDark, [1.7, 4.7, 11], [-3.7, 2.35, -37]);
    this.solid(m.rockDark, [1.7, 4.7, 11], [3.7, 2.35, -37]);
    this.solid(m.rockDark, [8.8, 1.8, 11], [0, 5.1, -37]);
    box(this.root, m.earth, [6, 0.04, 16], [0, -0.005, -35]);
    for (const z of [-32, -36, -40]) {
      for (const x of [-2.7, 2.7]) this.solid(m.timber, [0.3, 3.8, 0.32], [x, 1.9, z]);
      this.solid(m.wood, [5.7, 0.35, 0.4], [0, 3.9, z]);
      for (const x of [-2.6, 2.6]) beam(this.root, m.wood, [x, 2.9, z], [x * 0.6, 3.8, z], 0.18);
    }
    this.solid(m.rockDark, [6.1, 4.3, 0.6], [0, 2.1, -42.3]);
    for (let i = 0; i < 7; i++)
      box(this.root, m.wood, [0.54, 3.2, 0.12], [-1.8 + i * 0.6, 1.6, -41.95]);
    beam(this.root, m.timber, [-2.3, 0.25, -41.8], [2.3, 3.2, -41.8], 0.2);
    textSign(this.root, 'THE DEEP AWAITS', 'MINE INTERIOR · PHASE 2', [0, 1.85, -41.7], 3.2);
    textSign(this.root, 'THE OLD MINE', 'BEYOND THE LAST LIGHT', [0, 4.5, -31.2], 4.8);
    for (const x of [-0.8, 0.8]) box(this.root, m.iron, [0.07, 0.04, 10], [x, 0.04, -36.5]);
    for (let z = -32; z >= -41; z -= 0.9)
      box(this.root, m.timber, [2.2, 0.035, 0.16], [0, 0.02, z]);
    this.torch(-2.5, 2.5, -31.7, true);
    this.torch(2.55, 2.2, -37, true);
    const random = seededRandom(122);
    for (let i = 0; i < 36; i++) {
      const side = i % 2 ? -1 : 1;
      const x = side * (4.5 + random() * 12);
      const y = 1 + random() * 3;
      const z = -34 - random() * 12;
      const rock = mesh(
        this.root,
        new THREE.DodecahedronGeometry(1, 0),
        i % 3 ? m.rock : m.rockDark,
        [x, y, z],
      );
      rock.scale.set(2 + random() * 2, 3 + random() * 4, 2 + random() * 3);
      rock.rotation.y = random() * Math.PI;
      this.physics.addBox({
        center: { x, y, z },
        size: { x: rock.scale.x * 1.25, y: rock.scale.y * 1.5, z: rock.scale.z * 1.25 },
      });
    }
    this.fence([-33.5, 0, -45.5], [33.5, 0, -45.5]);
  }

  private fixtures(): void {
    for (const definition of FIXTURES) {
      const { group, colliders } = this.factory.create(definition.kind);
      group.name = definition.id;
      const angle = definition.rotation ?? 0;
      group.position.set(definition.position.x, definition.position.y, definition.position.z);
      group.rotation.y = angle;
      this.root.add(group);
      for (const collider of colliders) {
        const spec: BoxColliderSpec = {
          center: {
            x:
              definition.position.x +
              Math.cos(angle) * collider.center.x +
              Math.sin(angle) * collider.center.z,
            y: definition.position.y + collider.center.y,
            z:
              definition.position.z -
              Math.sin(angle) * collider.center.x +
              Math.cos(angle) * collider.center.z,
          },
          size: collider.size,
          rotation: angle + (collider.rotation ?? 0),
          fixtureId: definition.id,
        };
        this.physics.addBox(spec);
      }
    }
  }

  private torch(x: number, y: number, z: number, lit = false): void {
    const m = this.materials;
    cylinder(this.root, m.timber, 0.07, 0.09, 0.8, [x, y - 0.25, z]);
    cylinder(this.root, m.iron, 0.19, 0.08, 0.28, [x, y + 0.1, z]);
    const flame = mesh(this.root, new THREE.ConeGeometry(0.12, 0.5, 5), m.flame, [x, y + 0.4, z]);
    flame.userData.unbatched = true;
    flame.name = 'flame';
    if (lit) {
      const light = new THREE.PointLight('#ffb866', 7, 7, 2);
      light.position.set(x, y + 0.6, z);
      this.root.add(light);
    }
  }

  private landscape(): void {
    const m = this.materials;
    const random = seededRandom(WORLD_SEED);
    for (let i = 0; i < 95; i++) {
      const angle = random() * Math.PI * 2;
      const distance = 36 + random() * 45;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance - 8;
      if (Math.abs(x) < 34 && z > -46 && z < 31) continue;
      const height = 6 + random() * 8;
      cylinder(this.root, m.timber, 0.18, 0.5, height * 0.7, [x, height * 0.35, z], 6);
      if (i % 3) {
        for (let j = 0; j < 3; j++) {
          const canopy = mesh(
            this.root,
            new THREE.ConeGeometry(height * (0.26 - j * 0.04), height * 0.55, 7),
            i % 2 ? m.needles : m.foliage,
            [x, height * (0.42 + j * 0.18), z],
          );
          canopy.rotation.y = random() * Math.PI;
        }
      } else {
        for (let j = 0; j < 3; j++) {
          const canopy = mesh(
            this.root,
            new THREE.IcosahedronGeometry(height * 0.28, 1),
            j % 2 ? m.foliageLight : m.foliage,
            [x + (j - 1) * 1.3, height * 0.75 + (j % 2) * 1.6, z],
          );
          canopy.scale.y = 0.85;
        }
      }
    }
    for (let i = 0; i < 9; i++) {
      const angle = (i * Math.PI * 2) / 9;
      const mountain = mesh(
        this.root,
        new THREE.ConeGeometry(23 + random() * 15, 30 + random() * 30, 6),
        i % 2 ? m.rockDark : m.rock,
        [Math.cos(angle) * 120, 8, Math.sin(angle) * 120 - 20],
      );
      mountain.rotation.y = random() * 3;
    }
    // Small landscape clusters avoid the navigation corridors.
    for (let i = 0; i < 400; i++) {
      const x = random() * 62 - 31;
      const z = random() * 73 - 44;
      if (
        (Math.abs(x) < 10 && z > -5 && z < 23) ||
        (Math.abs(x) < 8 && z < -3) ||
        (x > 8 && x < 30 && z < -3 && z > -26)
      )
        continue;
      if (i % 5 === 0) {
        const rock = mesh(
          this.root,
          new THREE.DodecahedronGeometry(0.15 + random() * 0.35, 0),
          m.stone,
          [x, 0.1, z],
        );
        rock.scale.y = 0.6;
      } else {
        const grass = mesh(
          this.root,
          new THREE.ConeGeometry(0.16 + random() * 0.15, 0.4 + random() * 0.4, 3),
          i % 3 ? m.foliageLight : m.foliage,
          [x, 0.18, z],
        );
        grass.rotation.z = (random() - 0.5) * 0.3;
      }
    }
  }
}

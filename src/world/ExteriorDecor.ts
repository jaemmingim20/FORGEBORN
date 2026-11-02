import * as THREE from 'three';
import { Materials } from '../render/materials';
import { seededRandom } from './data';
import { box, beam, cylinder, mesh, textSign } from './primitives';
import type { Triple } from './primitives';

/** Local geometry is deterministic and can later be replaced with authored environment assets. */
export function weatheredRock(seed: number, detail = 1): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const position = geometry.getAttribute('position');
  // A direction-based displacement keeps duplicated triangle vertices joined.
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      y = position.getY(i),
      z = position.getZ(i);
    const noise = Math.sin(x * 8.4 + seed) * Math.cos(z * 9.1 - y * 4.3 + seed * 0.4);
    const ridge = 0.84 + noise * 0.12 + Math.sin(y * 11 + seed * 0.1) * 0.04;
    position.setXYZ(i, x * ridge, y * ridge, z * ridge);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function addForgeDetail(root: THREE.Group, m: Materials): void {
  const random = seededRandom(803);
  const slope = Math.atan2(2.7, 9.8);
  // Hundreds of overlapping individual slates produce real silhouette and self-shadow detail.
  for (const side of [-1, 1])
    for (let course = 0; course < 11; course++) {
      const x = side * (course * 0.87 + 0.43);
      const y = 6.65 - Math.abs(x) * Math.tan(slope);
      for (let tile = 0; tile < 29; tile++) {
        const z = -4.5 + tile * 0.91 + (course % 2) * 0.43;
        if (z > 20.9) continue;
        const slate = box(
          root,
          (tile + course) % 7 ? m.roof : m.roofEdge,
          [0.97, 0.055, 0.96],
          [x, y + 0.11 + random() * 0.025, z],
        );
        slate.rotation.z = -side * slope;
      }
    }
  for (const z of [-4.2, 20.2]) {
    for (const side of [-1, 1]) {
      beam(root, m.timber, [side * 9.65, 3.98, z], [0, 6.79, z], 0.25);
      for (const center of [3.9, 7]) {
        const x = center * side;
        beam(root, m.timber, [x - 1.25, 1.8, z], [x + 1.25, 3.76, z], 0.13);
        beam(root, m.timber, [x + 1.25, 1.8, z], [x - 1.25, 3.76, z], 0.13);
      }
    }
    for (const side of [-1, 1])
      for (let i = 0; i < 7; i++)
        for (let row = 0; row < 2; row++) {
          box(
            root,
            (i + row) % 3 ? m.stone : m.stoneLight,
            [0.85, 0.28, 0.15],
            [
              side * (2.65 + i * 0.91) + (row ? 0.15 : 0),
              0.17 + row * 0.31,
              z + Math.sign(z) * 0.11,
            ],
          );
        }
  }
  for (const side of [-1, 1]) {
    for (const z of [-3.5, 1.6, 9.6, 15.2, 19.5]) {
      box(root, m.timber, [0.19, 0.2, 1.5], [side * 9.18, 1.72, z]);
      box(root, m.wood, [0.22, 0.12, 1.7], [side * 9.2, 1.82, z]);
      for (const sign of [-1, 1])
        beam(
          root,
          m.timber,
          [side * 9.19, 1.6, z + sign * 0.62],
          [side * 9.19, 3.8, z + sign * 0.62],
          0.09,
        );
    }
    for (let z = -3.5; z < 20; z += 1.05) {
      box(
        root,
        Math.floor(z) % 3 ? m.stone : m.stoneLight,
        [0.16, 0.34, 0.95],
        [side * 9.26, 0.4, z],
      );
    }
  }
  // A small loft dormer breaks the enormous single roof plane.
  const dx = 4.7,
    dz = 12.4;
  box(root, m.plaster, [2.3, 1.25, 1.8], [dx, 6.1, dz]);
  box(root, m.timber, [2.5, 0.16, 0.19], [dx, 5.55, dz + 0.96]);
  for (const x of [-1.1, 1.1]) box(root, m.timber, [0.15, 1.45, 0.18], [dx + x, 6.17, dz + 0.96]);
  box(root, m.dark, [1.35, 0.82, 0.05], [dx, 6.16, dz + 1.01]);
  box(root, m.wood, [0.09, 0.89, 0.09], [dx, 6.16, dz + 1.06]);
  box(root, m.wood, [1.42, 0.09, 0.09], [dx, 6.16, dz + 1.06]);
  for (const side of [-1, 1]) {
    const roof = box(root, m.roof, [1.65, 0.14, 2.55], [dx + side * 0.67, 6.96, dz]);
    roof.rotation.z = -side * 0.57;
    beam(root, m.timber, [dx + side * 1.4, 6.48, dz + 1.3], [dx, 7.4, dz + 1.3], 0.13);
  }
  // Lantern cases, iron straps and chains frame the entrance without closing the walkable doorway.
  for (const x of [-3, 3]) {
    box(root, m.iron, [0.48, 0.08, 0.48], [x, 2.87, 20.4]);
    for (const xx of [-0.18, 0.18])
      for (const zz of [-0.18, 0.18])
        box(root, m.iron, [0.035, 0.48, 0.035], [x + xx, 2.59, 20.4 + zz]);
    box(root, m.brass, [0.38, 0.06, 0.38], [x, 2.32, 20.4]);
  }
}

export function addTree(
  root: THREE.Group,
  m: Materials,
  x: number,
  z: number,
  height: number,
  seed: number,
): void {
  const random = seededRandom(seed);
  const pine = seed % 3 === 0;
  const trunkHeight = height * (pine ? 0.8 : 0.66);
  cylinder(root, m.timber, 0.13, 0.42, trunkHeight, [x, trunkHeight / 2, z], 9);
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 + random();
    beam(
      root,
      m.timber,
      [x, 0.42, z],
      [x + Math.cos(angle) * 0.78, 0.02, z + Math.sin(angle) * 0.78],
      0.14,
    );
  }
  const crowns = pine ? 7 : 6;
  for (let i = 0; i < crowns; i++) {
    const angle = i * 2.4;
    const level = pine ? i / (crowns - 1) : 0.4 + random() * 0.5;
    const reach = pine ? (1 - level) * height * 0.16 : height * (0.1 + random() * 0.1);
    const cx = x + Math.cos(angle) * reach;
    const cz = z + Math.sin(angle) * reach;
    const cy = pine ? height * (0.35 + level * 0.53) : height * (0.65 + random() * 0.2);
    beam(root, m.timber, [x, trunkHeight * 0.6, z], [cx, cy, cz], 0.1);
    const foliage = mesh(
      root,
      weatheredRock(seed + i * 11, 1),
      pine ? m.needles : i % 3 ? m.foliage : m.foliageLight,
      [cx, cy, cz],
    );
    const radius = pine ? height * (0.24 - level * 0.15) : height * (0.18 + random() * 0.07);
    foliage.scale.set(radius, radius * (pine ? 0.65 : 0.8), radius * 0.9);
  }
}

export function addCottage(root: THREE.Group, m: Materials, at: Triple, scale = 1): void {
  const g = new THREE.Group();
  g.position.set(...at);
  g.scale.setScalar(scale);
  root.add(g);
  box(g, m.stone, [8.3, 0.75, 7.3], [0, 0.38, 0]);
  box(g, m.plaster, [8, 3.2, 7], [0, 2.25, 0]);
  for (const x of [-4, 0, 4])
    for (const z of [-3.55, 3.55]) box(g, m.timber, [0.2, 3.55, 0.2], [x, 2.25, z]);
  for (const z of [-3.55, 3.55]) {
    box(g, m.timber, [8.2, 0.18, 0.2], [0, 1.05, z]);
    box(g, m.timber, [8.2, 0.18, 0.2], [0, 3.8, z]);
    for (const x of [-2, 2]) {
      beam(g, m.timber, [x - 1.5, 1.2, z], [x + 1.5, 3.7, z], 0.13);
    }
    const triangle = new THREE.Shape();
    triangle.moveTo(-4, 0);
    triangle.lineTo(4, 0);
    triangle.lineTo(0, 2.9);
    triangle.closePath();
    const face = mesh(g, new THREE.ShapeGeometry(triangle), m.plaster, [0, 3.8, z]);
    if (z < 0) face.rotation.y = Math.PI;
    for (const x of [-4, 4]) beam(g, m.timber, [x, 3.8, z], [0, 6.7, z], 0.18);
    box(g, m.timber, [0.16, 2.7, 0.18], [0, 5.1, z]);
  }
  for (const side of [-1, 1]) {
    const roof = box(g, m.roof, [5.1, 0.18, 8.2], [side * 2.1, 5.22, 0]);
    roof.rotation.z = -side * 0.59;
    for (let course = 0; course < 6; course++)
      for (let tile = 0; tile < 10; tile++) {
        const x = side * (course * 0.75 + 0.25);
        const y = 6.7 - Math.abs(x) * Math.tan(0.59);
        const slate = box(
          g,
          (course + tile) % 5 ? m.roof : m.roofEdge,
          [0.84, 0.055, 0.88],
          [x, y + 0.1, -3.9 + tile * 0.82 + (course % 2) * 0.3],
        );
        slate.rotation.z = -side * 0.59;
      }
  }
  box(g, m.timber, [1.5, 2.3, 0.12], [0.3, 1.9, 3.62]);
  for (const x of [-2.6, 2.6]) {
    box(g, m.dark, [1.1, 1.15, 0.08], [x, 2.5, 3.62]);
    box(g, m.wood, [0.1, 1.22, 0.1], [x, 2.5, 3.7]);
    box(g, m.wood, [1.2, 0.09, 0.1], [x, 2.5, 3.7]);
  }
  box(g, m.stone, [1.15, 3.8, 1.1], [-2.4, 6.2, -1]);
  box(g, m.stoneLight, [1.4, 0.25, 1.35], [-2.4, 8.2, -1]);
}

export function addGrandEntrance(root: THREE.Group, m: Materials): void {
  const random = seededRandom(371);
  // Large cliff shoulders stay outside the playable throat; no visual rock crosses x ±2.85 below 4.7m.
  for (const side of [-1, 1])
    for (let i = 0; i < 8; i++) {
      const x = side * (12 + i * 3.0),
        y = 5.5 + random() * 2.5,
        z = -38 + (random() - 0.5) * 7;
      const rock = mesh(root, weatheredRock(400 + side * 31 + i, 1), i % 3 ? m.rock : m.rockDark, [
        x,
        y,
        z,
      ]);
      rock.scale.set(5.4 + random() * 2, 11 + random() * 6, 5 + random() * 3);
    }
  // Overlapping bedrock ties the arch into the shoulders and the rear cliff.
  // Central stone stays above the existing throat ceiling and first ore.
  const rearRidge = mesh(root, weatheredRock(321, 2), m.rock, [0, 14, -42]);
  rearRidge.scale.set(20, 8, 10);
  for (const side of [-1, 1]) {
    const shoulder = mesh(root, weatheredRock(325 + side, 2), m.rock, [side * 8.3, 7.9, -36.7]);
    shoulder.scale.set(4.4, 10, 8);
  }
  const crown = mesh(root, weatheredRock(322, 2), m.rock, [0, 11.9, -36]);
  crown.scale.set(12.5, 6.7, 8);
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const rock = mesh(
        root,
        weatheredRock(550 + i + (side + 1) * 15, 1),
        i % 2 ? m.rock : m.stone,
        [side * (4.5 + random() * 0.2), 1.1 + i * 1.6, -30.4],
      );
      rock.scale.set(1.5, 1.3, 2.0);
    }
  // A geological arch, individually fractured rather than a rectangular hole in a block.
  for (let i = 0; i < 13; i++) {
    const a = (i / 12) * Math.PI;
    const rock = mesh(root, weatheredRock(700 + i, 1), i % 3 ? m.rock : m.stone, [
      Math.cos(a) * 4.8,
      3.2 + Math.sin(a) * 4.6,
      -30.5,
    ]);
    rock.scale.set(1.35, 1.55, 2.1);
    rock.rotation.z = a - Math.PI / 2;
  }
  for (const side of [-1, 1]) {
    cylinder(root, m.timber, 0.24, 0.33, 5.5, [side * 5.8, 2.75, -28.9], 10);
    beam(root, m.wood, [side * 8.1, 0.15, -28.9], [side * 5.8, 4.2, -28.9], 0.35);
    for (const y of [1.1, 4.4]) box(root, m.iron, [0.7, 0.16, 0.65], [side * 5.8, y, -28.9]);
    const buttress = mesh(root, weatheredRock(804 + side, 1), m.stone, [side * 7.2, 0.7, -28]);
    buttress.scale.set(1.8, 1.2, 2.4);
  }
  box(root, m.timber, [12.4, 0.5, 0.55], [0, 5.6, -28.9]);
  textSign(root, 'THE OLD MINE', 'DEEP STONE · ANCIENT WORKINGS', [0, 5.55, -28.55], 5.2);
  // Crag shelves and scree skirt make the cliff meet the ground naturally.
  for (let i = 0; i < 24; i++) {
    const side = i % 2 ? -1 : 1;
    const x = side * (7 + random() * 24),
      z = -29 - random() * 6;
    const rock = mesh(root, weatheredRock(900 + i, 0), i % 3 ? m.rock : m.stone, [
      x,
      0.2 + random() * 0.6,
      z,
    ]);
    rock.scale.set(0.6 + random() * 1.6, 0.4 + random() * 0.8, 0.7 + random() * 1.5);
  }
}

/** A small, local smoke plume; no external images or audio assets are requested. */
export function addChimneySmoke(root: THREE.Group, at: Triple, seed: number): void {
  const random = seededRandom(seed);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(195,198,187,.55)');
  gradient.addColorStop(0.4, 'rgba(173,177,168,.3)');
  gradient.addColorStop(1, 'rgba(173,177,168,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.PointsMaterial({
    map,
    color: '#d1d3c9',
    size: 1.8,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const position = new Float32Array(32 * 3),
    offsets = Array.from({ length: 32 }, () => random() * 8),
    variation = Array.from({ length: 32 }, () => random() * Math.PI * 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(1.5, 4, 0), 12);
  const smoke = new THREE.Points(geometry, material);
  smoke.name = 'chimney-smoke';
  smoke.position.set(...at);
  root.add(smoke);
  smoke.onBeforeRender = () => {
    const time = performance.now() / 1000;
    for (let i = 0; i < 32; i++) {
      const y = (offsets[i]! + time * 0.55) % 8;
      position[i * 3] = y * 0.22 + Math.sin(variation[i]! + time * 0.3) * (0.15 + y * 0.08);
      position[i * 3 + 1] = y;
      position[i * 3 + 2] = Math.cos(variation[i]! + time * 0.2) * (0.15 + y * 0.065);
    }
    geometry.getAttribute('position').needsUpdate = true;
  };
}

export function roughEntranceBlock(size: Triple, seed: number): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(...size, 4, 8, 14);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      y = position.getY(i),
      z = position.getZ(i);
    position.setXYZ(
      i,
      x + Math.sin(y * 3.2 + z * 1.4 + seed) * 0.09,
      y + Math.sin(x * 3.4 + z * 1.9 + seed) * 0.08,
      z + Math.cos(x * 2.7 + y * 3.1 + seed) * 0.08,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

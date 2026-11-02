import * as THREE from 'three';
import type { Materials } from '../render/materials';
import { cylinder, mesh } from './primitives';

/** Hand-forged viewmodel. Materials are shared with the world; the caller owns geometries. */
export function buildPickaxeModel(m: Materials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'worn-pickaxe-model';

  // A gently bowed, tapered ash handle with continuous grain rather than a square stick.
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const rings = 14,
    sides = 12;
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    const y = -0.42 + t * 0.77;
    const radius = 0.024 + Math.sin(t * Math.PI) * 0.006 + (1 - t) * 0.004;
    const bend = Math.sin(t * Math.PI) * 0.016;
    for (let side = 0; side <= sides; side++) {
      const angle = (side / sides) * Math.PI * 2;
      positions.push(Math.cos(angle) * radius + bend, y, Math.sin(angle) * radius * 0.86);
      normals.push(Math.cos(angle), 0, Math.sin(angle));
      uvs.push(side / sides, t * 2.5);
      if (ring < rings && side < sides) {
        const a = ring * (sides + 1) + side,
          b = a + sides + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const shaft = new THREE.BufferGeometry();
  shaft.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shaft.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  shaft.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  shaft.setIndex(indices);
  mesh(group, shaft, m.wood);

  // Rolled leather turns around the lower grip, with a small seam and a flared butt cap.
  cylinder(group, m.timber, 0.031, 0.033, 0.22, [0.008, -0.245, 0], 12);
  for (let i = 0; i < 11; i++) {
    const ring = mesh(group, new THREE.TorusGeometry(0.032, 0.0025, 4, 12), m.dark, [
      0.008,
      -0.344 + i * 0.019,
      0,
    ]);
    ring.rotation.x = Math.PI / 2 + 0.1;
  }
  cylinder(group, m.iron, 0.033, 0.038, 0.025, [0, -0.417, 0], 12);

  // Broad forged shoulders taper into curved, downward-pointing blades.
  const outline = new THREE.Shape();
  outline.moveTo(-0.405, 0.235);
  outline.bezierCurveTo(-0.28, 0.355, -0.12, 0.36, -0.045, 0.33);
  outline.lineTo(0.045, 0.33);
  outline.bezierCurveTo(0.15, 0.355, 0.29, 0.33, 0.405, 0.215);
  outline.bezierCurveTo(0.27, 0.27, 0.12, 0.29, 0.04, 0.275);
  outline.lineTo(-0.04, 0.275);
  outline.bezierCurveTo(-0.16, 0.3, -0.29, 0.28, -0.405, 0.235);
  const head = new THREE.ExtrudeGeometry(outline, {
    depth: 0.062,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.005,
    bevelThickness: 0.005,
    curveSegments: 12,
  });
  head.translate(0, 0, -0.031);
  mesh(group, head, m.metal);
  cylinder(group, m.iron, 0.05, 0.047, 0.11, [0, 0.303, 0], 12);
  for (const y of [0.265, 0.345]) cylinder(group, m.metal, 0.05, 0.05, 0.008, [0, y, 0], 12);
  for (const x of [-0.027, 0.027])
    mesh(group, new THREE.SphereGeometry(0.008, 6, 4), m.iron, [x, 0.307, 0.042]);
  // A wooden wedge is visible above the eye of the head.
  cylinder(group, m.timber, 0.027, 0.027, 0.023, [0, 0.365, 0], 8);
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = false;
  });
  return group;
}

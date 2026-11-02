import * as THREE from 'three';

/** Coordinate based variation keeps adjacent cave pieces reproducible and seam-free. */
export function caveNoise(x: number, y: number, seed: number): number {
  return (
    Math.sin(x * 0.63 + y * 1.17 + seed * 0.41) * 0.46 +
    Math.sin(x * 1.83 - y * 0.91 + seed * 0.17) * 0.3 +
    Math.sin(x * 4.13 + y * 3.21 + seed) * 0.16
  );
}

/** At ore/player height the visible face stays behind the ore's 4.775m outer envelope. */
export function caveWallOffset(u: number, y: number, height: number, seed: number): number {
  const brokenStrata = Math.abs(caveNoise(u, y, seed)) * 0.9;
  const ledges = Math.sin(y * 5.2 + Math.sin(u * 0.7 + seed)) * 0.12;
  const shoulder = Math.max(0, Math.min(1, (y - 2.9) / Math.max(0.8, height - 2.9)));
  return Math.max(-0.04, brokenStrata + ledges) - shoulder * 0.78;
}

/** Local +Z faces into solid rock; -Z faces the walkable passage. */
export function caveWallGeometry(
  width: number,
  height: number,
  seed: number,
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height + 0.25, 0.95, 8, 5, 1);
  geometry.translate(0, height / 2 - 0.1, 0.475);
  const positions = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  const normals = geometry.getAttribute('normal');
  for (let i = 0; i < positions.count; i++) {
    const u = positions.getX(i),
      y = positions.getY(i);
    positions.setZ(i, positions.getZ(i) + caveWallOffset(u, y, height, seed));
    if (Math.abs(normals.getX(i)) > 0.5) uv.setXY(i, positions.getZ(i) * 0.15, y * 0.18);
    else if (Math.abs(normals.getY(i)) > 0.5) uv.setXY(i, u * 0.15, positions.getZ(i) * 0.15);
    else uv.setXY(i, u * 0.15, y * 0.18);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function caveCeilingHeight(x: number, z: number, height: number): number {
  const archX = Math.pow(Math.abs(Math.sin(((x + 5) * Math.PI) / 10)), 1.25);
  const archZ = Math.pow(Math.abs(Math.sin(((z + 52) * Math.PI) / 10)), 1.25);
  return height - 1.0 + Math.max(archX, archZ) * 0.83 + caveNoise(x, z, 19) * 0.24;
}

export function caveCeilingGeometry(x: number, z: number, height: number): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(10.8, 10.8, 9, 9);
  geometry.rotateX(Math.PI / 2);
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i++) {
    const px = position.getX(i),
      pz = position.getZ(i);
    position.setY(i, caveCeilingHeight(px + x, pz + z, height));
    uv.setXY(i, (px + x) * 0.13, (pz + z) * 0.13);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function caveFloorGeometry(x: number, z: number): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(10.1, 10.1, 7, 7);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i++) {
    const px = position.getX(i),
      pz = position.getZ(i);
    // Keep the central walking/rail cross flat and add gravel relief along the edges.
    const edge = Math.min(1, Math.max(0, Math.min(Math.abs(px), Math.abs(pz)) - 1.1));
    // Relief stays above the exterior turf plane, which also spans the first cave cells.
    position.setY(i, -0.007 + (caveNoise(px + x, pz + z, 31) + 1) * 0.0125 * edge);
    uv.setXY(i, (px + x) * 0.2, (pz + z) * 0.2);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function caveBoulderGeometry(seed: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const p = geometry.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const scale = 1 + caveNoise(x * 2, y * 2 + z, seed) * 0.17;
    p.setXYZ(i, x * scale, y * scale, z * scale);
  }
  geometry.computeVertexNormals();
  return geometry;
}

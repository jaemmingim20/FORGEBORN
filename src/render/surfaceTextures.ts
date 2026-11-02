import * as THREE from 'three';

export type SurfaceKind =
  | 'cobble'
  | 'oak'
  | 'timber'
  | 'rock'
  | 'limestone'
  | 'plaster'
  | 'slate'
  | 'earth'
  | 'grass'
  | 'iron';
export interface SurfaceMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

function hash(x: number, y: number, period: number): number {
  x = ((x % period) + period) % period;
  y = ((y % period) + period) % period;
  const n = Math.sin(x * 127.1 + y * 311.7 + 41.23) * 43758.5453;
  return n - Math.floor(n);
}
function noise(u: number, v: number, frequency: number): number {
  const x = u * frequency,
    y = v * frequency,
    ix = Math.floor(x),
    iy = Math.floor(y);
  const fx = x - ix,
    fy = y - iy,
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(ix, iy, frequency), hash(ix + 1, iy, frequency), sx),
    THREE.MathUtils.lerp(hash(ix, iy + 1, frequency), hash(ix + 1, iy + 1, frequency), sx),
    sy,
  );
}
const palettes: Record<SurfaceKind, readonly [number, number, number]> = {
  cobble: [141, 137, 119],
  oak: [139, 104, 68],
  timber: [82, 61, 44],
  rock: [124, 123, 112],
  limestone: [161, 155, 134],
  plaster: [206, 193, 159],
  slate: [86, 95, 91],
  earth: [119, 106, 82],
  grass: [104, 113, 77],
  iron: [137, 145, 142],
};

/** Seamless, locally generated PBR surfaces: no runtime image downloads. */
export function surfaceTextures(
  kind: SurfaceKind,
  repeatX = 1,
  repeatY = 1,
  size = 512,
): SurfaceMaps {
  const canvas = (): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  };
  const albedo = canvas(),
    normal = canvas(),
    rough = canvas();
  const a = albedo.getContext('2d')!,
    n = normal.getContext('2d')!,
    r = rough.getContext('2d')!;
  const ai = a.createImageData(size, size),
    ni = n.createImageData(size, size),
    ri = r.createImageData(size, size);
  const heights = new Float32Array(size * size),
    colors = new Float32Array(size * size);
  const wood = kind === 'oak' || kind === 'timber';
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size,
        index = y * size + x;
      const broad = noise(u, v, 4),
        medium = noise(u, v, 16),
        fine = noise(u, v, 64),
        grain = hash(x, y, size);
      let height = broad * 0.5 + medium * 0.3 + fine * 0.15 + grain * 0.05;
      let value = 0.78 + broad * 0.28 + medium * 0.12 + (grain - 0.5) * 0.09;
      if (kind === 'cobble') {
        const row = Math.floor(v * 8),
          shifted = u * 7 + (row % 2) * 0.5;
        const edge = Math.max(
          Math.abs((shifted % 1) - 0.5) / 0.46,
          Math.abs(((v * 8) % 1) - 0.5) / 0.43,
        );
        const stone = Math.max(0, Math.min(1, (1 - edge) * 10));
        height = 0.12 + stone * (0.48 + medium * 0.1);
        value =
          0.48 + stone * (0.4 + hash(Math.floor(shifted), row, 64) * 0.3) + (fine - 0.5) * 0.1;
      } else if (wood) {
        const rings = Math.sin(
          u * 160 * Math.PI + noise(u, v, 8) * 12 + Math.sin(v * Math.PI * 2) * 2,
        );
        const fissure = Math.pow(Math.max(0, Math.sin(u * 96 * Math.PI + noise(u, v, 4) * 4)), 18);
        height = 0.48 + 0.16 * rings - 0.2 * fissure + fine * 0.14;
        value = 0.88 + rings * 0.1 - fissure * 0.23 + (medium - 0.5) * 0.16;
      } else if (kind === 'rock' || kind === 'limestone') {
        // Broken mineral grain and weathered pockets avoid regular contour-like bands.
        const grit = noise(u, v, 128),
          pocket = Math.max(0, 0.3 - noise(u, v, 8)) * 1.7;
        height = broad * 0.24 + medium * 0.27 + fine * 0.27 + grit * 0.16 + grain * 0.06;
        height -= pocket * 0.3;
        value = 0.79 + broad * 0.2 + medium * 0.14 + (fine - 0.5) * 0.24 + (grit - 0.5) * 0.15;
        value += (grain - 0.5) * 0.16 - pocket * 0.22;
      } else if (kind === 'slate') {
        const row = Math.floor(v * 8),
          offset = (row % 2) * 0.5;
        const seam = (v * 8) % 1 < 0.035 || (u * 5 + offset) % 1 < 0.027;
        if (seam) {
          height = 0.12;
          value *= 0.49;
        } else {
          height = 0.5 + medium * 0.16;
          value *= 0.85 + hash(Math.floor(u * 5 + offset), row, 64) * 0.3;
        }
      } else if (kind === 'plaster') {
        const blemish = Math.max(0, broad - 0.63) * 0.8;
        height = 0.45 + fine * 0.12 + grain * 0.08;
        value -= blemish;
      } else if (kind === 'iron') {
        const scratch = Math.pow(Math.max(0, Math.sin(u * 240 * Math.PI + noise(u, v, 8) * 3)), 24);
        height = 0.5 + (fine - 0.5) * 0.06 + scratch * 0.025;
        value = 0.75 + medium * 0.26 + scratch * 0.09;
      }
      heights[index] = height;
      colors[index] = value;
    }
  const base = palettes[kind];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const k = y * size + x,
        i = k * 4;
      const dx =
        heights[y * size + ((x + 1) % size)]! - heights[y * size + ((x + size - 1) % size)]!;
      const dy =
        heights[((y + 1) % size) * size + x]! - heights[((y + size - 1) % size) * size + x]!;
      const strength = wood ? 3 : kind === 'iron' ? 1.5 : 2.3;
      const length = Math.hypot(dx * strength, dy * strength, 1);
      for (let channel = 0; channel < 3; channel++)
        ai.data[i + channel] = THREE.MathUtils.clamp(base[channel]! * colors[k]!, 0, 255);
      ai.data[i + 3] = 255;
      ni.data[i] = 128 - ((dx * strength) / length) * 127;
      ni.data[i + 1] = 128 + ((dy * strength) / length) * 127;
      ni.data[i + 2] = 128 + 127 / length;
      ni.data[i + 3] = 255;
      const rv = kind === 'iron' ? 180 + heights[k]! * 55 : 215 + heights[k]! * 35;
      ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = rv;
      ri.data[i + 3] = 255;
    }
  a.putImageData(ai, 0, 0);
  n.putImageData(ni, 0, 0);
  r.putImageData(ri, 0, 0);
  const make = (source: HTMLCanvasElement, color = false): THREE.CanvasTexture => {
    const t = new THREE.CanvasTexture(source);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = 4;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: make(albedo, true), normalMap: make(normal), roughnessMap: make(rough) };
}

import { CELL_SIZE, MINE_LAYOUT, cellPosition } from './mineLayout';

interface ReservedRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Include rock skin thickness and roots outside the nominal navigable tunnel. */
export const CAVE_VEGETATION_CLEARANCE = 2;
export const ENTRANCE_RESERVATION: Readonly<ReservedRect> = {
  minX: -43,
  maxX: 43,
  minZ: -52,
  maxZ: -26,
};

const halfExtent = CELL_SIZE / 2 + CAVE_VEGETATION_CLEARANCE;
const reservations: readonly ReservedRect[] = [
  ENTRANCE_RESERVATION,
  ...[...MINE_LAYOUT.values()].map((cell) => {
    const p = cellPosition(cell);
    return {
      minX: p.x - halfExtent,
      maxX: p.x + halfExtent,
      minZ: p.z - halfExtent,
      maxZ: p.z + halfExtent,
    };
  }),
];

/**
 * Test the whole horizontal footprint, not only the object's trunk/center.
 * Callers pass the largest root/crown/rock radius; vegetation is outside every
 * reserved cave cell even where underground branches run under the forest.
 */
export function canPlaceVegetation(x: number, z: number, radius: number): boolean {
  if (![x, z, radius].every(Number.isFinite) || radius < 0) return false;
  const radiusSquared = radius * radius;
  for (const area of reservations) {
    // Cheap rejection for distant cells avoids a square root for every candidate.
    if (
      x + radius < area.minX ||
      x - radius > area.maxX ||
      z + radius < area.minZ ||
      z - radius > area.maxZ
    )
      continue;
    const dx = Math.max(area.minX - x, 0, x - area.maxX);
    const dz = Math.max(area.minZ - z, 0, z - area.maxZ);
    if (dx * dx + dz * dz <= radiusSquared) return false;
  }
  return true;
}

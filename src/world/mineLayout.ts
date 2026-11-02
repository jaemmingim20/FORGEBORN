import type { Vec3 } from '../core/types';

export const CELL_SIZE = 10;
export const ENTRY_Z = -47;
export interface MineCell {
  x: number;
  row: number;
  distance: number;
  parent: string | null;
  chamber: boolean;
}
export const cellKey = (x: number, row: number): string => `${x},${row}`;
export const cellPosition = (cell: Pick<MineCell, 'x' | 'row'>): Vec3 => ({
  x: cell.x * CELL_SIZE,
  y: 0,
  z: ENTRY_Z - cell.row * CELL_SIZE,
});
export const DIRECTIONS = [
  { x: 0, row: -1, name: 'S' },
  { x: 1, row: 0, name: 'E' },
  { x: 0, row: 1, name: 'N' },
  { x: -1, row: 0, name: 'W' },
] as const;

export function generateMineLayout(seed = 7026): Map<string, MineCell> {
  const cells = new Map<string, MineCell>();
  const add = (x: number, row: number, chamber = false): void => {
    if (row < 0 || row > 74) return;
    const key = cellKey(x, row);
    const prior = cells.get(key);
    if (prior) prior.chamber ||= chamber;
    else cells.set(key, { x, row, distance: Infinity, parent: null, chamber });
  };
  const horizontal = (a: number, b: number, row: number): void => {
    for (let x = Math.min(a, b); x <= Math.max(a, b); x++) add(x, row);
  };
  const vertical = (x: number, a: number, b: number): void => {
    for (let row = Math.min(a, b); row <= Math.max(a, b); row++) add(x, row);
  };
  let col = 0;
  for (let row = 0; row < 75; row++) {
    if (row > 0 && row % 10 === 0) {
      const next = [-3, 2, -2, 3, -1, 2, 0][Math.floor(row / 10) - 1]!;
      horizontal(col, next, row);
      col = next;
    }
    add(col, row);
  }
  // Six reconnecting side passages create real alternative routes rather than only wider rooms.
  for (let i = 0; i < 6; i++) {
    const row = 5 + i * 11;
    const anchor = [...cells.values()].find((c) => c.row === row)!.x;
    const endAnchor = [...cells.values()].find((c) => c.row === row + 7)!.x;
    const side = anchor + (i % 2 ? -1 : 1) * (5 + ((seed + i) % 2));
    horizontal(anchor, side, row);
    vertical(side, row, row + 7);
    horizontal(side, endAnchor, row + 7);
    // A dead-end spur off each bypass.
    horizontal(side, side + (i % 2 ? -2 : 2), row + 3);
  }
  for (const row of [8, 22, 39, 58, 72]) {
    const center = [...cells.values()].find((c) => c.row === row)!.x;
    for (let dx = -1; dx <= 1; dx++)
      for (let dr = -1; dr <= 1; dr++) add(center + dx, row + dr, true);
  }
  const entrance = cells.get(cellKey(0, 0))!;
  entrance.distance = 15;
  const queue = [entrance];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i]!;
    for (const d of DIRECTIONS) {
      const key = cellKey(cell.x + d.x, cell.row + d.row);
      const next = cells.get(key);
      if (next && !Number.isFinite(next.distance)) {
        next.distance = cell.distance + CELL_SIZE;
        next.parent = cellKey(cell.x, cell.row);
        queue.push(next);
      }
    }
  }
  return cells;
}
export const MINE_LAYOUT = generateMineLayout();
export function cellAt(position: Vec3): MineCell | undefined {
  return MINE_LAYOUT.get(
    cellKey(Math.round(position.x / CELL_SIZE), Math.round((ENTRY_Z - position.z) / CELL_SIZE)),
  );
}
export function layoutDepth(position: Vec3): number {
  if (position.z > -42) return Math.max(0, -32 - position.z);
  const cell = cellAt(position);
  if (!cell) return 0;
  const center = cellPosition(cell);
  const parent = cell.parent
    ? cellPosition(MINE_LAYOUT.get(cell.parent)!)
    : { x: 0, y: 0, z: center.z + 10 };
  return Math.max(
    0,
    cell.distance +
      ((position.x - center.x) * (center.x - parent.x) +
        (position.z - center.z) * (center.z - parent.z)) /
        CELL_SIZE,
  );
}
export function exitDirection(position: Vec3): string {
  const cell = cellAt(position);
  if (!cell?.parent) return '남쪽 S · 대장간';
  const parent = MINE_LAYOUT.get(cell.parent)!;
  return parent.x < cell.x
    ? '서쪽 W'
    : parent.x > cell.x
      ? '동쪽 E'
      : parent.row < cell.row
        ? '남쪽 S'
        : '북쪽 N';
}

import { MINE_LAYOUT, DIRECTIONS, cellKey, cellPosition, layoutDepth } from '../world/mineLayout';
import type { Vec3 } from '../core/types';
import { seededRandom, WORLD_SEED } from '../world/data';

export type OreId = 'copper' | 'iron' | 'coal' | 'silver' | 'mithril';
export const MINE_START = -32;
export const MINE_LENGTH = Math.max(...[...MINE_LAYOUT.values()].map((c) => c.distance)) + 5;
export const ORES: Record<
  OreId,
  { name: string; color: string; hits: number; minDepth: number; tier: number }
> = {
  copper: { name: '구리 광석', color: '#da8b52', hits: 2, minDepth: 0, tier: 0 },
  iron: { name: '철광석', color: '#aebac0', hits: 3, minDepth: 0, tier: 0 },
  coal: { name: '석탄', color: '#3c424b', hits: 2, minDepth: 0, tier: 0 },
  silver: { name: '은 광석', color: '#d8e5f5', hits: 5, minDepth: 100, tier: 1 },
  mithril: { name: '미스릴 광석', color: '#5bd9d4', hits: 8, minDepth: 250, tier: 2 },
};
export interface Vein {
  id: string;
  ore: OreId;
  quantity: number;
  depth: number;
  position: Vec3;
}
export function mineDepth(position: Vec3): number {
  return layoutDepth(position);
}
export function mineSection(depth: number): string {
  return depth < 75
    ? '입구 구역'
    : depth < 150
      ? '하부 광맥'
      : depth < 250
        ? '어둠의 동굴'
        : depth < 375
          ? '버려진 갱도'
          : '심연';
}
export function halfWidth(depth: number): number {
  return Math.floor(depth / 10) % 5 === 3 || Math.floor(depth / 10) % 5 === 4 ? 5.5 : 3;
}
export function generateVeins(seed = WORLD_SEED): Vein[] {
  const random = seededRandom(seed),
    veins: Vein[] = [];
  const choose = (depth: number): OreId => {
    const chance = random();
    return depth >= 250 && chance < 0.1 + Math.min(0.15, ((depth - 250) / 300) * 0.1)
      ? 'mithril'
      : depth >= 100 && chance < 0.32
        ? 'silver'
        : chance < 0.55
          ? 'iron'
          : chance < 0.82
            ? 'copper'
            : 'coal';
  };
  for (const [i, ore] of (['iron', 'copper', 'coal'] as const).entries())
    veins.push({
      id: `vein-${i}`,
      ore,
      depth: 7 * (i + 1),
      quantity: 2 + Math.floor(random() * 4),
      position: { x: i % 2 ? 2.25 : -2.25, y: 1.05, z: MINE_START - 7 * (i + 1) },
    });
  for (const cell of [...MINE_LAYOUT.values()].sort(
    (a, b) => a.distance - b.distance || a.row - b.row || a.x - b.x,
  )) {
    if (cell.distance <= 25) continue;
    const walls = DIRECTIONS.filter(
      (d) => !MINE_LAYOUT.has(cellKey(cell.x + d.x, cell.row + d.row)),
    );
    if (!walls.length) continue;
    const d = walls[Math.floor(random() * walls.length)]!,
      p = cellPosition(cell),
      offset = (random() - 0.5) * 4;
    veins.push({
      id: `vein-${veins.length}`,
      ore: choose(cell.distance),
      depth: cell.distance,
      quantity: 2 + Math.floor(random() * 4),
      position: {
        x: p.x + d.x * 4.25 + (d.x ? 0 : offset),
        y: 1.05,
        z: p.z - d.row * 4.25 + (d.x ? offset : 0),
      },
    });
  }
  return veins;
}

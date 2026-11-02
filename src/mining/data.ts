import type { Vec3 } from '../core/types';
import { seededRandom, WORLD_SEED } from '../world/data';

export type OreId = 'copper' | 'iron' | 'coal' | 'silver' | 'mithril';
export const MINE_START = -32;
export const MINE_LENGTH = 500;
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
  return Math.max(0, Math.min(MINE_LENGTH, MINE_START - position.z));
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
  const random = seededRandom(seed);
  const veins: Vein[] = [];
  for (let depth = 7; depth < MINE_LENGTH - 3; depth += 7) {
    const chance = random();
    const ore: OreId =
      depth === 7
        ? 'iron'
        : depth === 14
          ? 'copper'
          : depth === 21
            ? 'coal'
            : depth >= 250 && chance < 0.1 + ((depth - 250) / 250) * 0.1
              ? 'mithril'
              : depth >= 100 && chance < 0.32
                ? 'silver'
                : chance < 0.55
                  ? 'iron'
                  : chance < 0.82
                    ? 'copper'
                    : 'coal';
    const side = veins.length % 2 ? 1 : -1;
    veins.push({
      id: `vein-${veins.length}`,
      ore,
      depth,
      quantity: 2 + Math.floor(random() * 4),
      position: { x: side * (halfWidth(depth) - 0.75), y: 1.05, z: MINE_START - depth },
    });
  }
  return veins;
}

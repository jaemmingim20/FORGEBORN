import { ORES } from '../mining/data';
import type { OreId } from '../mining/data';
export type MaterialId =
  | 'copper-ingot'
  | 'iron-ingot'
  | 'silver-ingot'
  | 'mithril-ingot'
  | 'steel-ingot';
export type ItemId = OreId | MaterialId | 'worn-pickaxe';
export const ITEMS: Record<
  ItemId,
  { name: string; color: string; category: 'ore' | 'material' | 'tool' }
> = {
  ...(Object.fromEntries(
    Object.entries(ORES).map(([id, data]) => [
      id,
      { name: data.name, color: data.color, category: 'ore' as const },
    ]),
  ) as Record<OreId, { name: string; color: string; category: 'ore' }>),
  'worn-pickaxe': { name: '낡은 곡괭이', color: '#c6ad7d', category: 'tool' },
  'copper-ingot': { name: '구리 재료', color: '#dc955d', category: 'material' },
  'iron-ingot': { name: '철 재료', color: '#bbc6c8', category: 'material' },
  'silver-ingot': { name: '은 재료', color: '#e6ecfa', category: 'material' },
  'mithril-ingot': { name: '미스릴 재료', color: '#70e3db', category: 'material' },
  'steel-ingot': { name: '강철 재료', color: '#879faf', category: 'material' },
};

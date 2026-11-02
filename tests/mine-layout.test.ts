import { describe, expect, it } from 'vitest';
import {
  CELL_SIZE,
  DIRECTIONS,
  MINE_LAYOUT,
  cellKey,
  cellPosition,
  generateMineLayout,
  layoutDepth,
} from '../src/world/mineLayout';
import { generateVeins, ORES } from '../src/mining/data';

describe('확장 광산 그래프', () => {
  it('고정 시드로 연결된 넓은 광산과 실제 순환 경로를 만든다', () => {
    expect([...MINE_LAYOUT.entries()]).toEqual([...generateMineLayout().entries()]);
    expect(MINE_LAYOUT.size).toBeGreaterThan(180);
    expect([...MINE_LAYOUT.values()].every((c) => Number.isFinite(c.distance))).toBe(true);
    let edges = 0;
    for (const c of MINE_LAYOUT.values())
      for (const d of DIRECTIONS) if (MINE_LAYOUT.has(cellKey(c.x + d.x, c.row + d.row))) edges++;
    expect(edges / 2 - MINE_LAYOUT.size + 1).toBeGreaterThan(5);
    expect(Math.max(...[...MINE_LAYOUT.values()].map((c) => c.row)) * CELL_SIZE + 10).toBe(750);
    expect([...MINE_LAYOUT.values()].filter((c) => c.chamber).length).toBeGreaterThan(35);
  });
  it('동일한 Z에 있는 분기라도 통로 거리에 따라 깊이를 계산한다', () => {
    const branch = [...MINE_LAYOUT.values()].find(
      (c) => c.parent && MINE_LAYOUT.get(c.parent)!.x !== c.x,
    )!;
    expect(layoutDepth(cellPosition(branch))).toBe(branch.distance);
    const parent = MINE_LAYOUT.get(branch.parent!)!;
    expect(branch.distance - parent.distance).toBe(CELL_SIZE);
  });
  it('광맥은 접근 가능한 외곽 벽과 기획서 최소 깊이를 따른다', () => {
    const veins = generateVeins();
    expect(veins.length).toBeGreaterThan(150);
    for (const v of veins) {
      expect(v.depth).toBeGreaterThanOrEqual(ORES[v.ore].minDepth);
      expect(v.position.z).toBeLessThan(-32);
    }
  });
});

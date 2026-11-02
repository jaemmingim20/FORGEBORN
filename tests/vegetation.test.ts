import { describe, expect, it } from 'vitest';
import { CELL_SIZE, MINE_LAYOUT, cellPosition } from '../src/world/mineLayout';
import {
  CAVE_VEGETATION_CLEARANCE,
  ENTRANCE_RESERVATION,
  canPlaceVegetation,
} from '../src/world/vegetation';

describe('광산 식생 배치 예약', () => {
  it('입구 접근로와 모든 깊은 분기/채굴실에 식생을 배치하지 않는다', () => {
    expect(canPlaceVegetation(0, -27, 0.2)).toBe(false);
    expect(canPlaceVegetation(17.5, -38, 0.1)).toBe(false);
    for (const cell of MINE_LAYOUT.values()) {
      const p = cellPosition(cell);
      expect(canPlaceVegetation(p.x, p.z, 0)).toBe(false);
      expect(canPlaceVegetation(p.x + CELL_SIZE / 2, p.z, 0.5)).toBe(false);
    }
  });

  it('나무 중심이 밖에 있어도 수관이나 뿌리의 반경이 입구에 닿으면 거부한다', () => {
    const x = ENTRANCE_RESERVATION.maxX + 4;
    const z = -32;
    expect(canPlaceVegetation(x, z, 0.1)).toBe(true);
    expect(canPlaceVegetation(x, z, 4)).toBe(false);
    expect(canPlaceVegetation(x, z, 5)).toBe(false);
  });

  it('격자 통로 바깥에도 암벽 두께를 위한 여유를 둔다', () => {
    // The east-most cave cell has no other cave cell further east.
    const eastern = [...MINE_LAYOUT.values()].reduce((a, b) => (b.x > a.x ? b : a));
    const p = cellPosition(eastern);
    const outerEdge = p.x + CELL_SIZE / 2 + CAVE_VEGETATION_CLEARANCE;
    expect(canPlaceVegetation(outerEdge + 2, p.z, 1)).toBe(true);
    expect(canPlaceVegetation(outerEdge + 2, p.z, 2)).toBe(false);
  });

  it('동굴에 접하지 않는 숲은 허용하고 잘못된 좌표/반경은 거부한다', () => {
    expect(canPlaceVegetation(65, 45, 8)).toBe(true);
    expect(canPlaceVegetation(-70, 38, 4)).toBe(true);
    expect(canPlaceVegetation(0, 0, -1)).toBe(false);
    expect(canPlaceVegetation(Infinity, 0, 1)).toBe(false);
    expect(canPlaceVegetation(0, NaN, 1)).toBe(false);
  });
});

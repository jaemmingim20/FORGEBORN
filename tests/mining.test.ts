import { describe, expect, it } from 'vitest';
import { InventoryManager } from '../src/inventory/InventoryManager';
import { MiningManager } from '../src/mining/MiningManager';
import { generateVeins, ORES, mineDepth, mineSection } from '../src/mining/data';
import type { Vein } from '../src/mining/data';

const vein: Vein = {
  id: 'iron-test',
  ore: 'iron',
  quantity: 4,
  depth: 7,
  position: { x: -2.25, y: 1, z: -39 },
};
describe('Phase 2 채굴과 수집', () => {
  it('고정 시드로 같은 광맥과 2~5개 매장량을 생성하며 안전 지대에 생성하지 않는다', () => {
    const veins = generateVeins();
    expect(veins).toEqual(generateVeins());
    expect(new Set(veins.map((v) => v.id)).size).toBe(veins.length);
    expect(veins.length).toBeGreaterThan(60);
    for (const v of veins) {
      expect(v.depth).toBeGreaterThanOrEqual(ORES[v.ore].minDepth);
      expect(v.position.z).toBeLessThan(-32);
      expect(v.quantity).toBeGreaterThanOrEqual(2);
      expect(v.quantity).toBeLessThanOrEqual(5);
    }
    expect(veins.some((v) => v.ore === 'silver')).toBe(true);
    expect(veins.some((v) => v.ore === 'mithril')).toBe(true);
  });
  it('철 3회 타격 후 정해진 수량만 획득하며 반복 공격으로 복제하지 못한다', () => {
    const inv = new InventoryManager();
    const manager = new MiningManager([vein], inv);
    expect(manager.strike(vein.id, 0)).toBe('hit');
    expect(manager.strike(vein.id, 0.7)).toBe('hit');
    expect(inv.count('iron')).toBe(0);
    expect(manager.strike(vein.id, 1.4)).toBe('collected');
    expect(inv.count('iron')).toBe(4);
    expect(manager.strike(vein.id, 2.1)).toBe('empty');
    expect(inv.count('iron')).toBe(4);
  });
  it.each(['copper', 'coal'] as const)('%s는 2회 타격한다', (ore) => {
    const inv = new InventoryManager();
    const manager = new MiningManager([{ ...vein, ore }], inv);
    expect(manager.strike(vein.id, 0)).toBe('hit');
    expect(manager.strike(vein.id, 0.7)).toBe('collected');
    expect(inv.count(ore)).toBe(4);
  });
  it('공격 간격을 지키고 장착 해제 상태에서 채굴하지 않는다', () => {
    const inv = new InventoryManager();
    const manager = new MiningManager([vein], inv);
    expect(manager.strike(vein.id, 0)).toBe('hit');
    expect(manager.strike(vein.id, 0.1)).toBe('cooldown');
    inv.toggleEquip();
    expect(manager.strike(vein.id, 0.7)).toBe('tool');
    expect(manager.veins.get(vein.id)!.remaining).toBe(2);
  });
  it.each(['silver', 'mithril'] as const)('낡은 곡괭이로 %s를 수집할 수 없다', (ore) => {
    const inv = new InventoryManager();
    const manager = new MiningManager([{ ...vein, ore }], inv);
    expect(manager.strike(vein.id, 0)).toBe('tool');
    expect(inv.count(ore)).toBe(0);
    expect(manager.veins.get(vein.id)!.remaining).toBe(ORES[ore].hits);
  });
  it('인벤토리가 가득 차면 마지막 타격을 보류하고 광맥을 보존한다', () => {
    const inv = new InventoryManager(undefined, 2);
    inv.add('copper', 99);
    const manager = new MiningManager([vein], inv);
    manager.strike(vein.id, 0);
    manager.strike(vein.id, 0.7);
    expect(manager.strike(vein.id, 1.4)).toBe('full');
    expect(manager.veins.get(vein.id)!.depleted).toBe(false);
    expect(manager.veins.get(vein.id)!.remaining).toBe(1);
    expect(inv.count('iron')).toBe(0);
  });
  it('스택 분할과 전체 수집의 용량 검사를 원자적으로 수행한다', () => {
    const inv = new InventoryManager(undefined, 3);
    expect(inv.add('iron', 100)).toBe(true);
    expect(inv.snapshot().slots).toHaveLength(3);
    expect(inv.add('coal', 1)).toBe(false);
    expect(inv.count('coal')).toBe(0);
    expect(inv.add('iron', 99)).toBe(false);
    expect(inv.count('iron')).toBe(100);
    expect(inv.add('iron', 0)).toBe(false);
  });
  it('깊이는 진행 거리이며 구역 경계를 따른다', () => {
    expect(mineDepth({ x: 0, y: 1, z: -39 })).toBe(7);
    expect(mineDepth({ x: 20, y: 1, z: 0 })).toBe(0);
    expect(mineSection(74)).toBe('입구 구역');
    expect(mineSection(75)).toBe('하부 광맥');
    expect(mineSection(150)).toBe('어둠의 동굴');
    expect(mineSection(375)).toBe('심연');
  });
});

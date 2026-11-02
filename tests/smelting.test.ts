import { describe, expect, it } from 'vitest';
import { InventoryManager } from '../src/inventory/InventoryManager';
import { SmeltingManager } from '../src/smelting/SmeltingManager';

describe('Phase 3 제련', () => {
  it('철광석을 즉시 차감하고 12초 뒤 철 재료를 정확히 한 번 생성한다', () => {
    const inv = new InventoryManager();
    inv.add('iron', 2);
    const m = new SmeltingManager(inv);
    expect(m.start('furnace-01', 'iron')).toBe(true);
    expect(inv.count('iron')).toBe(1);
    expect(m.start('furnace-01', 'iron')).toBe(false);
    expect(inv.count('iron')).toBe(1);
    m.update(11.9);
    expect(inv.count('iron-ingot')).toBe(0);
    m.update(0.11);
    expect(inv.count('iron-ingot')).toBe(1);
    m.update(100);
    expect(inv.count('iron-ingot')).toBe(1);
  });
  it('재료 부족 또는 잘못된 요청은 재료와 슬롯을 변경하지 않는다', () => {
    const inv = new InventoryManager();
    inv.add('iron-ingot', 1);
    const m = new SmeltingManager(inv);
    const before = inv.snapshot();
    expect(m.start('furnace-01', 'steel')).toBe(false);
    expect(m.start('missing', 'iron')).toBe(false);
    expect(m.start('furnace-01', 'missing')).toBe(false);
    expect(inv.snapshot()).toEqual(before);
    expect(m.furnaces.get('furnace-01')!.jobs).toHaveLength(0);
  });
  it('강철은 철 재료 1개와 석탄 1개로 생성한다', () => {
    const inv = new InventoryManager();
    inv.add('iron-ingot', 1);
    inv.add('coal', 1);
    const m = new SmeltingManager(inv);
    expect(m.start('furnace-01', 'steel')).toBe(true);
    expect(inv.count('iron-ingot')).toBe(0);
    expect(inv.count('coal')).toBe(0);
    m.update(12);
    expect(inv.count('steel-ingot')).toBe(1);
  });
  it('레벨별 여러 슬롯과 서로 다른 용광로 타이머는 독립적이다', () => {
    const inv = new InventoryManager();
    inv.add('iron', 3);
    const m = new SmeltingManager(inv);
    m.register('second', 2);
    expect(m.start('second', 'iron')).toBe(true);
    expect(m.start('second', 'iron')).toBe(true);
    expect(m.start('second', 'iron')).toBe(false);
    expect(m.start('furnace-01', 'iron')).toBe(true);
    m.update(9);
    expect(inv.count('iron-ingot')).toBe(2);
    m.update(3);
    expect(inv.count('iron-ingot')).toBe(3);
  });
  it('가득 찬 인벤토리에 결과를 잃지 않고 공간이 생길 때 한 번만 수집한다', () => {
    const inv = new InventoryManager(undefined, 2);
    inv.add('iron', 2);
    const m = new SmeltingManager(inv);
    m.start('furnace-01', 'iron');
    m.update(12);
    expect(m.furnaces.get('furnace-01')!.jobs[0]!.state).toBe('waiting-space');
    expect(inv.count('iron-ingot')).toBe(0);
    m.update(100);
    expect(inv.count('iron-ingot')).toBe(0);
    inv.exchange([{ item: 'iron', quantity: 1 }], []);
    m.update(0);
    m.update(100);
    expect(inv.count('iron-ingot')).toBe(1);
    expect(m.furnaces.get('furnace-01')!.jobs[0]!.state).toBe('complete');
  });
  it('용량 부족의 교환은 입력도 차감하지 않는다', () => {
    const inv = new InventoryManager(undefined, 2);
    inv.add('iron', 5);
    const before = inv.snapshot();
    expect(
      inv.exchange([{ item: 'iron', quantity: 1 }], [{ item: 'iron-ingot', quantity: 1 }]),
    ).toBe(false);
    expect(inv.snapshot()).toEqual(before);
  });
});

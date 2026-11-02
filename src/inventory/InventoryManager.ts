import { EventBus } from '../core/EventBus';
import type { OreId } from '../mining/data';

export interface InventorySlot {
  item: OreId | 'worn-pickaxe';
  quantity: number;
}
export interface InventorySnapshot {
  slots: InventorySlot[];
  capacity: number;
  equipped: boolean;
}

export class InventoryManager {
  private readonly slots: InventorySlot[] = [{ item: 'worn-pickaxe', quantity: 1 }];
  equipped = true;
  constructor(
    private readonly events?: EventBus,
    readonly capacity = 20,
  ) {}
  snapshot(): InventorySnapshot {
    return {
      slots: this.slots.map((s) => ({ ...s })),
      capacity: this.capacity,
      equipped: this.equipped,
    };
  }
  count(item: OreId): number {
    return this.slots.filter((s) => s.item === item).reduce((n, s) => n + s.quantity, 0);
  }
  canAdd(item: OreId, quantity: number): boolean {
    if (!Number.isInteger(quantity) || quantity < 1) return false;
    const space =
      this.slots.filter((s) => s.item === item).reduce((n, s) => n + 99 - s.quantity, 0) +
      (this.capacity - this.slots.length) * 99;
    return quantity <= space;
  }
  add(item: OreId, quantity: number): boolean {
    if (!this.canAdd(item, quantity)) return false;
    for (const slot of this.slots)
      if (slot.item === item && quantity > 0) {
        const add = Math.min(99 - slot.quantity, quantity);
        slot.quantity += add;
        quantity -= add;
      }
    while (quantity > 0) {
      const add = Math.min(99, quantity);
      this.slots.push({ item, quantity: add });
      quantity -= add;
    }
    this.notify();
    return true;
  }
  toggleEquip(): void {
    this.equipped = !this.equipped;
    this.notify();
  }
  notify(): void {
    this.events?.emit('inventoryChanged', this.snapshot());
  }
}

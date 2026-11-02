import { EventBus } from '../core/EventBus';
import type { ItemId } from '../items/data';

export interface InventorySlot {
  item: ItemId;
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
  count(item: ItemId): number {
    return this.slots.filter((s) => s.item === item).reduce((n, s) => n + s.quantity, 0);
  }
  canAdd(item: ItemId, quantity: number): boolean {
    if (!Number.isInteger(quantity) || quantity < 1) return false;
    const space =
      this.slots.filter((s) => s.item === item).reduce((n, s) => n + 99 - s.quantity, 0) +
      (this.capacity - this.slots.length) * 99;
    return quantity <= space;
  }
  add(item: ItemId, quantity: number): boolean {
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
  exchange(inputs: readonly InventorySlot[], outputs: readonly InventorySlot[]): boolean {
    const next = this.slots.map((s) => ({ ...s }));
    for (const { item, quantity } of inputs) {
      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        next.filter((s) => s.item === item).reduce((n, s) => n + s.quantity, 0) < quantity
      )
        return false;
      let left = quantity;
      for (const slot of next)
        if (slot.item === item && left > 0) {
          const take = Math.min(left, slot.quantity);
          slot.quantity -= take;
          left -= take;
        }
    }
    const planned = next.filter((s) => s.quantity > 0);
    for (const { item, quantity } of outputs) {
      if (!Number.isInteger(quantity) || quantity < 1) return false;
      let left = quantity;
      for (const slot of planned)
        if (slot.item === item && left > 0) {
          const add = Math.min(99 - slot.quantity, left);
          slot.quantity += add;
          left -= add;
        }
      while (left > 0) {
        if (planned.length >= this.capacity) return false;
        const add = Math.min(99, left);
        planned.push({ item, quantity: add });
        left -= add;
      }
    }
    this.slots.splice(0, this.slots.length, ...planned);
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

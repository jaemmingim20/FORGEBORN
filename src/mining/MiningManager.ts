import { EventBus } from '../core/EventBus';
import { InventoryManager } from '../inventory/InventoryManager';
import { ORES } from './data';
import type { Vein } from './data';

export interface VeinState extends Vein {
  remaining: number;
  depleted: boolean;
}
export type StrikeResult = 'hit' | 'collected' | 'full' | 'tool' | 'cooldown' | 'empty';
export class MiningManager {
  readonly veins: Map<string, VeinState>;
  private nextHit = 0;
  constructor(
    veins: readonly Vein[],
    readonly inventory: InventoryManager,
    private readonly events?: EventBus,
  ) {
    this.veins = new Map(
      veins.map((v) => [v.id, { ...v, remaining: ORES[v.ore].hits, depleted: false }]),
    );
  }
  strike(id: string, now: number): StrikeResult {
    const vein = this.veins.get(id);
    if (!vein || vein.depleted) return 'empty';
    if (now < this.nextHit) return 'cooldown';
    this.nextHit = now + 0.65;
    if (!this.inventory.equipped || ORES[vein.ore].tier > 0) return 'tool';
    if (vein.remaining === 1 && !this.inventory.canAdd(vein.ore, vein.quantity)) return 'full';
    vein.remaining--;
    if (vein.remaining > 0) return 'hit';
    // Mark consumed before publishing inventory events, preventing re-entrant duplicate collection.
    vein.depleted = true;
    if (!this.inventory.add(vein.ore, vein.quantity)) {
      vein.depleted = false;
      vein.remaining = 1;
      return 'full';
    }
    this.events?.emit('miningFeedback', `${ORES[vein.ore].name} +${vein.quantity}`);
    return 'collected';
  }
}

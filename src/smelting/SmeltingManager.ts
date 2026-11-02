import { EventBus } from '../core/EventBus';
import { InventoryManager } from '../inventory/InventoryManager';
import type { ItemId } from '../items/data';
import { ITEMS } from '../items/data';

export interface Recipe {
  id: string;
  name: string;
  inputs: ReadonlyArray<{ item: ItemId; quantity: number }>;
  output: ItemId;
}
export const RECIPES: readonly Recipe[] = [
  { id: 'iron', name: '철 제련', inputs: [{ item: 'iron', quantity: 1 }], output: 'iron-ingot' },
  {
    id: 'copper',
    name: '구리 제련',
    inputs: [{ item: 'copper', quantity: 1 }],
    output: 'copper-ingot',
  },
  {
    id: 'silver',
    name: '은 제련',
    inputs: [{ item: 'silver', quantity: 1 }],
    output: 'silver-ingot',
  },
  {
    id: 'mithril',
    name: '미스릴 제련',
    inputs: [{ item: 'mithril', quantity: 1 }],
    output: 'mithril-ingot',
  },
  {
    id: 'steel',
    name: '강철 합금',
    inputs: [
      { item: 'iron-ingot', quantity: 1 },
      { item: 'coal', quantity: 1 },
    ],
    output: 'steel-ingot',
  },
];
export const FURNACE_LEVELS = [
  null,
  { seconds: 12, slots: 1 },
  { seconds: 9, slots: 2 },
  { seconds: 7, slots: 3 },
  { seconds: 5, slots: 4 },
  { seconds: 3, slots: 5 },
] as const;
export interface SmeltJob {
  id: number;
  recipeId: string;
  remaining: number;
  total: number;
  state: 'processing' | 'waiting-space' | 'complete';
}
export interface Furnace {
  id: string;
  level: number;
  jobs: SmeltJob[];
}
export class SmeltingManager {
  readonly furnaces = new Map<string, Furnace>();
  private serial = 0;
  constructor(
    readonly inventory: InventoryManager,
    private readonly events?: EventBus,
  ) {
    this.register('furnace-01', 1);
  }
  register(id: string, level: number): void {
    if (this.furnaces.has(id)) throw new Error('이미 등록된 용광로입니다.');
    if (!FURNACE_LEVELS[level]) throw new Error('지원하지 않는 용광로 레벨입니다.');
    this.furnaces.set(id, { id, level, jobs: [] });
  }
  settings(furnace: Furnace): { readonly seconds: number; readonly slots: number } {
    return FURNACE_LEVELS[furnace.level]!;
  }
  canStart(id: string, recipeId: string): boolean {
    const furnace = this.furnaces.get(id),
      recipe = RECIPES.find((r) => r.id === recipeId);
    if (!furnace || !recipe) return false;
    return (
      furnace.jobs.filter((j) => j.state !== 'complete').length < this.settings(furnace).slots &&
      recipe.inputs.every((i) => this.inventory.count(i.item) >= i.quantity)
    );
  }
  start(id: string, recipeId: string): boolean {
    if (!this.canStart(id, recipeId)) return false;
    const furnace = this.furnaces.get(id)!,
      recipe = RECIPES.find((r) => r.id === recipeId)!;
    const seconds = this.settings(furnace).seconds;
    const job: SmeltJob = {
      id: ++this.serial,
      recipeId,
      remaining: seconds,
      total: seconds,
      state: 'processing',
    };
    furnace.jobs.push(job);
    if (!this.inventory.exchange(recipe.inputs, [])) {
      furnace.jobs.splice(furnace.jobs.indexOf(job), 1);
      return false;
    }
    this.events?.emit('smeltingChanged', undefined);
    return true;
  }
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) return;
    for (const furnace of this.furnaces.values()) {
      for (const job of [...furnace.jobs]) {
        if (job.state === 'complete') continue;
        job.remaining = Math.max(0, job.remaining - dt);
        if (job.remaining > 0) continue;
        const recipe = RECIPES.find((r) => r.id === job.recipeId)!;
        // Reserve completion before inventory events; re-entrant updates cannot duplicate output.
        job.state = 'complete';
        if (!this.inventory.exchange([], [{ item: recipe.output, quantity: 1 }])) {
          job.state = 'waiting-space';
          continue;
        }
        this.events?.emit('miningFeedback', `${ITEMS[recipe.output].name} +1 · 제련 완료`);
        this.events?.emit('smeltingChanged', undefined);
      }
      const history = furnace.jobs.filter((j) => j.state === 'complete');
      if (history.length > 5)
        furnace.jobs = furnace.jobs.filter(
          (j) => j.state !== 'complete' || history.slice(-5).includes(j),
        );
    }
  }
}

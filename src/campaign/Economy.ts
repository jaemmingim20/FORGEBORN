import { CraftingManager, WEAPONS, METALS } from '../crafting/CraftingManager';
import type { WeaponKind } from '../crafting/CraftingManager';
import { SmeltingManager } from '../smelting/SmeltingManager';
export interface Customer {
  kind: WeaponKind;
  special: boolean;
  variation: number;
  weaponId: number | null;
  price: number | null;
}
export interface DayStats {
  sales: number;
  trade: number;
  market: number;
  parts: number;
  upgrades: number;
  crafted: number;
  mined: number;
  depth: number;
  opening: number;
}
export class Economy {
  day = 1;
  handled = 0;
  customer: Customer | null = null;
  history: Array<DayStats & { day: number; net: number }> = [];
  stats: DayStats;
  constructor(
    readonly craft: CraftingManager,
    readonly smelting: SmeltingManager,
  ) {
    this.stats = this.fresh();
  }
  fresh(): DayStats {
    return {
      sales: 0,
      trade: 0,
      market: 0,
      parts: 0,
      upgrades: 0,
      crafted: 0,
      mined: 0,
      depth: 0,
      opening: this.craft.coins,
    };
  }
  arrive(): void {
    if (this.customer || this.handled >= 5) return;
    const kinds = Object.keys(WEAPONS) as WeaponKind[];
    const special = Math.random() < 0.08;
    this.customer = {
      kind: kinds[Math.floor(Math.random() * 5)]!,
      special,
      variation: (Math.random() * 2 - 1) * (special ? 0.6 : 0.3),
      weaponId: null,
      price: null,
    };
  }
  submit(id: number): string {
    const c = this.customer,
      w = this.craft.weapons.find((w) => w.id === id);
    if (!c || !w || w.kind !== c.kind) return '주문 종류에 맞는 장비를 선택하세요.';
    if (c.weaponId !== null) return '이미 제안이 확정되었습니다.';
    c.weaponId = id;
    c.price = Math.round(w.value * (1 + c.variation));
    return '';
  }
  remove(id: number): boolean {
    const n = this.craft.weapons.findIndex((w) => w.id === id);
    if (n < 0) return false;
    this.craft.weapons.splice(n, 1);
    if (this.craft.selected?.id === id) this.craft.selected = null;
    return true;
  }
  accept(): string {
    const c = this.customer;
    if (!c || c.weaponId === null || c.price === null) return '먼저 무기를 제출하세요.';
    if (!this.remove(c.weaponId)) return '제출한 무기가 없습니다.';
    this.craft.coins += c.price;
    this.stats.trade += c.price;
    this.stats.sales++;
    this.customer = null;
    this.handled++;
    return '';
  }
  reject(): void {
    if (!this.customer) return;
    this.customer = null;
    this.handled++;
  }
  sell(id: number): string {
    if (this.customer?.weaponId === id) return '제안 중인 장비는 먼저 거래를 마무리하세요.';
    const w = this.craft.weapons.find((w) => w.id === id);
    if (!w) return '장비가 없습니다.';
    const price = Math.floor(w.value * 0.9);
    if (!this.remove(id)) return '이미 처리된 장비입니다.';
    this.craft.coins += price;
    this.stats.market += price;
    this.stats.sales++;
    return '';
  }
  dismantle(id: number): string {
    if (this.customer?.weaponId === id) return '제안 중인 장비는 분해할 수 없습니다.';
    const w = this.craft.weapons.find((w) => w.id === id);
    if (!w) return '장비가 없습니다.';
    const out = METALS.map((item) => ({ item, quantity: Math.floor(w.metals[item] * 0.7) })).filter(
      (i) => i.quantity > 0,
    );
    if (!this.craft.inventory.exchange([], out)) return '인벤토리 공간이 부족합니다.';
    this.remove(id);
    return '';
  }
  upgrade(id: string): string {
    const f = this.smelting.furnaces.get(id);
    if (!f || f.level >= 5) return '최고 레벨입니다.';
    const price = [0, 800, 2000, 4500, 10000][f.level]!;
    if (this.craft.coins < price) return '자금이 부족합니다.';
    this.craft.coins -= price;
    this.stats.upgrades += price;
    f.level++;
    return '';
  }
  expand(): string {
    const count = this.smelting.furnaces.size,
      price = [0, 1500, 4000, 9000][count];
    if (!price) return '최대 4개까지 설치할 수 있습니다.';
    if (this.craft.coins < price) return '자금이 부족합니다.';
    this.craft.coins -= price;
    this.stats.upgrades += price;
    this.smelting.register(`furnace-0${count + 1}`, 1);
    return '';
  }
  sleep(): void {
    this.history.push({ ...this.stats, day: this.day, net: this.craft.coins - this.stats.opening });
    this.history = this.history.slice(-30);
    this.day++;
    this.handled = 0;
    this.customer = null;
    this.stats = this.fresh();
  }
}

import { InventoryManager } from '../inventory/InventoryManager';
import type { MaterialId } from '../items/data';
export const METALS: readonly MaterialId[] = [
  'copper-ingot',
  'iron-ingot',
  'steel-ingot',
  'silver-ingot',
  'mithril-ingot',
];
export const METAL_STATS = [
  { value: 18, power: 0.75, color: '#be8053' },
  { value: 40, power: 1, color: '#b9c3c7' },
  { value: 75, power: 1.3, color: '#768d9f' },
  { value: 110, power: 1.15, color: '#e2e4ef' },
  { value: 260, power: 1.7, color: '#6ed6cd' },
];
export const WEAPONS = {
  sword: { name: '검', count: 3, base: 12, parts: ['손잡이', '코등이', '장식'] },
  shield: { name: '방패', count: 4, base: 35, parts: ['손잡이', '테두리', '문양'] },
  hammer: { name: '망치', count: 5, base: 24, parts: ['손잡이', '연결 부품', '장식'] },
  axe: { name: '도끼', count: 4, base: 17, parts: ['손잡이', '연결 부품', '장식'] },
  pickaxe: { name: '곡괭이', count: 3, base: 7, parts: ['손잡이', '연결 부품', '장식'] },
} as const;
export type WeaponKind = keyof typeof WEAPONS;
export const TIERS = [
  { name: '기본형', price: 0 },
  { name: '일반형', price: 50 },
  { name: '고급형', price: 150 },
  { name: '명품형', price: 350 },
] as const;
export type CraftStage = 'heating' | 'forging' | 'quenching' | 'assembly';
export interface CraftJob {
  kind: WeaponKind;
  metals: Record<MaterialId, number>;
  stage: CraftStage;
  elapsed: number;
  heat: number;
  strikes: number[];
  quench: number;
}
export interface CraftedWeapon {
  id: number;
  kind: WeaponKind;
  metals: Record<MaterialId, number>;
  parts: number[];
  quality: number;
  grade: string;
  power: number;
  durability: number;
  value: number;
}
export class CraftingManager {
  coins = 200;
  job: CraftJob | null = null;
  readonly weapons: CraftedWeapon[] = [];
  selected: CraftedWeapon | null = null;
  private serial = 0;
  constructor(readonly inventory: InventoryManager) {}
  start(kind: WeaponKind, metals: Record<MaterialId, number>): string {
    if (this.job) return '진행 중인 제작을 먼저 완성하세요.';
    if (!WEAPONS[kind] || METALS.some((m) => !Number.isInteger(metals[m]) || metals[m] < 0))
      return '금속 수량을 확인하세요.';
    if (METALS.reduce((n, m) => n + metals[m], 0) !== WEAPONS[kind].count)
      return `금속 ${WEAPONS[kind].count}개를 선택하세요.`;
    if (this.weapons.length >= 20) return '완성품 보관대가 가득 찼습니다.';
    const inputs = METALS.filter((m) => metals[m] > 0).map((item) => ({
      item,
      quantity: metals[item],
    }));
    if (!this.inventory.exchange(inputs, []))
      return '선택한 금속 재료가 부족합니다. 광석을 먼저 제련하세요.';
    this.job = {
      kind,
      metals: { ...metals },
      stage: 'heating',
      elapsed: 0,
      heat: 0,
      strikes: [],
      quench: 0,
    };
    return '';
  }
  update(dt: number): void {
    if (this.job && Number.isFinite(dt) && dt > 0) this.job.elapsed += dt;
  }
  extract(): void {
    const j = this.job;
    if (!j || j.stage !== 'heating') return;
    j.heat = Math.max(0, 1 - Math.abs(Math.min(j.elapsed / 8, 1) - 0.73) / 0.73);
    j.stage = 'forging';
    j.elapsed = 0;
  }
  target(): { x: number; y: number } {
    const n = this.job?.strikes.length ?? 0;
    return { x: 20 + ((n * 37 + 13) % 60), y: 25 + ((n * 23 + 7) % 50) };
  }
  strike(x: number, y: number): void {
    const j = this.job;
    if (!j || j.stage !== 'forging') return;
    const t = this.target();
    j.strikes.push(Math.max(0, 1 - Math.hypot(x - t.x, y - t.y) / 30));
    if (j.strikes.length === 6) {
      j.stage = 'quenching';
      j.elapsed = 0;
    }
  }
  cool(): void {
    const j = this.job;
    if (!j || j.stage !== 'quenching') return;
    j.quench = Math.max(0, 1 - Math.abs(j.elapsed - 2.3) / 2.3);
    j.stage = 'assembly';
    j.elapsed = 0;
  }
  finish(parts: number[]): string {
    const j = this.job;
    if (!j || j.stage !== 'assembly') return '조립할 가공품이 없습니다.';
    if (parts.length !== 3 || parts.some((p) => !Number.isInteger(p) || !TIERS[p]))
      return '부품을 선택하세요.';
    const cost = parts.reduce((n, p) => n + TIERS[p]!.price, 0);
    if (cost > this.coins) return '부품 구매 자금이 부족합니다. 기본형은 무료입니다.';
    if (this.weapons.length >= 20) return '완성품 보관대가 가득 찼습니다.';
    const quality = Math.round(
      j.heat * 25 + (j.strikes.reduce((a, b) => a + b, 0) / 6) * 50 + j.quench * 25,
    );
    const power =
      METALS.reduce((n, m, i) => n + j.metals[m] * METAL_STATS[i]!.power, 0) /
      WEAPONS[j.kind].count;
    const w: CraftedWeapon = {
      id: ++this.serial,
      kind: j.kind,
      metals: { ...j.metals },
      parts: [...parts],
      quality,
      grade: quality < 40 ? '조잡함' : quality < 70 ? '보통' : quality < 90 ? '우수' : '걸작',
      power: Math.round(WEAPONS[j.kind].base * power * (0.8 + quality * 0.004)),
      durability: Math.round(100 * power * (0.8 + quality * 0.004)),
      value: METALS.reduce((n, m, i) => n + j.metals[m] * METAL_STATS[i]!.value, 0) + cost,
    };
    this.coins -= cost;
    this.weapons.push(w);
    this.selected = w;
    this.job = null;
    return '';
  }
}

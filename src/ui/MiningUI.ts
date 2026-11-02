import { EventBus } from '../core/EventBus';
import type { GameState, Vec3 } from '../core/types';
import { InventoryManager } from '../inventory/InventoryManager';
import { MiningManager } from '../mining/MiningManager';
import { mineDepth, mineSection, ORES } from '../mining/data';
import type { OreId } from '../mining/data';
import './mining.css';

export class MiningUI {
  readonly element = document.createElement('div');
  private readonly unsub: (() => void)[] = [];
  private state: GameState = 'ready';
  private toastUntil = 0;
  private now = 0;
  private completed = false;
  constructor(
    container: HTMLElement,
    private readonly inventory: InventoryManager,
    private readonly mining: MiningManager,
    events: EventBus,
    close: () => void,
  ) {
    this.element.className = 'mining-ui';
    this.element.innerHTML = `
      <div class="mining-hud" hidden>
        <div class="mining-objective"><span>CHAPTER II · FIRST ORE</span><p class="objective-text">광산에서 철광석을 채굴하고 대장간으로 돌아오세요.</p></div>
        <div class="mine-depth" hidden><b></b><span></span><small>레일을 따라 돌아가면 대장간으로 이어집니다.</small></div>
        <div class="ore-target" hidden><small>MINERAL VEIN</small><h3></h3><p></p><progress></progress><span></span></div>
        <div class="mining-toast" role="status" hidden></div>
        <div class="equipment-bar"><kbd>3</kbd> <span class="tool-label"></span><i></i><kbd>좌클릭</kbd> 채굴 <i></i><kbd>Tab</kbd> 인벤토리</div>
      </div>
      <section class="inventory-panel" role="dialog" aria-modal="true" aria-label="인벤토리" hidden>
        <div class="inventory-card"><header><div><small>YOUR SATCHEL</small><h2>인벤토리</h2></div><button class="inventory-close" type="button" aria-label="인벤토리 닫기">닫기 · Tab</button></header>
        <p class="inventory-capacity"></p><div class="inventory-grid"></div>
        <div class="inventory-tool"><div><b>낡은 곡괭이</b><p>기본 광물 채굴용 · 판매/분해 불가</p></div><button class="inventory-equip" type="button"></button></div>
        <p class="inventory-note">광석은 한 칸에 99개까지 보관합니다. 진행 상태는 현재 세션에 유지됩니다.<br>제련·제작·거래·영구 저장은 이후 단계에서 연결됩니다.</p></div>
      </section>`;
    container.append(this.element);
    this.get('.inventory-close').addEventListener('click', close);
    this.get('.inventory-equip').addEventListener('click', () => inventory.toggleEquip());
    this.unsub.push(
      events.on('stateChanged', (state) => {
        this.state = state;
        this.get('.mining-hud').hidden = state !== 'playing';
        this.get('.inventory-panel').hidden = state !== 'inventory';
        if (state === 'inventory') {
          this.renderInventory();
          this.get('.inventory-close').focus();
        }
      }),
      events.on('inventoryChanged', () => this.renderInventory()),
      events.on('miningFeedback', (message) => {
        this.get('.mining-toast').textContent = message;
        this.toastUntil = this.now + 2.6;
      }),
    );
    this.renderInventory();
  }
  private get(selector: string): HTMLElement {
    return this.element.querySelector<HTMLElement>(selector)!;
  }
  private renderInventory(): void {
    const snapshot = this.inventory.snapshot();
    this.get('.inventory-capacity').textContent =
      `${snapshot.slots.length} / ${snapshot.capacity}칸 사용 · 광석 ${snapshot.slots.filter((s) => s.item !== 'worn-pickaxe').reduce((n, s) => n + s.quantity, 0)}개`;
    const grid = this.get('.inventory-grid');
    grid.replaceChildren();
    for (let i = 0; i < snapshot.capacity; i++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      const item = snapshot.slots[i];
      if (item) {
        const tool = item.item === 'worn-pickaxe';
        const data = tool ? { name: '낡은 곡괭이', color: '#c6ad7d' } : ORES[item.item as OreId];
        const icon = document.createElement('span');
        icon.className = 'item-icon';
        icon.textContent = tool ? '⚒' : '◆';
        icon.style.color = data.color;
        const name = document.createElement('b');
        name.textContent = data.name;
        const amount = document.createElement('small');
        amount.textContent = tool
          ? snapshot.equipped
            ? '장착 중'
            : '장착 해제'
          : `× ${item.quantity}`;
        slot.append(icon, name, amount);
        slot.dataset.item = item.item;
      } else {
        slot.classList.add('empty');
        slot.textContent = String(i + 1).padStart(2, '0');
      }
      grid.append(slot);
    }
    this.get('.inventory-equip').textContent = snapshot.equipped ? '장착 해제' : '장착하기';
    this.get('.tool-label').textContent = snapshot.equipped
      ? '낡은 곡괭이 · 장착 중'
      : '빈손 · 3번으로 곡괭이 장착';
  }
  update(position: Vec3, zone: string | undefined, targetId: string | null, time: number): void {
    this.now = time;
    const depth = mineDepth(position);
    const underground = zone === 'mine';
    this.get('.mine-depth').hidden = !underground;
    this.get('.mine-depth b').textContent = `${Math.floor(depth)} m`;
    this.get('.mine-depth span').textContent = mineSection(depth);
    const target = targetId ? this.mining.veins.get(targetId) : null;
    this.get('.ore-target').hidden = !target || target.depleted || this.state !== 'playing';
    if (target && !target.depleted) {
      const ore = ORES[target.ore];
      this.get('.ore-target h3').textContent = ore.name;
      this.get('.ore-target h3').style.color = ore.color;
      this.get('.ore-target p').textContent =
        `광맥 매장량 ${target.quantity}개 · 남은 타격 ${target.remaining}/${ore.hits}`;
      const progress = this.element.querySelector<HTMLProgressElement>('.ore-target progress')!;
      progress.max = ore.hits;
      progress.value = ore.hits - target.remaining;
      this.get('.ore-target span').textContent = ore.tier
        ? `${ore.tier === 1 ? '철' : '강철'} 이상 곡괭이 필요`
        : this.inventory.equipped
          ? '좌클릭 · 곡괭이로 타격'
          : '3번 키 · 곡괭이 장착';
    }
    const iron = this.inventory.count('iron');
    if (iron > 0 && zone === 'forge' && !this.completed) this.completed = true;
    this.get('.objective-text').textContent = this.completed
      ? '첫 채굴 완료 · 철광석을 대장간까지 운반했습니다.'
      : iron > 0
        ? `철광석 ${iron}개 확보 · 대장간으로 돌아오세요.`
        : '광산에서 철광석을 채굴하고 대장간으로 돌아오세요.';
    this.get('.mining-toast').hidden = time > this.toastUntil || this.toastUntil === 0;
  }
  dispose(): void {
    this.unsub.forEach((fn) => fn());
    this.element.remove();
  }
}

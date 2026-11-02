import { EventBus } from '../core/EventBus';
import { SmeltingManager, RECIPES } from '../smelting/SmeltingManager';
import { ITEMS } from '../items/data';
import './smelting.css';

export class SmeltingUI {
  readonly element = document.createElement('section');
  private readonly unsub: (() => void)[] = [];
  private opened = false;
  private refresh = 0;
  constructor(
    container: HTMLElement,
    private readonly manager: SmeltingManager,
    events: EventBus,
    close: () => void,
  ) {
    this.element.className = 'smelting-panel';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-label', '용광로 제련');
    this.element.innerHTML = `<div class="inventory-card smelting-card"><header><div><small>FIRE INTO METAL</small><h2>돌 용광로</h2></div><button class="smelt-close" type="button">닫기 · Esc</button></header><p class="smelt-settings"></p><div class="smelt-jobs"></div><h3>제련할 재료 선택</h3><div class="smelt-recipes"></div><p class="smelt-notice" role="status"></p><p class="inventory-note">시작 시 재료를 차감합니다. 결과는 인벤토리로 자동 수집됩니다.<br>공간이 없으면 결과가 용광로에 보관됩니다. 창을 닫아도 제련은 계속됩니다.</p></div>`;
    container.append(this.element);
    this.get('.smelt-close').addEventListener('click', close);
    this.get('.smelt-recipes').addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        'button[data-recipe]',
      );
      if (!button) return;
      if (manager.start('furnace-01', button.dataset.recipe!))
        this.get('.smelt-notice').textContent = '재료를 투입했습니다. 제련을 시작합니다.';
      else this.get('.smelt-notice').textContent = '재료 또는 빈 작업 슬롯이 부족합니다.';
      this.render();
    });
    this.unsub.push(
      events.on('stateChanged', (state) => {
        this.opened = state === 'smelting';
        this.element.hidden = !this.opened;
        if (this.opened) {
          this.render();
          this.get('.smelt-close').focus();
        }
      }),
      events.on('inventoryChanged', () => {
        if (this.opened) this.renderRecipes();
      }),
      events.on('smeltingChanged', () => {
        if (this.opened) this.render();
      }),
      events.on('controlError', (message) => {
        if (this.opened) this.get('.smelt-notice').textContent = message;
      }),
    );
  }
  private get(selector: string): HTMLElement {
    return this.element.querySelector<HTMLElement>(selector)!;
  }
  private renderRecipes(): void {
    this.get('.smelt-recipes').innerHTML = RECIPES.map(
      (recipe) =>
        `<div class="smelt-recipe"><div><b>${recipe.name}</b><small>${recipe.inputs.map((input) => `${ITEMS[input.item].name} ${input.quantity}개 (보유 ${this.manager.inventory.count(input.item)})`).join(' + ')} → ${ITEMS[recipe.output].name} 1개</small></div><button type="button" data-recipe="${recipe.id}" ${this.manager.canStart('furnace-01', recipe.id) ? '' : 'disabled'}>${recipe.name} 시작</button></div>`,
    ).join('');
  }
  private render(): void {
    const furnace = this.manager.furnaces.get('furnace-01')!,
      settings = this.manager.settings(furnace);
    this.get('.smelt-settings').textContent =
      `레벨 ${furnace.level} · 동시 작업 ${settings.slots}슬롯 · 1회 ${settings.seconds}초 · 별도 연료 불필요`;
    this.renderRecipes();
    this.renderJobs();
  }
  private renderJobs(): void {
    const furnace = this.manager.furnaces.get('furnace-01')!;
    const jobs = furnace.jobs.slice(-5);
    this.get('.smelt-jobs').innerHTML = jobs.length
      ? jobs
          .map((job) => {
            const recipe = RECIPES.find((r) => r.id === job.recipeId)!;
            const label =
              job.state === 'complete'
                ? '수집 완료'
                : job.state === 'waiting-space'
                  ? '제련 완료 · 인벤토리 공간 대기'
                  : `${job.remaining.toFixed(1)}초 남음`;
            return `<div class="smelt-job" data-state="${job.state}"><div><b>${ITEMS[recipe.output].name}</b><span>${label}</span></div><progress max="${job.total}" value="${job.total - job.remaining}"></progress></div>`;
          })
          .join('')
      : '<div class="smelt-empty">빈 제련 슬롯 · 아래에서 광석을 선택하세요.</div>';
  }
  update(dt: number): void {
    this.refresh += dt;
    if (this.opened && this.refresh >= 0.1) {
      this.refresh = 0;
      this.renderJobs();
    }
  }
  dispose(): void {
    this.unsub.forEach((fn) => fn());
    this.element.remove();
  }
}

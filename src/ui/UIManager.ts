import { MINE_LAYOUT, cellPosition } from '../world/mineLayout';
import { EventBus } from '../core/EventBus';
import type { FixtureDefinition, GameState, Vec3, ZoneDefinition } from '../core/types';
import { ZONES } from '../world/data';

const ANVIL =
  '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M7 21h34l-8 8H21v7h9v4H9v-4h7V27l-9-3z" fill="currentColor"/><path d="M26 17c-7-4-5-9-1-13-1 5 6 6 1 13z" fill="currentColor"/></svg>';

interface UIActions {
  enter(): void;
  reset(): void;
  sensitivity(value: number): void;
  headBob(value: boolean): void;
}

export class UIManager {
  readonly element = document.createElement('div');
  private readonly unsubscribers: (() => void)[] = [];
  private readonly abort = new AbortController();
  private readonly visited = new Set<string>();
  private mapVisible = false;
  private state: GameState = 'ready';
  private currentTarget: FixtureDefinition | null = null;
  private readonly overlay: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly target: HTMLElement;
  private readonly playerMarker: SVGElement;

  constructor(container: HTMLElement, events: EventBus, actions: UIActions) {
    this.element.id = 'game-ui';
    this.element.innerHTML = `
      <div class="screen-grain" aria-hidden="true"></div><div class="vignette" aria-hidden="true"></div>
      <header class="masthead"><div class="brand">${ANVIL}<span>FORGEBORN<small>A BLACKSMITH'S TALE</small></span></div><div class="phase-badge"><i></i> PHASE 04 <span>무기 제작</span></div></header>
      <section class="menu-overlay" aria-label="게임 메뉴">
        <div class="title-layout">
          <div class="chapter"><span>CHAPTER III</span><b></b> FIRE INTO METAL</div>
          <h1>FORGE<span>BORN</span><em>불꽃에서 시작되는 이야기</em></h1>
          <p class="intro">숲 가장자리의 작은 대장간.<br>차가운 모루, 따뜻한 불씨, 그리고 당신의 첫걸음.</p>
          <button class="enter-button" type="button" data-action="enter"><span>대장간에 들어가기</span><span aria-hidden="true">↗</span></button>
          <p class="pointer-note">클릭하면 마우스가 잠깁니다 · <kbd>ESC</kbd> 로 나가기</p>
          <div class="world-summary"><span>01 — EXPLORE YOUR WORLD</span><p>카운터 <i>·</i> 대장간 <i>·</i> 뒷마당 <i>·</i> 훈련장 <i>·</i> 광산 입구</p></div>
        </div>
        <div class="pause-layout" hidden>
          <div class="chapter">TAKE A BREATH</div><h2>잠시, 불씨를 지키며.</h2><p class="pause-note">월드는 당신을 기다립니다.</p>
          <button class="enter-button" type="button" data-action="resume"><span>탐방 계속하기</span><span aria-hidden="true">↗</span></button>
          <div class="settings"><label for="sensitivity">마우스 감도 <output id="sensitivity-value">1.0</output></label><input id="sensitivity" type="range" min="0.3" max="2" step="0.1" value="1" /><label class="check-label"><input id="head-bob" type="checkbox" checked /> 걷기 시 카메라 움직임</label></div>
          <button class="text-button" type="button" data-action="reset">시작 위치로 돌아가기 <span>↺</span></button>
        </div>
        <div class="control-error" role="alert" hidden></div>
        <footer class="menu-footer"><span>AN OPEN DOOR. AN UNWRITTEN STORY.</span><span>PC · 키보드 & 마우스</span></footer>
      </section>
      <section class="hud" aria-label="게임 안내" hidden>
        <div class="compass"><span>W</span><i></i><strong id="bearing">N</strong><i></i><span>E</span></div>
        <div class="crosshair" aria-hidden="true"><i></i></div>
        <div class="fixture-tooltip" hidden><span class="fixture-eyebrow">WORKSHOP OBJECT</span><h3></h3><p></p><small></small></div>
        <div class="location"><div class="location-eyebrow"><i></i><span id="zone-english">THE FORGE</span></div><h2 id="zone-name">대장간</h2><p id="zone-description">작은 불씨에서, 장인의 이야기로</p><div class="visited"><span id="visited-count">1</span> / 5 <small>구역 둘러보기</small></div></div>
        <div class="map-widget"><div class="map-title"><span>THE GROUNDS</span><span><kbd>G</kbd> 지도</span></div><div class="map-content" hidden>
          <svg class="world-map" viewBox="-16 -47 50 72" role="img" aria-label="카운터, 대장간, 뒷마당, 훈련장, 광산 입구 연결 지도">
            <path class="map-path" d="M0 17V-36 M0-13.5H22"/>
            <rect data-zone="yard" class="map-zone map-yard" x="-14" y="-26" width="26" height="22" rx="1"/>
            <rect data-zone="counter" class="map-zone" x="-9" y="12" width="18" height="8"/>
            <rect data-zone="forge" class="map-zone" x="-9" y="-4" width="18" height="16"/>
            <rect data-zone="training" class="map-zone" x="12" y="-24" width="17" height="19"/>
            <rect data-zone="mine" class="map-zone" x="-3" y="-42" width="6" height="12"/>
            <text x="0" y="17">카운터</text><text x="0" y="6">대장간</text><text x="-6" y="-18">뒷마당</text><text x="21" y="-15">훈련장</text><text x="8" y="-35">광산</text>
            <g id="map-player"><circle r="1.3"/><path d="M0-3.4 1.4-1.2 -1.4-1.2Z"/></g>
          </svg><p>북쪽 ↑ · 점은 현재 위치</p>
        </div></div>
        <div class="controls-bar"><span><kbd>W</kbd><span class="wasd"><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span> 이동</span><span><kbd>SHIFT</kbd> 달리기</span><span><kbd>SPACE</kbd> 점프</span><span><kbd>ESC</kbd> 일시정지</span></div>
      </section>`;
    container.append(this.element);
    this.overlay = this.get('.menu-overlay');
    this.hud = this.get('.hud');
    this.target = this.get('.fixture-tooltip');
    this.playerMarker = this.element.querySelector<SVGElement>('#map-player')!;
    const map = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    map.classList.add('underground-map');
    map.setAttribute('aria-label', '주변 지하 통로 지도');
    map.style.display = 'none';
    map.innerHTML =
      [...MINE_LAYOUT.values()]
        .map((cell) => {
          const p = cellPosition(cell);
          return `<rect class="tunnel-cell ${cell.chamber ? 'chamber-cell' : ''}" x="${p.x - 5}" y="${p.z - 5}" width="10" height="10"/>`;
        })
        .join('') +
      '<g class="mine-you"><circle class="you" r="2"/><path class="you" d="M0-5 2-2 -2-2Z"/></g>';
    this.get('.map-content').prepend(map);
    const options = { signal: this.abort.signal };
    this.element
      .querySelectorAll<HTMLButtonElement>('[data-action="enter"], [data-action="resume"]')
      .forEach((button) =>
        button.addEventListener(
          'click',
          () => {
            this.get('.control-error').hidden = true;
            actions.enter();
          },
          options,
        ),
      );
    this.get('[data-action="reset"]').addEventListener(
      'click',
      () => {
        actions.reset();
        actions.enter();
      },
      options,
    );
    this.get('#sensitivity').addEventListener(
      'input',
      (event) => {
        const value = Number((event.target as HTMLInputElement).value);
        this.get('#sensitivity-value').textContent = value.toFixed(1);
        actions.sensitivity(value);
      },
      options,
    );
    this.get('#head-bob').addEventListener(
      'change',
      (event) => {
        actions.headBob((event.target as HTMLInputElement).checked);
      },
      options,
    );
    this.unsubscribers.push(
      events.on('stateChanged', (state) => this.setState(state)),
      events.on('zoneChanged', (zone) => this.setZone(zone)),
      events.on('targetChanged', (fixture) => this.setTarget(fixture)),
      events.on('controlError', (message) => {
        const error = this.get('.control-error');
        error.hidden = false;
        error.textContent = message;
      }),
    );
  }

  private get(selector: string): HTMLElement {
    return this.element.querySelector<HTMLElement>(selector)!;
  }

  private setState(state: GameState): void {
    this.state = state;
    this.overlay.hidden =
      state === 'playing' || state === 'inventory' || state === 'smelting' || state === 'crafting';
    this.hud.hidden = state !== 'playing';
    this.get('.title-layout').hidden = state !== 'ready';
    this.get('.pause-layout').hidden = state !== 'paused';
    this.element.dataset.state = state;
    if (state !== 'playing') {
      this.target.hidden = true;
      this.element
        .querySelector<HTMLButtonElement>(
          state === 'ready' ? '[data-action="enter"]' : '[data-action="resume"]',
        )
        ?.focus({ preventScroll: true });
    } else this.setTarget(this.currentTarget);
  }

  private setZone(zone: ZoneDefinition): void {
    this.visited.add(zone.id);
    this.get('#zone-name').textContent = zone.name;
    this.get('#zone-english').textContent = zone.english;
    this.get('#zone-description').textContent = zone.description;
    this.get('#visited-count').textContent = String(this.visited.size);
    this.element
      .querySelectorAll<SVGElement>('[data-zone]')
      .forEach((element) => element.classList.toggle('active', element.dataset.zone === zone.id));
  }

  private setTarget(fixture: FixtureDefinition | null): void {
    this.currentTarget = fixture;
    this.target.hidden = !fixture || this.state !== 'playing';
    if (!fixture) return;
    this.get('.fixture-tooltip h3').textContent = fixture.name;
    this.get('.fixture-tooltip p').textContent = fixture.description;
    this.get('.fixture-tooltip small').textContent = [
      'furnace',
      'anvil',
      'quench',
      'workbench',
      'rack',
    ].includes(fixture.kind)
      ? 'E · 설비 사용 / 제작·제련'
      : `설비 배치 완료 · 기능은 Phase ${fixture.phase}에서 연결됩니다`;
  }

  toggleMap(): void {
    this.mapVisible = !this.mapVisible;
    this.get('.map-content').hidden = !this.mapVisible;
  }

  update(position: Vec3, yaw: number): void {
    const underground = position.z < -42;
    this.get('.world-map').style.display = underground ? 'none' : 'block';
    const map = this.element.querySelector<SVGElement>('.underground-map')!;
    map.style.display = underground ? 'block' : 'none';
    map.setAttribute('viewBox', `${position.x - 40} ${position.z - 50} 80 100`);
    map
      .querySelector('.mine-you')!
      .setAttribute(
        'transform',
        `translate(${position.x} ${position.z}) rotate(${(-yaw * 180) / Math.PI})`,
      );
    this.get('.map-content p').textContent = underground
      ? '주변 통로 지도 · 북쪽 ↑'
      : '북쪽 ↑ · 점은 현재 위치';
    this.playerMarker.setAttribute(
      'transform',
      `translate(${position.x} ${Math.max(-39, position.z)}) rotate(${(-yaw * 180) / Math.PI})`,
    );
    const bearing = ((((-yaw * 180) / Math.PI) % 360) + 360) % 360;
    this.get('#bearing').textContent = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][
      Math.round(bearing / 45) % 8
    ]!;
  }

  dispose(): void {
    this.abort.abort();
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.element.remove();
  }
}

// Export the same source for future UI modules instead of duplicating zone names.
export const zoneLabels = ZONES.map(({ id, name }) => ({ id, name }));

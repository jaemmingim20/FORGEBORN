import * as THREE from 'three';
import { CraftingManager, METALS, WEAPONS, TIERS } from '../crafting/CraftingManager';
import type { WeaponKind } from '../crafting/CraftingManager';
import type { MaterialId } from '../items/data';
import { ITEMS } from '../items/data';
import { weaponModel } from '../crafting/WeaponModel';
import './crafting.css';
export class CraftingUI {
  readonly element = document.createElement('section');
  private station = 'workbench';
  private opened = false;
  private kind: WeaponKind = 'sword';
  private message = '';
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
  private renderer: THREE.WebGLRenderer | null = null;
  private model: THREE.Group | null = null;
  constructor(
    container: HTMLElement,
    readonly manager: CraftingManager,
    close: () => void,
  ) {
    this.element.className = 'crafting-panel';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-label', '무기 제작');
    container.append(this.element);
    this.camera.position.set(0, 0.2, 3.1);
    this.camera.lookAt(0, 0.1, 0);
    this.scene.add(new THREE.HemisphereLight('#e5f2ff', '#897658', 3));
    const light = new THREE.DirectionalLight('#fff0d3', 4);
    light.position.set(3, 4, 5);
    this.scene.add(light);
    this.element.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!b) return;
      const a = b.dataset.action;
      if (a === 'close') {
        close();
        return;
      }
      if (a === 'start') {
        const metals = Object.fromEntries(
          METALS.map((m) => [
            m,
            Number(this.element.querySelector<HTMLInputElement>(`[data-metal="${m}"]`)!.value),
          ]),
        ) as Record<MaterialId, number>;
        this.message = manager.start(this.kind, metals);
      }
      if (a === 'extract') manager.extract();
      if (a === 'strike') {
        const r = b.getBoundingClientRect(),
          m = e as MouseEvent;
        manager.strike(
          ((m.clientX - r.left) / r.width) * 100,
          ((m.clientY - r.top) / r.height) * 100,
        );
      }
      if (a === 'cool') manager.cool();
      if (a === 'finish') {
        this.message = manager.finish(
          [0, 1, 2].map((i) =>
            Number(this.element.querySelector<HTMLSelectElement>(`[data-part="${i}"]`)!.value),
          ),
        );
      }
      if (a === 'view') {
        manager.selected = manager.weapons.find((w) => w.id === Number(b.dataset.id)) ?? null;
      }
      this.render();
    });
    this.element.addEventListener('change', (e) => {
      const s = e.target as HTMLSelectElement;
      if (s.dataset.weapon !== undefined) {
        this.kind = s.value as WeaponKind;
        this.render();
      }
    });
  }
  open(station: string): void {
    this.station = station;
    this.opened = true;
    this.element.hidden = false;
    this.message = '';
    this.render();
    this.element.querySelector<HTMLButtonElement>('[data-action="close"]')?.focus();
  }
  hide(): void {
    this.opened = false;
    this.element.hidden = true;
  }
  private clearModel(): void {
    if (!this.model) return;
    const materials = new Set<THREE.Material>();
    this.model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
      }
    });
    materials.forEach((m) => m.dispose());
    this.scene.remove(this.model);
    this.model = null;
  }
  private render(): void {
    const m = this.manager,
      j = m.job;
    let body = '';
    const targetStation = j
      ? (
          {
            heating: 'furnace',
            forging: 'anvil',
            quenching: 'quench',
            assembly: 'workbench',
          } as const
        )[j.stage]
      : 'workbench';
    const stationName: Record<string, string> = {
      furnace: '용광로',
      anvil: '모루',
      quench: '담금질 수조',
      workbench: '조립 작업대',
      rack: '완성품 보관대',
    };
    if (this.station === 'rack') body = '<p>완성품을 선택해 외형과 제작 기록을 확인하세요.</p>';
    else if (j && targetStation !== this.station)
      body = `<p class="craft-direction">진행 중: ${WEAPONS[j.kind].name} · ${stationName[targetStation]}로 이동해 E를 누르세요.</p><p>창을 닫아도 투입한 재료와 작업 단계는 유지됩니다.</p>`;
    else if (!j && this.station === 'workbench')
      body = `<h3>금속 선택</h3><label>장비 <select data-weapon>${Object.entries(WEAPONS)
        .map(
          ([id, w]) =>
            `<option value="${id}" ${id === this.kind ? 'selected' : ''}>${w.name} · 금속 ${w.count}개</option>`,
        )
        .join(
          '',
        )}</select></label><div class="craft-metals">${METALS.map((id) => `<label>${ITEMS[id].name} · 보유 ${m.inventory.count(id)}<input data-metal="${id}" type="number" min="0" max="${WEAPONS[this.kind].count}" value="0"></label>`).join('')}</div><p>총 ${WEAPONS[this.kind].count}개를 선택하세요. 혼합 가능 · 시작 시 재료 차감</p><button data-action="start">제작 시작 → 용광로로</button>`;
    else if (!j) body = '<p>조립 작업대에서 금속과 장비를 선택해 제작을 시작하세요.</p>';
    else if (j.stage === 'heating')
      body =
        '<h3>가열 · 목표 온도에서 추출</h3><p>금색 구간 65–80%에서 추출하세요. 늦어도 재료는 보존됩니다.</p><div class="craft-meter"><i></i><b></b></div><p data-timer></p><button data-action="extract">금속 추출 → 모루로</button>';
    else if (j.stage === 'forging') {
      const t = m.target();
      body = `<h3>모루 가공 · ${j.strikes.length} / 6 타격</h3><p>빛나는 원의 중심을 클릭하세요. 정확도가 품질에 반영됩니다.</p><button class="craft-anvil" data-action="strike" aria-label="금속 가공판"><span style="left:${t.x}%;top:${t.y}%"></span></button>`;
    } else if (j.stage === 'quenching')
      body =
        '<h3>담금질 · 적절한 냉각 시간</h3><p>수조에서 1.8–2.8초에 꺼내면 높은 품질을 얻습니다.</p><div class="craft-meter quench"><i></i><b></b></div><p data-timer></p><button data-action="cool">물에서 꺼내기 → 작업대 조립</button>';
    else
      body = `<h3>부품 선택 · ${WEAPONS[j.kind].name}</h3>${WEAPONS[j.kind].parts.map((name, i) => `<label>${name}<select data-part="${i}">${TIERS.map((t, n) => `<option value="${n}">${t.name} · ${t.price}동화</option>`).join('')}</select></label>`).join('')}<p>선택한 부품은 완성 시 구매·소비됩니다. 기본형은 무료입니다.</p><button data-action="finish">구매 및 조립 완료</button>`;
    const w = m.selected;
    this.element.innerHTML = `<div class="craft-card"><header><div><small>FORGE YOUR LEGACY · PHASE 04</small><h2>${stationName[this.station] ?? '무기 제작'}</h2></div><button data-action="close">닫기 · Esc</button></header><p>보유 자금: 은화 ${Math.floor(m.coins / 100)} / 동화 ${m.coins % 100} · 완성품 ${m.weapons.length}/20</p><div class="craft-columns"><div>${body}<p role="status">${this.message}</p><h3>완성품 보관대</h3><div class="craft-collection">${m.weapons.map((v) => `<button data-action="view" data-id="${v.id}">#${v.id} ${WEAPONS[v.kind].name} · ${v.grade}</button>`).join('') || '아직 완성한 장비가 없습니다.'}</div></div><aside><div class="weapon-preview"></div>${
      w
        ? `<h3>#${w.id} ${WEAPONS[w.kind].name} · ${w.grade}</h3><p>품질 ${w.quality}/100 · ${w.kind === 'shield' ? '피해 감소' : '공격력'} ${w.power}${w.kind === 'shield' ? '%' : ''}<br>내구도 ${w.durability} · 기준 가치 ${w.value}동화</p><p>${METALS.filter(
            (id) => w.metals[id],
          )
            .map((id) => `${ITEMS[id].name} ${w.metals[id]}`)
            .join(
              ' + ',
            )}</p><p>${w.parts.map((p, i) => `${WEAPONS[w.kind].parts[i]}: ${TIERS[p]!.name}`).join(' / ')}</p>`
        : '<p>완성한 장비의 3D 외형과 성능이 여기에 표시됩니다.</p>'
    }</aside></div><footer>제작 기록은 현재 세션에 유지됩니다. 판매·전투는 다음 페이즈입니다.</footer></div>`;
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      this.renderer.setSize(300, 300);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    this.element.querySelector('.weapon-preview')!.append(this.renderer.domElement);
    this.clearModel();
    if (w) {
      this.model = weaponModel(w);
      this.scene.add(this.model);
    }
  }
  update(dt: number): void {
    if (!this.opened) return;
    const j = this.manager.job;
    if (
      j &&
      ((j.stage === 'heating' && this.station === 'furnace') ||
        (j.stage === 'quenching' && this.station === 'quench'))
    )
      this.manager.update(dt);
    const t = this.element.querySelector<HTMLElement>('[data-timer]');
    if (t && j) {
      t.textContent =
        j.stage === 'heating'
          ? `온도 ${Math.min(100, Math.round((j.elapsed / 8) * 100))}%`
          : `냉각 ${j.elapsed.toFixed(1)}초`;
      const b = this.element.querySelector<HTMLElement>('.craft-meter b');
      if (b)
        b.style.width = `${Math.min(100, (j.elapsed / (j.stage === 'heating' ? 8 : 4)) * 100)}%`;
    }
    if (this.model) this.model.rotation.y += dt * 0.4;
    this.renderer?.render(this.scene, this.camera);
  }
  dispose(): void {
    this.clearModel();
    this.renderer?.dispose();
    this.element.remove();
  }
}

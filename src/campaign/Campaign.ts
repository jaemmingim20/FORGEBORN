import * as THREE from 'three';
import type { GameManager } from '../core/GameManager';
import { Economy } from './Economy';
import { Combat } from './Combat';
import { WEAPONS } from '../crafting/CraftingManager';
import { RECIPES } from '../smelting/SmeltingManager';
import { ITEMS } from '../items/data';
import { ORES, mineDepth } from '../mining/data';
import { ModelFactory } from '../world/ModelFactory';
import './campaign.css';
const SAVE = 'forgeborn-save-v1';
export class Campaign {
  readonly economy: Economy;
  readonly combat: Combat;
  readonly panel = document.createElement('section');
  readonly hud = document.createElement('div');
  private view = '';
  private message = '';
  private timer = 0;
  private hudClock = 0;
  private panelClock = 0;
  private npc = new THREE.Group();
  private furnaces = new Map<string, THREE.Group>();
  private lastCoins = 200;
  private lastCrafted = 0;
  private lastOre = 0;
  private abort = new AbortController();
  constructor(readonly game: GameManager) {
    this.economy = new Economy(game.crafting, game.smelting);
    this.combat = new Combat(game, (s) => this.notice(s));
    this.panel.className = 'campaign-panel';
    this.panel.hidden = true;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', '대장간 운영');
    this.hud.className = 'campaign-hud';
    game.scene.container.append(this.hud, this.panel);
    this.panel.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-cmd]');
      if (!b) return;
      const id = Number(b.dataset.id),
        cmd = b.dataset.cmd;
      this.message = '';
      if (cmd === 'close') {
        game.resumeGame();
        return;
      }
      if (cmd === 'offer') this.message = this.economy.submit(id);
      if (cmd === 'accept') {
        this.message = this.economy.accept();
        this.cleanGear();
        this.economy.arrive();
      }
      if (cmd === 'reject') {
        this.economy.reject();
        this.economy.arrive();
      }
      if (cmd === 'sell-confirm') {
        this.message = this.economy.sell(id);
        this.cleanGear();
      }
      if (cmd === 'sell') {
        this.view = `confirm:${id}`;
      }
      if (cmd === 'dismantle') {
        this.message = this.economy.dismantle(id);
        this.cleanGear();
      }
      if (cmd === 'equip') this.combat.equip(id);
      if (cmd === 'sleep') {
        this.sleep();
        this.view = 'summary';
      }
      if (cmd === 'upgrade') this.message = this.economy.upgrade(b.dataset.furnace!);
      if (cmd === 'expand') {
        this.message = this.economy.expand();
        this.addFurnaces();
      }
      if (cmd === 'smelt') {
        if (!game.smelting.start(b.dataset.furnace!, b.dataset.recipe!))
          this.message = '재료나 빈 슬롯이 부족합니다.';
      }
      if (cmd === 'save') this.save();
      if (cmd === 'load') {
        this.load();
        this.message = '저장된 상태를 불러왔습니다.';
      }
      if (cmd === 'market') this.view = 'market';
      if (cmd === 'trade') this.view = 'counter';
      if (cmd === 'gear') this.view = 'gear';
      if (cmd === 'forge') this.view = 'furnaces';
      this.save();
      this.render();
    });
    const opts = { signal: this.abort.signal };
    window.addEventListener('pagehide', () => this.save(), opts);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.save();
      },
      opts,
    );
    document.addEventListener(
      'contextmenu',
      (e) => {
        if (game.input.locked) e.preventDefault();
      },
      opts,
    );
    document.addEventListener(
      'mousedown',
      (e) => {
        if (e.button === 2 && game.input.locked) this.combat.blocking = true;
      },
      opts,
    );
    document.addEventListener(
      'mouseup',
      (e) => {
        if (e.button === 2) this.combat.blocking = false;
      },
      opts,
    );
    this.load();
    this.economy.arrive();
    this.lastCoins = game.crafting.coins;
    this.lastCrafted = game.crafting.weapons.length;
    this.lastOre = this.oreCount();
    this.createNPC();
    this.addFurnaces();
  }
  notice(s: string): void {
    this.message = s;
    this.game.events.emit('miningFeedback', s);
  }
  private cleanGear(): void {
    if (!this.combat.gear(this.combat.main)) this.combat.main = null;
    if (!this.combat.gear(this.combat.pick)) this.combat.pick = null;
    if (!this.combat.gear(this.combat.shield)) this.combat.shield = null;
  }
  open(view: string): void {
    this.view = view;
    this.message = '';
    if (view === 'counter') this.economy.arrive();
    this.game.openCampaign();
    this.panel.hidden = false;
    this.render();
    this.save();
  }
  hide(): void {
    this.panel.hidden = true;
    this.view = '';
  }
  private money(n: number): string {
    return `${Math.floor(n / 10000)}금 ${Math.floor(n / 100) % 100}은 ${n % 100}동`;
  }
  private oreCount(): number {
    return this.game.inventory
      .snapshot()
      .slots.filter((s) => s.item in ORES)
      .reduce((a, b) => a + b.quantity, 0);
  }
  private render(): void {
    const g = this.game,
      e = this.economy,
      w = g.crafting.weapons;
    let html = '';
    const button = (cmd: string, label: string, attrs = '') =>
      `<button data-cmd="${cmd}" ${attrs}>${label}</button>`;
    if (this.view === 'counter') {
      const c = e.customer;
      html = c
        ? `<h3>${c.special ? '특수 손님 · 떠돌이 수집가' : '마을 손님'}</h3><p>주문: ${WEAPONS[c.kind].name} · 오늘 처리 ${e.handled}/5</p>${
            c.price !== null
              ? `<p>제안 ${this.money(c.price)}</p>${button('accept', '거래 수락')} ${button('reject', '거래 거절')}`
              : `<p>맞는 장비를 제작한 후 제출하세요. 손님은 기다립니다.</p>${w
                  .filter((v) => v.kind === c.kind)
                  .map((v) =>
                    button(
                      'offer',
                      `#${v.id} ${v.grade} ${WEAPONS[v.kind].name} 제출`,
                      `data-id="${v.id}"`,
                    ),
                  )
                  .join('')}${button('reject', '주문 거절')}`
          }`
        : '<p>오늘 손님 5명을 모두 응대했습니다. 침대에서 다음 날을 시작하세요.</p>';
    } else if (this.view.startsWith('confirm:')) {
      const id = Number(this.view.split(':')[1]),
        v = w.find((v) => v.id === id);
      html = v
        ? `<p>#${id} ${WEAPONS[v.kind].name}을 ${this.money(Math.floor(v.value * 0.9))}에 시장 판매할까요?</p>${button('sell-confirm', '판매 확정', `data-id="${id}"`)} ${button('market', '돌아가기')}`
        : '<p>판매가 처리되었습니다.</p>' + button('market', '시장 목록');
    } else if (['market', 'workbench', 'gear'].includes(this.view))
      html = `<p>주 무기 1 · 채굴 3 · 방패 우클릭. 완성품 분해는 작업대에서 가능합니다.</p>${w.map((v) => `<article><b>#${v.id} ${WEAPONS[v.kind].name} · ${v.grade}</b><p>성능 ${v.power} · 내구도 ${v.durability} · 가치 ${v.value}동화</p>${this.view === 'market' ? button('sell', `90% 판매 · ${Math.floor(v.value * 0.9)}동화`, `data-id="${v.id}"`) : button('equip', '장착', `data-id="${v.id}"`)} ${this.view === 'workbench' ? button('dismantle', '분해 · 금속별 70% 회수', `data-id="${v.id}"`) : ''}</article>`).join('') || '<p>완성 장비가 없습니다.</p>'}`;
    else if (this.view === 'furnaces')
      html = `${[...g.smelting.furnaces.values()]
        .map(
          (f) =>
            `<article><h3>${f.id} · Lv.${f.level}</h3><p>제련 ${g.smelting.settings(f).seconds}초 / ${g.smelting.settings(f).slots}슬롯</p>${button('upgrade', f.level < 5 ? `강화 ${[0, 800, 2000, 4500, 10000][f.level]}동화` : '최고 레벨', `data-furnace="${f.id}"`)}${RECIPES.map((r) => button('smelt', r.name, `data-furnace="${f.id}" data-recipe="${r.id}"`)).join('')}<p>${
              f.jobs
                .filter((j) => j.state !== 'complete')
                .map(
                  (j) =>
                    `${j.recipeId}: ${j.state === 'waiting-space' ? '인벤토리 공간 대기' : j.remaining.toFixed(1) + '초'}`,
                )
                .join(' / ') || '빈 슬롯'
            }</p></article>`,
        )
        .join(
          '',
        )}${button('expand', '용광로 증설 · 다음 비용 ' + ([0, 1500, 4000, 9000][g.smelting.furnaces.size] ?? '최대') + '동화')}`;
    else if (this.view === 'bed')
      html =
        '<p>잠을 자면 일일 정산 후 새 날을 시작합니다. 손님 제한과 몬스터 상태를 갱신하고 고갈 광맥 일부가 재생됩니다.</p>' +
        button('sleep', '잠자기 · 다음 날');
    else if (this.view === 'summary') {
      const s = e.history[e.history.length - 1];
      html = s
        ? `<h3>${s.day}일 정산</h3><p>판매 ${s.sales}개 · 거래 ${s.trade}동화 · 시장 ${s.market}동화<br>부품 ${s.parts} · 설비 ${s.upgrades}동화<br>순현금 ${s.net}동화 · 제작 ${s.crafted}개 · 채굴 ${s.mined}개 · 최심부 ${Math.floor(s.depth)}m</p>`
        : '<p>아직 정산 기록이 없습니다.</p>';
    } else
      html = `<h3>진행 기록</h3><p>날짜 ${e.day} · 처치 ${this.combat.kills} · 최심부 ${Math.floor(e.stats.depth)}m</p><p>자동 저장 5초 · 마지막 저장 <span data-save-status>현재 브라우저</span></p>${button('save', '지금 저장')} ${button('load', '마지막 저장 불러오기')}<p>저장은 이 브라우저와 주소별로 보관됩니다. Go Live 포트가 달라지면 다른 저장소로 취급됩니다.</p><h3>조작</h3><p>1 주 무기 / 2 방패 해제 / 3 곡괭이 / 좌클릭 공격·채굴 / 우클릭 정면 방어<br>M 시장 / J 기록·저장 / E 설비 / Tab 인벤토리<br>주문은 카운터 E, 분해는 작업대의 관리 버튼, 설비 강화는 용광로 관리 버튼을 이용하세요.</p>`;
    this.panel.innerHTML = `<div class="campaign-card"><header><h2>${({ counter: '손님 주문', market: '시장', gear: '장비 장착', workbench: '장비 관리·분해', bed: '하루 마무리', summary: '일일 정산', furnaces: '용광로 관리' } as Record<string, string>)[this.view] ?? '운영 기록'}</h2>${button('close', '닫기 · Esc')}</header><p>${e.day}일 · ${this.money(g.crafting.coins)} · 손님 ${e.handled}/5</p><nav>${button('trade', '손님')} ${button('market', '시장')} ${button('gear', '장비')} ${button('forge', '설비')}</nav>${html}<p role="status">${this.message}</p></div>`;
  }
  private createNPC(): void {
    const g = this.npc,
      body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.35, 0.9, 10),
        new THREE.MeshStandardMaterial({ color: '#617463' }),
      );
    body.position.y = 0.85;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 8),
      new THREE.MeshStandardMaterial({ color: '#bd9770' }),
    );
    head.position.y = 1.5;
    g.add(body, head);
    for (const x of [-0.15, 0.15]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.55, 0.18),
        new THREE.MeshStandardMaterial({ color: '#473e30' }),
      );
      leg.position.set(x, 0.28, 0);
      g.add(leg);
    }
    g.position.set(0, 0, 17.5);
    this.game.scene.scene.add(g);
  }
  private addFurnaces(): void {
    let i = 0;
    for (const f of this.game.smelting.furnaces.values()) {
      if (i++ === 0 || this.furnaces.has(f.id)) continue;
      const model = new ModelFactory(this.game.world.materials).create('furnace');
      const x = -6.3 + (i - 1) * 3.4,
        z = 8;
      model.group.position.set(x, 0, z);
      this.game.world.root.add(model.group);
      this.furnaces.set(f.id, model.group);
      this.game.scene.renderer.shadowMap.needsUpdate = true;
      for (const c of model.colliders)
        this.game.addFixtureCollider(
          f.id,
          { x: x + c.center.x, y: c.center.y, z: z + c.center.z },
          c.size,
        );
      this.game.world.fixtures.set(f.id, {
        id: f.id,
        kind: 'furnace',
        zone: 'forge',
        name: '증설 용광로',
        description: 'E로 용광로 관리',
        phase: 8,
        position: { x, y: 0, z },
      });
    }
  }
  private sleep(): void {
    this.track();
    this.economy.sleep();
    this.economy.arrive();
    this.combat.clearEnemies();
    this.combat.hp = 100;
    this.combat.stamina = 100;
    let regenerated = 0;
    for (const v of this.game.mining.veins.values())
      if (
        v.depleted &&
        (this.economy.day + v.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0)) % 3 === 0
      ) {
        v.depleted = false;
        v.remaining = ORES[v.ore].hits;
        regenerated++;
      }
    this.game.miningView.syncVeins();
    this.notice(`새로운 하루 · 광맥 ${regenerated}곳 재생`);
    this.lastOre = this.oreCount();
    this.game.player.reset();
  }
  private track(): void {
    const g = this.game,
      coins = g.crafting.coins,
      count = g.crafting.weapons.length,
      ore = this.oreCount();
    this.lastCoins = coins;
    this.lastCrafted = count;
    this.lastOre = ore;
    this.economy.stats.depth = Math.max(this.economy.stats.depth, mineDepth(g.motor.position));
  }
  update(dt: number, playing: boolean): void {
    this.combat.update(dt, playing);
    this.panelClock += dt;
    if (this.panelClock > 1) {
      this.panelClock = 0;
      if (this.view === 'furnaces') this.render();
    }
    if (playing) this.track();
    this.timer += dt;
    this.hudClock += dt;
    if (this.timer >= 5) {
      this.timer = 0;
      this.save();
    }
    this.npc.visible = !!this.economy.customer;
    const b = this.npc.children[0] as THREE.Mesh;
    if (b)
      (b.material as THREE.MeshStandardMaterial).color.set(
        this.economy.customer?.special ? '#8b497f' : '#617463',
      );
    if (this.hudClock > 0.2) {
      this.hudClock = 0;
      const w = this.combat.gear(this.combat.slot === 1 ? this.combat.main : this.combat.pick);
      this.hud.hidden = !playing;
      this.hud.innerHTML = `<span>♥ ${Math.ceil(this.combat.hp)} / 100 · 기력 ${Math.floor(this.combat.stamina)}</span><span>${this.economy.day}일 · ${this.money(this.game.crafting.coins)} · 손님 ${this.economy.handled}/5</span><small>${this.combat.slot === 1 ? '1 주 무기' : '3 채굴'} · ${w ? WEAPONS[w.kind].name + ' 내구 ' + w.durability : '낡은 곡괭이 / 장비 미선택'} · M 시장 · J 기록</small>`;
    }
  }
  save(): void {
    try {
      this.track();
      const g = this.game,
        data = {
          version: 1,
          coins: g.crafting.coins,
          weapons: g.crafting.weapons,
          job: g.crafting.job,
          inventory: g.inventory.snapshot(),
          veins: [...g.mining.veins.values()].map((v) => ({
            id: v.id,
            remaining: v.remaining,
            depleted: v.depleted,
          })),
          furnaces: [...g.smelting.furnaces.values()],
          economy: {
            day: this.economy.day,
            handled: this.economy.handled,
            customer: this.economy.customer,
            stats: this.economy.stats,
            history: this.economy.history,
          },
          combat: this.combat.snapshot(),
          position: g.motor.position,
          yaw: g.player.yaw,
          pitch: g.player.pitch,
        };
      const old = localStorage.getItem(SAVE);
      if (old) localStorage.setItem(SAVE + '-backup', old);
      localStorage.setItem(SAVE, JSON.stringify(data));
    } catch {
      this.notice('저장 공간을 사용할 수 없습니다. 브라우저 저장 설정을 확인하세요.');
    }
  }
  load(): void {
    try {
      const raw = localStorage.getItem(SAVE);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (
        d.version !== 1 ||
        !Array.isArray(d.weapons) ||
        !Array.isArray(d.inventory?.slots) ||
        !Array.isArray(d.furnaces) ||
        !Number.isFinite(d.coins) ||
        !d.economy
      )
        return;
      const g = this.game;
      g.inventory.restore(d.inventory);
      g.crafting.restore(d.weapons, d.job, d.coins);
      g.smelting.restore(d.furnaces);
      for (const state of d.veins ?? []) {
        const v = g.mining.veins.get(state.id);
        if (v && Number.isInteger(state.remaining)) {
          v.remaining = Math.max(0, state.remaining);
          v.depleted = !!state.depleted;
        }
      }
      g.miningView.syncVeins();
      Object.assign(this.economy, {
        day: Math.max(1, d.economy.day),
        handled: Math.min(5, Math.max(0, d.economy.handled)),
        customer: d.economy.customer,
        stats: d.economy.stats,
        history: d.economy.history ?? [],
      });
      this.combat.restore(d.combat);
      if (d.position && [d.position.x, d.position.y, d.position.z].every(Number.isFinite))
        g.player.reset(d.position);
      g.player.yaw = Number.isFinite(d.yaw) ? d.yaw : 0;
      g.player.pitch = Number.isFinite(d.pitch) ? d.pitch : 0;
      this.addFurnaces();
      this.lastCoins = g.crafting.coins;
      this.lastCrafted = g.crafting.weapons.length;
      this.lastOre = this.oreCount();
      g.inventory.notify();
    } catch {
      this.notice('저장 데이터를 읽지 못했습니다. 기존 저장은 유지됩니다.');
    }
  }
  dispose(): void {
    this.save();
    this.abort.abort();
    this.combat.dispose();
    this.npc.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.npc.removeFromParent();
    this.panel.remove();
    this.hud.remove();
  }
}

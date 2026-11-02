import * as THREE from 'three';
import type { GameManager } from '../core/GameManager';
import type { CraftedWeapon } from '../crafting/CraftingManager';
import { weaponModel } from '../crafting/WeaponModel';
import { MINE_LAYOUT, cellKey, cellPosition, cellAt, DIRECTIONS } from '../world/mineLayout';
import { mineDepth } from '../mining/data';
export const ENEMIES = [
  { name: '동굴 쥐', hp: 30, damage: 6, speed: 3, color: '#797461', depth: 150 },
  { name: '동굴 고블린', hp: 65, damage: 12, speed: 2.2, color: '#62724a', depth: 250 },
  { name: '심연의 골렘', hp: 180, damage: 25, speed: 1.1, color: '#657078', depth: 375 },
] as const;
type Enemy = {
  mesh: THREE.Group;
  home: THREE.Vector3;
  hp: number;
  type: number;
  state: 'Idle' | 'Patrol' | 'Chase' | 'Attack' | 'Return' | 'Defeated';
  clock: number;
  attack: number;
  path: string[];
  routeTimer: number;
};
export class Combat {
  hp = 100;
  stamina = 100;
  main: number | null = null;
  shield: number | null = null;
  pick: number | null = null;
  slot: 1 | 3 = 3;
  blocking = false;
  kills = 0;
  private enemies: Enemy[] = [];
  private spawnClock = 0;
  private spawned = new Set<string>();
  private weapon: THREE.Group | null = null;
  private shieldModel: THREE.Group | null = null;
  private shown = '';
  private swing = -1;
  private cooldown = 0;
  private impacted = false;
  private audio: AudioContext | null = null;
  readonly particles = new THREE.Group();
  private particleLife = 0;
  constructor(
    private game: GameManager,
    private notice: (s: string) => void,
  ) {
    game.scene.scene.add(this.particles);
    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.035),
        new THREE.MeshBasicMaterial({ color: '#f1c478' }),
      );
      this.particles.add(p);
    }
    this.particles.visible = false;
  }
  gear(id: number | null): CraftedWeapon | undefined {
    return this.game.crafting.weapons.find((w) => w.id === id && w.durability > 0);
  }
  equip(id: number): void {
    const w = this.gear(id);
    if (!w) {
      this.notice('내구도가 없는 장비입니다.');
      return;
    }
    if (w.kind === 'shield') this.shield = id;
    else if (w.kind === 'pickaxe') this.pick = id;
    else this.main = id;
    this.refreshModels();
  }
  private disposeModel(g: THREE.Group | null): void {
    if (!g) return;
    const mats = new Set<THREE.Material>();
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m));
      }
    });
    mats.forEach((m) => m.dispose());
    g.removeFromParent();
  }
  private refreshModels(): void {
    const w = this.gear(this.slot === 1 ? this.main : this.pick),
      s = this.gear(this.shield),
      key = `${w?.id}:${s?.id}:${this.slot}`;
    if (key === this.shown) return;
    this.shown = key;
    this.disposeModel(this.weapon);
    this.disposeModel(this.shieldModel);
    this.weapon = w ? weaponModel(w) : null;
    this.shieldModel = s ? weaponModel(s) : null;
    if (this.weapon) {
      this.weapon.scale.setScalar(0.48);
      this.weapon.position.set(0.38, -0.42, -0.68);
      this.game.scene.camera.add(this.weapon);
    }
    if (this.shieldModel) {
      this.shieldModel.scale.setScalar(0.44);
      this.shieldModel.position.set(-0.4, -0.35, -0.6);
      this.game.scene.camera.add(this.shieldModel);
    }
  }
  sound(frequency = 180): void {
    try {
      this.audio ??= new AudioContext();
      void this.audio.resume();
      const osc = this.audio.createOscillator(),
        gain = this.audio.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, this.audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.audio.currentTime + 0.13);
      gain.gain.setValueAtTime(0.045, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.15);
      osc.connect(gain).connect(this.audio.destination);
      osc.start();
      osc.stop(this.audio.currentTime + 0.16);
    } catch {
      /* Audio remains optional. */
    }
  }
  attack(): void {
    if (this.cooldown > 0 || this.stamina < 12) return;
    const w = this.gear(this.slot === 1 ? this.main : this.pick);
    if (this.slot === 3 && this.game.miningView.targetId) {
      if (w && w.kind === 'pickaxe') {
        this.game.mining.toolTier =
          w.metals['mithril-ingot'] > 0 || w.metals['steel-ingot'] > 0 ? 2 : 1;
      } else this.game.mining.toolTier = 0;
      this.game.mineSwing();
      return;
    }
    if (!w && this.slot === 1) {
      this.notice('인벤토리에서 주 무기를 장착하세요.');
      return;
    }
    this.stamina -= 12;
    this.cooldown = w?.kind === 'hammer' ? 1.2 : w?.kind === 'axe' ? 0.85 : 0.55;
    this.swing = 0;
    this.impacted = false;
  }
  private hit(): void {
    const g = this.game,
      w = this.gear(this.slot === 1 ? this.main : this.pick),
      origin = g.scene.camera.position,
      dir = new THREE.Vector3();
    g.scene.camera.getWorldDirection(dir);
    let closest: Enemy | null = null;
    let distance = 3.3;
    for (const e of this.enemies) {
      const delta = e.mesh.position
          .clone()
          .add(new THREE.Vector3(0, 0.7, 0))
          .sub(origin),
        len = delta.length();
      if (len < distance && delta.normalize().dot(dir) > 0.8) {
        const ray = g.physicsRay(origin, delta, len);
        if (!ray) {
          closest = e;
          distance = len;
        }
      }
    }
    let point: THREE.Vector3 | null = null;
    if (closest) {
      const damage = w?.power ?? 7;
      closest.hp -= damage;
      this.notice(`${ENEMIES[closest.type]!.name} −${damage} · 체력 ${Math.max(0, closest.hp)}`);
      point = closest.mesh.position.clone().add(new THREE.Vector3(0, 0.7, 0));
      if (closest.hp <= 0) {
        closest.state = 'Defeated';
        closest.mesh.visible = false;
        this.kills++;
        g.crafting.coins += 2 + closest.type * 3;
        if (Math.random() < 0.12) g.inventory.add(closest.type > 1 ? 'silver' : 'iron', 1);
      }
    } else if (g.world.target?.kind === 'dummy' || g.world.target?.kind === 'shield') {
      this.notice(`훈련 타격 −${w?.power ?? 7} · ${w?.kind ?? '낡은 곡괭이'}`);
      point = origin.clone().addScaledVector(dir, 2);
    }
    if (point) {
      if (w) w.durability = Math.max(0, w.durability - 1);
      this.particles.position.copy(point);
      this.particles.visible = true;
      this.particleLife = 0.35;
      this.sound(230);
    } else this.sound(100);
  }
  private route(from: THREE.Vector3, to: THREE.Vector3): string[] {
    const a = cellAt(from),
      b = cellAt(to);
    if (!a || !b) return [];
    const start = cellKey(a.x, a.row),
      end = cellKey(b.x, b.row),
      prev = new Map<string, string | null>([[start, null]]),
      queue = [start];
    for (let i = 0; i < queue.length; i++) {
      const k = queue[i]!;
      if (k === end) break;
      const c = MINE_LAYOUT.get(k)!;
      for (const d of DIRECTIONS) {
        const n = cellKey(c.x + d.x, c.row + d.row);
        if (MINE_LAYOUT.has(n) && !prev.has(n)) {
          prev.set(n, k);
          queue.push(n);
        }
      }
    }
    if (!prev.has(end)) return [];
    const path = [];
    let k: string | null = end;
    while (k && k !== start) {
      path.unshift(k);
      k = prev.get(k) ?? null;
    }
    if (start !== end) path.unshift(start);
    return path;
  }
  private spawn(): void {
    const g = this.game,
      pos = new THREE.Vector3().copy(g.motor.position),
      depth = mineDepth(pos);
    if (depth < 150 || this.enemies.filter((e) => e.state !== 'Defeated').length >= 5) return;
    const dir = new THREE.Vector3();
    g.scene.camera.getWorldDirection(dir);
    for (const c of MINE_LAYOUT.values()) {
      if (c.distance < 150) continue;
      const p = new THREE.Vector3().copy(cellPosition(c));
      const dist = p.distanceTo(pos),
        key = cellKey(c.x, c.row);
      if (
        dist < 18 ||
        dist > 38 ||
        this.spawned.has(key) ||
        p.clone().sub(pos).normalize().dot(dir) > 0.1
      )
        continue;
      const type = c.distance >= 375 ? 2 : c.distance >= 250 ? 1 : 0,
        def = ENEMIES[type]!;
      const mesh = this.monster(type);
      mesh.position.copy(p);
      g.scene.scene.add(mesh);
      this.spawned.add(key);
      this.enemies.push({
        mesh,
        home: p.clone(),
        hp: def.hp,
        type,
        state: 'Idle',
        clock: 0,
        attack: 1,
        path: [],
        routeTimer: 0,
      });
      break;
    }
  }
  private monster(type: number): THREE.Group {
    const root = new THREE.Group(),
      mat = new THREE.MeshStandardMaterial({ color: ENEMIES[type]!.color, roughness: 0.9 }),
      eye = new THREE.MeshBasicMaterial({ color: '#e8a44d' });
    const add = (
      geo: THREE.BufferGeometry,
      x: number,
      y: number,
      z: number,
      m: THREE.Material = mat,
    ) => {
      const o = new THREE.Mesh(geo, m);
      o.position.set(x, y, z);
      root.add(o);
    };
    const size = type === 0 ? 0.38 : type === 1 ? 0.55 : 0.85;
    add(new THREE.IcosahedronGeometry(size, 1), 0, size, 0);
    add(new THREE.SphereGeometry(size * 0.55, 10, 7), 0, size * 1.6, -size * 0.45);
    for (const x of [-1, 1]) {
      add(new THREE.SphereGeometry(0.045, 6, 4), x * size * 0.22, size * 1.7, -size * 0.88, eye);
      add(
        new THREE.BoxGeometry(size * 0.3, size * 0.7, size * 0.4),
        x * size * 0.55,
        size * 0.3,
        0,
      );
      if (type > 0)
        add(new THREE.BoxGeometry(size * 0.3, size * 0.8, size * 0.3), x * size * 0.9, size, 0);
    }
    return root;
  }
  update(dt: number, active: boolean): void {
    this.refreshModels();
    const g = this.game;
    const pick = this.gear(this.pick);
    g.mining.toolTier = pick
      ? pick.metals['steel-ingot'] > 0 || pick.metals['mithril-ingot'] > 0
        ? 2
        : 1
      : 0;
    g.miningView.pickaxe.visible =
      active && this.slot === 3 && !this.gear(this.pick) && g.inventory.equipped;
    if (this.weapon) this.weapon.visible = active;
    if (this.shieldModel) {
      this.shieldModel.visible = active;
      this.shieldModel.position.z = this.blocking ? -0.45 : -0.65;
    }
    if (!active) {
      this.blocking = false;
      return;
    }
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.swing >= 0) {
      this.swing += dt;
      if (this.weapon) this.weapon.rotation.x = -Math.sin(Math.min(1, this.swing / 0.5) * Math.PI);
      if (this.swing >= 0.22 && !this.impacted) {
        this.impacted = true;
        this.hit();
      }
      if (this.swing > 0.55) this.swing = -1;
    }
    const moving = g.motor.moving && g.input.sprint && this.stamina > 0;
    g.motor.canSprint = this.stamina > 0;
    this.stamina = THREE.MathUtils.clamp(
      this.stamina + dt * (moving ? -18 : this.blocking ? -7 : 12),
      0,
      100,
    );
    if (mineDepth(g.motor.position) < 150) this.hp = Math.min(100, this.hp + dt * 3);
    if (this.particleLife > 0) {
      this.particleLife -= dt;
      this.particles.children.forEach((p, i) =>
        p.position.set(
          Math.sin(i * 2) * (0.35 - this.particleLife) * 3,
          (0.35 - this.particleLife) * ((i % 3) + 1),
          Math.cos(i * 2) * (0.35 - this.particleLife) * 3,
        ),
      );
      this.particles.visible = this.particleLife > 0;
    }
    this.spawnClock += dt;
    if (this.spawnClock > Math.max(2, 9 - mineDepth(g.motor.position) / 100)) {
      this.spawnClock = 0;
      this.spawn();
    }
    const player = new THREE.Vector3().copy(g.motor.position);
    for (const e of this.enemies) {
      if (e.state === 'Defeated') continue;
      const distance = e.mesh.position.distanceTo(player);
      e.mesh.visible = distance < 55;
      if (distance > 60) continue;
      e.clock += dt;
      e.attack -= dt;
      e.routeTimer -= dt;
      const safe = mineDepth(player) < 150;
      if (distance < 1.8 && !safe) {
        e.state = 'Attack';
        if (e.attack <= 0) {
          e.attack = e.type === 2 ? 2.2 : 1.2;
          let damage = ENEMIES[e.type]!.damage;
          const s = this.gear(this.shield),
            dir = new THREE.Vector3();
          g.scene.camera.getWorldDirection(dir);
          if (
            this.blocking &&
            s &&
            this.stamina >= 8 &&
            e.mesh.position.clone().sub(player).normalize().dot(dir) > 0.3
          ) {
            this.stamina -= 8;
            damage *= 1 - Math.min(0.85, s.power / 100);
            s.durability = Math.max(0, s.durability - 1);
          }
          this.hp -= damage;
          this.sound(65);
          this.notice(`피해 −${Math.round(damage)}`);
          if (this.hp <= 0) {
            this.death();
            return;
          }
        }
        continue;
      }
      const chase = distance < 22 && !safe && e.home.distanceTo(player) < 42;
      e.state = chase
        ? 'Chase'
        : e.mesh.position.distanceTo(e.home) > 1
          ? 'Return'
          : Math.floor(e.clock / 4) % 2
            ? 'Patrol'
            : 'Idle';
      let goal = chase ? player : e.home;
      if (e.state === 'Patrol') {
        const homeCell = cellAt(e.home);
        if (homeCell) {
          const d = DIRECTIONS[Math.floor(e.clock / 4) % 4]!;
          const n = MINE_LAYOUT.get(cellKey(homeCell.x + d.x, homeCell.row + d.row));
          if (n && n.distance >= 150) goal = new THREE.Vector3().copy(cellPosition(n));
        }
      }
      if (e.state === 'Idle') continue;
      if (e.routeTimer <= 0 && !e.path.length) {
        e.path = this.route(e.mesh.position, goal);
        e.routeTimer = 1;
      }
      const cell = e.path[0] ? MINE_LAYOUT.get(e.path[0]) : null;
      const target = cell ? new THREE.Vector3().copy(cellPosition(cell)) : goal.clone();
      if (e.mesh.position.distanceTo(target) < 0.4) {
        e.path.shift();
        continue;
      }
      const delta = target.sub(e.mesh.position);
      delta.y = 0;
      const len = delta.length();
      if (len > 0.1) {
        delta.multiplyScalar(Math.min(len, ENEMIES[e.type]!.speed * dt) / len);
        const next = e.mesh.position.clone().add(delta);
        const c = cellAt(next);
        if (
          c &&
          c.distance >= 150 &&
          !g.physicsRay(
            e.mesh.position.clone().add(new THREE.Vector3(0, 0.55, 0)),
            delta.clone().normalize(),
            delta.length() + 0.35,
          )
        ) {
          e.mesh.position.copy(next);
          e.mesh.rotation.y = Math.atan2(delta.x, delta.z);
        }
      }
    }
  }
  death(): void {
    const g = this.game,
      loss = g.inventory
        .snapshot()
        .slots.filter((s) => ['iron', 'copper', 'silver', 'mithril', 'coal'].includes(s.item))
        .map((s) => ({ item: s.item, quantity: Math.floor(s.quantity * 0.2) }))
        .filter((s) => s.quantity > 0);
    g.inventory.exchange(loss, []);
    this.clearEnemies();
    this.hp = 100;
    this.stamina = 100;
    g.player.reset({ x: 0, y: 1, z: -29 });
    this.notice('광물 20% 손실 · 광산 입구로 복귀했습니다.');
  }
  snapshot(): unknown {
    return {
      hp: this.hp,
      stamina: this.stamina,
      main: this.main,
      shield: this.shield,
      pick: this.pick,
      slot: this.slot,
      kills: this.kills,
      spawned: [...this.spawned],
      enemies: this.enemies.map((e) => ({
        position: e.mesh.position.toArray(),
        home: e.home.toArray(),
        hp: e.hp,
        type: e.type,
        state: e.state,
      })),
    };
  }
  restore(d: any): void {
    if (!d) return;
    this.clearEnemies();
    this.hp = THREE.MathUtils.clamp(Number(d.hp) || 100, 1, 100);
    this.stamina = THREE.MathUtils.clamp(Number(d.stamina) || 0, 0, 100);
    this.main = d.main;
    this.pick = d.pick;
    this.shield = d.shield;
    this.slot = d.slot === 1 ? 1 : 3;
    this.kills = Number(d.kills) || 0;
    this.spawned = new Set(Array.isArray(d.spawned) ? d.spawned : []);
    for (const x of (d.enemies ?? []).slice(0, 50)) {
      if (!ENEMIES[x.type as 0 | 1 | 2] || !Array.isArray(x.position) || !Array.isArray(x.home))
        continue;
      const mesh = this.monster(x.type);
      mesh.position.fromArray(x.position);
      mesh.visible = x.hp > 0;
      this.game.scene.scene.add(mesh);
      this.enemies.push({
        mesh,
        home: new THREE.Vector3().fromArray(x.home),
        hp: x.hp,
        type: x.type,
        state: x.hp <= 0 ? 'Defeated' : 'Idle',
        clock: 0,
        attack: 1,
        path: [],
        routeTimer: 0,
      });
    }
  }
  clearEnemies(): void {
    for (const e of this.enemies) this.disposeModel(e.mesh);
    this.enemies = [];
    this.spawned.clear();
  }
  dispose(): void {
    this.clearEnemies();
    this.disposeModel(this.weapon);
    this.disposeModel(this.shieldModel);
    this.disposeModel(this.particles);
    void this.audio?.close();
  }
}

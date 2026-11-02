import { InventoryManager } from '../inventory/InventoryManager';
import { MiningManager } from '../mining/MiningManager';
import { generateVeins, mineDepth } from '../mining/data';
import { MiningView } from '../mining/MiningView';
import { MiningUI } from '../ui/MiningUI';
import * as THREE from 'three';
import { EventBus } from './EventBus';
import type { GameState, Vec3 } from './types';
import { InputManager } from '../input/InputManager';
import { FIXED_STEP, PhysicsWorld } from '../physics/PhysicsWorld';
import { PlayerMotor } from '../physics/PlayerMotor';
import { PlayerController } from '../player/PlayerController';
import { SceneRenderer } from '../render/SceneRenderer';
import { UIManager } from '../ui/UIManager';
import { PLAYER_SPAWN } from '../world/data';
import { WorldManager } from '../world/WorldManager';

export interface DebugSnapshot {
  position: Vec3;
  grounded: boolean;
  state: GameState;
  zone: string | null;
  target: string | null;
  yaw: number;
  pitch: number;
  draws: number;
  colliders: number;
}

export interface ForgeDebug {
  snapshot(): DebugSnapshot;
  teleport(position: Vec3): void;
  look(yaw: number, pitch?: number): void;
  fixtureIds(): string[];
  miningSnapshot(): {
    inventory: ReturnType<InventoryManager['snapshot']>;
    veins: Array<{ id: string; ore: string; position: Vec3; remaining: number; depleted: boolean }>;
  };
}

declare global {
  interface Window {
    __forgeDebug?: ForgeDebug;
  }
}

export class GameManager {
  readonly events = new EventBus();
  readonly scene: SceneRenderer;
  readonly world: WorldManager;
  readonly motor: PlayerMotor;
  readonly input: InputManager;
  readonly player: PlayerController;
  readonly ui: UIManager;
  readonly inventory = new InventoryManager(this.events);
  readonly mining = new MiningManager(generateVeins(), this.inventory, this.events);
  readonly miningView: MiningView;
  readonly miningUI: MiningUI;
  private state: GameState = 'ready';
  private animationFrame = 0;
  private lastTime = performance.now();
  private accumulator = 0;
  private elapsed = 0;
  private disposed = false;
  private readonly direction = new THREE.Vector3();

  static async create(
    container: HTMLElement,
    onError: (error: unknown) => void,
    onProgress?: (message: string) => void,
  ): Promise<GameManager> {
    onProgress?.('물리 엔진을 준비하는 중…');
    const physics = await PhysicsWorld.create();
    try {
      onProgress?.('3D 월드를 만드는 중…');
      return new GameManager(container, physics, onError);
    } catch (error) {
      physics.dispose();
      throw error;
    }
  }

  private constructor(
    container: HTMLElement,
    private readonly physics: PhysicsWorld,
    private readonly onError: (error: unknown) => void,
  ) {
    this.scene = new SceneRenderer(container);
    this.world = new WorldManager(physics, this.events);
    this.scene.scene.add(this.world.root);
    this.motor = new PlayerMotor(physics, PLAYER_SPAWN);
    this.input = new InputManager(
      this.scene.renderer.domElement,
      this.events,
      (locked) => {
        if (locked) this.setState('playing');
        else if (this.state === 'playing') this.setState('paused');
      },
      () => this.ui.toggleMap(),
      {
        inventory: () => this.toggleInventory(),
        equip: () => this.inventory.toggleEquip(),
        attack: () => this.miningView.swing(this.elapsed),
      },
    );
    this.player = new PlayerController(this.motor, this.input, this.scene.camera);
    this.ui = new UIManager(container, this.events, {
      enter: () => {
        void this.input.requestLock();
      },
      reset: () => {
        this.player.reset();
        this.input.clear();
      },
      sensitivity: (value) => {
        this.input.sensitivity = value * 0.002;
      },
      headBob: (enabled) => {
        this.player.headBob = enabled;
      },
    });
    this.scene.scene.add(this.scene.camera);
    this.miningView = new MiningView(this.mining, physics, this.scene.camera, this.events);
    this.scene.scene.add(this.miningView.root);
    this.miningUI = new MiningUI(container, this.inventory, this.mining, this.events, () =>
      this.toggleInventory(),
    );
    this.inventory.notify();
    this.player.headBob = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const checkbox = this.ui.element.querySelector<HTMLInputElement>('#head-bob');
    if (checkbox) checkbox.checked = this.player.headBob;
    // Populate broad-phase queries before the first frame.
    this.physics.step();
    this.world.zone = null;
    this.world.update(
      this.motor.position,
      this.motor.position,
      { x: 0, y: 0, z: -1 },
      this.motor.collider,
      0,
    );
    this.events.emit('stateChanged', 'ready');
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('debug'))
      this.installDebug();
    this.lastTime = performance.now();
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  private toggleInventory(): boolean {
    if (this.state === 'playing') {
      this.setState('inventory');
      document.exitPointerLock();
      return true;
    }
    if (this.state === 'inventory') {
      void this.input.requestLock();
      return true;
    }
    return false;
  }

  private setState(state: GameState): void {
    if (this.state === state) return;
    this.state = state;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.input.clear();
    this.events.emit('stateChanged', state);
    if (state === 'playing') this.player.render(1, 0);
    else this.miningView?.cancel();
  }

  private readonly frame = (now: number): void => {
    if (this.disposed) return;
    try {
      const dt = Math.min(Math.max((now - this.lastTime) / 1000, 0), 0.1);
      this.lastTime = now;
      if (this.state === 'playing') {
        this.elapsed += dt;
        this.player.look();
        this.accumulator += dt;
        while (this.accumulator >= FIXED_STEP) {
          this.player.fixedUpdate();
          this.physics.step();
          this.player.afterPhysics();
          this.accumulator -= FIXED_STEP;
        }
        if (this.motor.position.y < -8) this.player.reset();
        this.player.render(this.accumulator / FIXED_STEP, dt);
        this.scene.camera.getWorldDirection(this.direction);
        this.world.update(
          this.motor.position,
          this.scene.camera.position,
          this.direction,
          this.motor.collider,
          this.elapsed,
        );
        this.miningView.update(dt, this.elapsed, this.motor.collider, true);
        this.miningUI.update(
          this.motor.position,
          this.world.zone?.id,
          this.miningView.targetId,
          this.elapsed,
        );
        this.scene.setUnderground(mineDepth(this.motor.position));
        this.ui.update(this.motor.position, this.player.yaw);
      } else if (this.state === 'ready') {
        this.scene.camera.position.set(26, 18, 32);
        this.scene.camera.lookAt(0, 1.5, -8);
        this.world.animate(now / 1000);
      }
      if (this.state !== 'playing')
        this.miningView.update(0, this.elapsed, this.motor.collider, false);
      this.scene.render();
      this.animationFrame = requestAnimationFrame(this.frame);
    } catch (error) {
      this.dispose();
      this.onError(error);
    }
  };

  private installDebug(): void {
    window.__forgeDebug = {
      snapshot: () => ({
        position: { ...this.motor.position },
        grounded: this.motor.grounded,
        state: this.state,
        zone: this.world.zone?.id ?? null,
        target: this.world.target?.id ?? null,
        yaw: this.player.yaw,
        pitch: this.player.pitch,
        draws: this.scene.renderer.info.render.calls,
        colliders: this.physics.world.colliders.len(),
      }),
      teleport: (position) => {
        this.input.clear();
        this.player.reset(position);
      },
      look: (yaw, pitch = 0) => {
        this.player.yaw = yaw;
        this.player.pitch = pitch;
      },
      fixtureIds: () => [...this.world.fixtures.keys()],
      miningSnapshot: () => ({
        inventory: this.inventory.snapshot(),
        veins: [...this.mining.veins.values()].map((v) => ({
          id: v.id,
          ore: v.ore,
          position: v.position,
          remaining: v.remaining,
          depleted: v.depleted,
        })),
      }),
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.input.dispose();
    this.ui.dispose();
    this.miningUI.dispose();
    this.miningView.dispose();
    this.motor.dispose();
    this.world.dispose();
    this.scene.dispose();
    this.events.dispose();
    this.physics.dispose();
    delete window.__forgeDebug;
  }
}

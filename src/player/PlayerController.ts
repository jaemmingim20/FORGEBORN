import * as THREE from 'three';
import { InputManager } from '../input/InputManager';
import { CAPSULE_HEIGHT, PLAYER, PlayerMotor } from '../physics/PlayerMotor';
import type { Vec3 } from '../core/types';
import { PLAYER_SPAWN } from '../world/data';

export class PlayerController {
  yaw = 0;
  pitch = -0.03;
  headBob = true;
  private readonly previous = new THREE.Vector3();
  private readonly current = new THREE.Vector3();
  private bobTime = 0;
  private bob = 0;

  constructor(
    readonly motor: PlayerMotor,
    private readonly input: InputManager,
    readonly camera: THREE.PerspectiveCamera,
  ) {
    this.previous.copy(motor.position);
    this.current.copy(motor.position);
    camera.rotation.order = 'YXZ';
  }

  look(): void {
    const delta = this.input.consumeLook();
    this.yaw -= delta.x * this.input.sensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - delta.y * this.input.sensitivity,
      -Math.PI / 2 + 0.025,
      Math.PI / 2 - 0.025,
    );
  }

  fixedUpdate(): void {
    this.previous.copy(this.motor.position);
    this.motor.update({
      forward: this.input.axis('KeyW', 'KeyS'),
      right: this.input.axis('KeyD', 'KeyA'),
      sprint: this.input.sprint,
      jump: this.input.consumeJump(),
      yaw: this.yaw,
    });
  }

  afterPhysics(): void {
    this.current.copy(this.motor.position);
  }

  render(alpha: number, dt: number): void {
    this.camera.position.lerpVectors(this.previous, this.current, alpha);
    if (this.motor.grounded && this.motor.moving) this.bobTime += dt * (this.input.sprint ? 12 : 9);
    const targetBob =
      this.headBob && this.motor.grounded && this.motor.moving ? Math.sin(this.bobTime) * 0.025 : 0;
    this.bob = THREE.MathUtils.damp(this.bob, targetBob, 15, dt);
    this.camera.position.y += PLAYER.eyeHeight - CAPSULE_HEIGHT + this.bob;
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  reset(position: Vec3 = PLAYER_SPAWN): void {
    this.motor.teleport(position);
    this.previous.copy(position);
    this.current.copy(position);
    this.bob = 0;
    this.yaw = 0;
    this.pitch = -0.03;
  }
}

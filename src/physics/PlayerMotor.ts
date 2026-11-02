import RAPIER from '@dimforge/rapier3d-compat';
import type { MovementIntent, Vec3 } from '../core/types';
import { FIXED_STEP, PhysicsWorld } from './PhysicsWorld';

export const PLAYER = {
  radius: 0.32,
  halfHeight: 0.55,
  eyeHeight: 1.65,
  walkSpeed: 4.5,
  runSpeed: 6.5,
  jumpSpeed: 7,
  gravity: 24,
} as const;
export const CAPSULE_HEIGHT = PLAYER.radius + PLAYER.halfHeight;

export class PlayerMotor {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private readonly controller: RAPIER.KinematicCharacterController;
  private velocityY = 0;
  private coyote = 0;
  private jumpBuffer = 0;
  grounded = false;
  moving = false;
  canSprint = true;

  constructor(
    private readonly physics: PhysicsWorld,
    spawn: Vec3,
  ) {
    this.body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y, spawn.z),
    );
    this.collider = physics.world.createCollider(
      RAPIER.ColliderDesc.capsule(PLAYER.halfHeight, PLAYER.radius),
      this.body,
    );
    this.controller = physics.world.createCharacterController(0.015);
    this.controller.enableAutostep(0.28, 0.2, false);
    this.controller.enableSnapToGround(0.18);
    this.controller.setMaxSlopeClimbAngle(Math.PI / 4);
    this.controller.setMinSlopeSlideAngle(Math.PI / 3);
  }

  get position(): Vec3 {
    return this.body.translation();
  }

  update(intent: MovementIntent): void {
    const dt = FIXED_STEP;
    this.coyote = this.grounded ? 0.09 : Math.max(0, this.coyote - dt);
    this.jumpBuffer = intent.jump ? 0.12 : Math.max(0, this.jumpBuffer - dt);
    if (this.grounded && this.velocityY < 0) this.velocityY = 0;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.velocityY = PLAYER.jumpSpeed;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.grounded = false;
    }
    this.velocityY = Math.max(this.velocityY - PLAYER.gravity * dt, -35);
    const length = Math.hypot(intent.forward, intent.right);
    const forward = intent.forward / Math.max(1, length);
    const right = intent.right / Math.max(1, length);
    const distance = (intent.sprint && this.canSprint ? PLAYER.runSpeed : PLAYER.walkSpeed) * dt;
    const movement = {
      x: (-Math.sin(intent.yaw) * forward + Math.cos(intent.yaw) * right) * distance,
      y: this.velocityY * dt,
      z: (-Math.cos(intent.yaw) * forward - Math.sin(intent.yaw) * right) * distance,
    };
    this.controller.computeColliderMovement(this.collider, movement);
    const delta = this.controller.computedMovement();
    const position = this.position;
    this.body.setNextKinematicTranslation({
      x: position.x + delta.x,
      y: position.y + delta.y,
      z: position.z + delta.z,
    });
    this.grounded = this.controller.computedGrounded();
    if (!this.grounded && this.velocityY > 0 && delta.y < movement.y * 0.5) this.velocityY = 0;
    this.moving = Math.hypot(delta.x, delta.z) > 0.005;
  }

  teleport(position: Vec3): void {
    this.body.setTranslation(position, true);
    this.body.setNextKinematicTranslation(position);
    this.velocityY = 0;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.grounded = false;
  }

  dispose(): void {
    this.physics.world.removeCharacterController(this.controller);
    this.physics.world.removeRigidBody(this.body);
  }
}

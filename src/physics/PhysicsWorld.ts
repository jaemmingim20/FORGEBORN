import RAPIER from '@dimforge/rapier3d-compat';
import type { BoxColliderSpec, Vec3 } from '../core/types';

let initialization: Promise<void> | undefined;
export const FIXED_STEP = 1 / 60;

export class PhysicsWorld {
  readonly world: RAPIER.World;
  private readonly fixtures = new Map<number, string>();

  static async create(): Promise<PhysicsWorld> {
    initialization ??= RAPIER.init();
    await initialization;
    return new PhysicsWorld();
  }

  private constructor() {
    this.world = new RAPIER.World({ x: 0, y: -24, z: 0 });
    this.world.timestep = FIXED_STEP;
  }

  /** An analytic plane avoids capsule/cuboid GJK jitter on very large flat floors. */
  addGround(height = -0.02): void {
    const desc = new RAPIER.ColliderDesc(new RAPIER.HalfSpace({ x: 0, y: 1, z: 0 })).setTranslation(
      0,
      height,
      0,
    );
    this.world.createCollider(desc);
  }

  addBox(spec: BoxColliderSpec): RAPIER.Collider {
    const half = { x: spec.size.x / 2, y: spec.size.y / 2, z: spec.size.z / 2 };
    const angle = spec.rotation ?? 0;
    const desc = RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z)
      .setTranslation(spec.center.x, spec.center.y, spec.center.z)
      .setRotation(
        spec.quaternion ?? { x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) },
      )
      .setFriction(0.8);
    const collider = this.world.createCollider(desc);
    if (spec.fixtureId) this.fixtures.set(collider.handle, spec.fixtureId);
    return collider;
  }

  lookAt(origin: Vec3, direction: Vec3, exclude: RAPIER.Collider): string | null {
    const hit = this.world.castRay(
      new RAPIER.Ray(origin, direction),
      3.5,
      true,
      undefined,
      undefined,
      exclude,
    );
    return hit ? (this.fixtures.get(hit.collider.handle) ?? null) : null;
  }

  step(): void {
    this.world.step();
  }

  removeCollider(collider: RAPIER.Collider): void {
    this.fixtures.delete(collider.handle);
    this.world.removeCollider(collider, true);
  }

  dispose(): void {
    this.fixtures.clear();
    this.world.free();
  }
}

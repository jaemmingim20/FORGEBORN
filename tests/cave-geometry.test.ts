import { describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../src/physics/PhysicsWorld';
import {
  caveWallOffset,
  caveWallGeometry,
  caveCeilingHeight,
  caveCeilingGeometry,
  caveFloorGeometry,
} from '../src/world/caveGeometry';

describe('organic cave surface safety', () => {
  it('keeps rock behind the ore envelope at player and target height', () => {
    for (const seed of [-37, 21, 7026, 15488])
      for (let u = -5.325; u <= 5.325; u += 0.25)
        for (let y = 0; y <= 2.75; y += 0.25) {
          const face = 5 + caveWallOffset(u, y, 5, seed);
          expect(face).toBeGreaterThanOrEqual(4.95);
          expect(face).toBeGreaterThan(4.775);
        }
  });

  it('leaves jump/head clearance under the vault while varying its shape', () => {
    const heights: number[] = [];
    for (let x = -15; x <= 15; x += 0.5)
      for (let z = -170; z <= -140; z += 0.5) heights.push(caveCeilingHeight(x, z, 5));
    expect(Math.min(...heights)).toBeGreaterThan(3.7);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.9);
  });

  it('produces deterministic UV-equipped finite geometry for static batching', () => {
    const wall = caveWallGeometry(10.65, 5, 91);
    const same = caveWallGeometry(10.65, 5, 91);
    expect(Array.from(wall.getAttribute('position').array)).toEqual(
      Array.from(same.getAttribute('position').array),
    );
    for (const geometry of [
      wall,
      same,
      caveCeilingGeometry(20, -147, 5),
      caveFloorGeometry(20, -147),
    ]) {
      expect(geometry.getAttribute('uv').count).toBe(geometry.getAttribute('position').count);
      for (const attribute of ['position', 'normal', 'uv'])
        expect(Array.from(geometry.getAttribute(attribute).array).every(Number.isFinite)).toBe(
          true,
        );
      geometry.dispose();
    }
  });

  it('the matching rock collision surface leaves the ore as the nearest mining target', async () => {
    const physics = await PhysicsWorld.create();
    const geometry = caveWallGeometry(10.65, 5, 91);
    try {
      physics.world.createCollider(
        RAPIER.ColliderDesc.trimesh(
          new Float32Array(geometry.getAttribute('position').array),
          new Uint32Array(geometry.getIndex()!.array),
        )
          .setTranslation(5, 0, 0)
          .setRotation({ x: 0, y: Math.sin(Math.PI / 4), z: 0, w: Math.cos(Math.PI / 4) }),
      );
      const ore = physics.addBox({
        center: { x: 4.25, y: 1.05, z: 0 },
        size: { x: 1.05, y: 1, z: 1.2 },
        fixtureId: 'test-ore',
      });
      physics.step();
      const ray = new RAPIER.Ray({ x: 0, y: 1.05, z: 0 }, { x: 1, y: 0, z: 0 });
      expect(physics.world.castRay(ray, 8, true)!.collider.handle).toBe(ore.handle);
      physics.removeCollider(ore);
      physics.step();
      expect(physics.world.castRay(ray, 8, true)!.timeOfImpact).toBeGreaterThan(4.95);
    } finally {
      geometry.dispose();
      physics.dispose();
    }
  });
});

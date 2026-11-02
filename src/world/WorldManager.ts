import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import type { FixtureDefinition, Vec3, ZoneDefinition } from '../core/types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type RAPIER from '@dimforge/rapier3d-compat';
import { Materials } from '../render/materials';
import { FIXTURES, zoneAt } from './data';
import { WorldBuilder } from './WorldBuilder';

export class WorldManager {
  readonly materials = new Materials();
  readonly root: THREE.Group;
  readonly fixtures = new Map(FIXTURES.map((fixture) => [fixture.id, fixture]));
  zone: ZoneDefinition | null = null;
  target: FixtureDefinition | null = null;
  private readonly flames: THREE.Object3D[] = [];
  private readonly firelights: THREE.PointLight[] = [];

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly events: EventBus,
  ) {
    this.root = new WorldBuilder(physics, this.materials).build();
    this.root.traverse((object) => {
      if (object.name === 'flame') this.flames.push(object);
      if (object.name === 'firelight' && object instanceof THREE.PointLight)
        this.firelights.push(object);
    });
  }

  update(
    position: Vec3,
    origin: Vec3,
    direction: Vec3,
    collider: RAPIER.Collider,
    time: number,
  ): void {
    const zone = zoneAt(position);
    if (this.zone?.id !== zone.id) {
      this.zone = zone;
      this.events.emit('zoneChanged', zone);
    }
    const id = this.physics.lookAt(origin, direction, collider);
    const fixture = id ? (this.fixtures.get(id) ?? null) : null;
    if (this.target?.id !== fixture?.id) {
      this.target = fixture;
      this.events.emit('targetChanged', fixture);
    }
    this.animate(time);
  }

  animate(time: number): void {
    this.flames.forEach((flame, i) => {
      flame.scale.y = 0.85 + Math.sin(time * 7 + i * 1.7) * 0.13 + Math.sin(time * 13 + i) * 0.07;
      flame.rotation.y = time * 0.7 + i;
    });
    this.firelights.forEach((light) => {
      light.intensity = 30 + Math.sin(time * 6) * 2;
    });
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (
          object.userData.unbatched &&
          !Array.isArray(object.material) &&
          object.material instanceof THREE.MeshStandardMaterial &&
          object.material.map
        ) {
          object.material.map.dispose();
          object.material.dispose();
        }
      }
    });
    this.materials.dispose();
    this.root.removeFromParent();
  }
}

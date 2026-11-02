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
  private readonly contactMaterial: THREE.MeshBasicMaterial;

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly events: EventBus,
  ) {
    this.root = new WorldBuilder(physics, this.materials).build();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!,
      gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(10,12,9,0.42)');
    gradient.addColorStop(0.5, 'rgba(10,12,9,0.2)');
    gradient.addColorStop(1, 'rgba(10,12,9,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    this.contactMaterial = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    for (const fixture of FIXTURES) {
      const size: readonly [number, number] =
        fixture.kind === 'counter'
          ? [5.8, 2.3]
          : fixture.kind === 'furnace'
            ? [3.7, 3.2]
            : fixture.kind === 'cart'
              ? [3, 4]
              : fixture.kind === 'bed'
                ? [3.3, 2.1]
                : [2.5, 2];
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(...size), this.contactMaterial);
      shadow.position.set(fixture.position.x, 0.024, fixture.position.z);
      shadow.rotation.set(-Math.PI / 2, fixture.rotation ?? 0, 0, 'YXZ');
      shadow.renderOrder = 1;
      this.root.add(shadow);
    }
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
    for (const chunk of this.root.children)
      if (chunk.name === 'mine-chunk') {
        const c = chunk.userData.center as Vec3;
        const active = Math.hypot(c.x - position.x, c.z - position.z) < 70;
        if (!active && chunk.visible)
          chunk.traverse((o) => {
            if (o instanceof THREE.Mesh) o.geometry.dispose();
          });
        chunk.visible = active;
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
      if (object instanceof THREE.Points) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material instanceof THREE.PointsMaterial) material.map?.dispose();
          material.dispose();
        }
      }
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (
          object.userData.unbatched &&
          object.name !== 'static-batch' &&
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
    this.contactMaterial.map?.dispose();
    this.contactMaterial.dispose();
    this.root.removeFromParent();
  }
}

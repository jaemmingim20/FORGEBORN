import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../core/EventBus';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { MiningManager } from './MiningManager';
import { ORES } from './data';
import { box, mesh, cylinder } from '../world/primitives';

export class MiningView {
  readonly root = new THREE.Group();
  readonly pickaxe = new THREE.Group();
  targetId: string | null = null;
  private readonly visuals = new Map<string, { group: THREE.Group; collider: RAPIER.Collider }>();
  private readonly materials: THREE.Material[] = [];
  private readonly direction = new THREE.Vector3();
  private readonly chips = new THREE.Group();
  private attackTime = -1;
  private impacted = false;
  private nextSwing = 0;
  private chipLife = 0;

  constructor(
    readonly manager: MiningManager,
    private readonly physics: PhysicsWorld,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly events: EventBus,
  ) {
    const rock = new THREE.MeshStandardMaterial({
      color: '#414c4c',
      roughness: 1,
      flatShading: true,
    });
    const wood = new THREE.MeshStandardMaterial({ color: '#866546', roughness: 0.9 });
    const iron = new THREE.MeshStandardMaterial({
      color: '#82918f',
      metalness: 0.7,
      roughness: 0.48,
    });
    this.materials.push(rock, wood, iron);
    for (const vein of manager.veins.values()) {
      const group = new THREE.Group();
      group.position.copy(vein.position);
      const base = mesh(group, new THREE.DodecahedronGeometry(0.64, 0), rock);
      base.scale.set(0.9, 0.8, 1.2);
      const mineral = new THREE.MeshStandardMaterial({
        color: ORES[vein.ore].color,
        metalness: vein.ore === 'coal' ? 0 : 0.5,
        roughness: 0.4,
        emissive: ORES[vein.ore].color,
        emissiveIntensity: 0.13,
      });
      this.materials.push(mineral);
      for (let i = 0; i < 6; i++) {
        const crystal = mesh(group, new THREE.OctahedronGeometry(0.19 + (i % 3) * 0.04), mineral, [
          Math.sin(i * 2.4) * 0.42,
          Math.cos(i * 1.7) * 0.38,
          Math.cos(i * 2.4) * 0.4,
        ]);
        crystal.scale.y = 1.45;
        crystal.rotation.z = i;
      }
      this.root.add(group);
      const collider = physics.addBox({
        center: vein.position,
        size: { x: 1.05, y: 1, z: 1.2 },
        fixtureId: vein.id,
      });
      this.visuals.set(vein.id, { group, collider });
    }
    cylinder(this.pickaxe, wood, 0.025, 0.035, 0.72, [0, 0, 0], 8);
    box(this.pickaxe, iron, [0.5, 0.09, 0.09], [0, 0.3, 0]);
    const left = mesh(this.pickaxe, new THREE.ConeGeometry(0.065, 0.22, 5), iron, [-0.31, 0.27, 0]);
    left.rotation.z = Math.PI / 2 + 0.2;
    const right = mesh(this.pickaxe, new THREE.ConeGeometry(0.065, 0.22, 5), iron, [0.31, 0.27, 0]);
    right.rotation.z = -Math.PI / 2 - 0.2;
    this.pickaxe.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = false;
    });
    this.pickaxe.position.set(0.4, -0.4, -0.62);
    this.pickaxe.scale.setScalar(0.72);
    camera.add(this.pickaxe);
    // A short-range exploration fill light keeps the unlit deep corridors readable.
    const lantern = new THREE.PointLight('#e5ccb0', 4, 18, 2);
    lantern.position.set(0, 0.8, -0.4);
    camera.add(lantern);
    this.root.add(this.chips);
    for (let i = 0; i < 8; i++) mesh(this.chips, new THREE.TetrahedronGeometry(0.035), iron);
    this.chips.visible = false;
  }

  swing(now: number): void {
    if (now < this.nextSwing || this.attackTime >= 0) return;
    if (!this.manager.inventory.equipped) {
      this.events.emit('miningFeedback', '3번 키 또는 인벤토리에서 곡괭이를 장착하세요.');
      return;
    }
    this.nextSwing = now + 0.65;
    this.attackTime = 0;
    this.impacted = false;
  }
  cancel(): void {
    this.attackTime = -1;
    this.pickaxe.rotation.set(0, 0, -0.18);
  }
  update(dt: number, now: number, playerCollider: RAPIER.Collider, active: boolean): void {
    for (const [id, visual] of this.visuals) {
      visual.group.visible =
        !this.manager.veins.get(id)!.depleted &&
        visual.group.position.distanceToSquared(this.camera.position) < 45 * 45;
    }
    this.pickaxe.visible = active && this.manager.inventory.equipped;
    if (!active) {
      this.cancel();
      this.targetId = null;
      return;
    }
    this.camera.getWorldDirection(this.direction);
    const hit = this.physics.lookAt(this.camera.position, this.direction, playerCollider);
    this.targetId = hit && this.manager.veins.has(hit) ? hit : null;
    if (this.attackTime >= 0) {
      this.attackTime += dt;
      const amount = Math.sin(Math.min(this.attackTime / 0.55, 1) * Math.PI);
      this.pickaxe.rotation.set(-amount * 1.1, amount * 0.3, -0.18 - amount * 0.5);
      if (!this.impacted && this.attackTime >= 0.24) {
        this.impacted = true;
        if (this.targetId) {
          const result = this.manager.strike(this.targetId, now);
          if (result === 'tool')
            this.events.emit('miningFeedback', '이 광물에는 더 높은 등급의 곡괭이가 필요합니다.');
          if (result === 'full')
            this.events.emit('miningFeedback', '인벤토리가 가득 찼습니다. 광맥은 보존됩니다.');
          if (result === 'hit' || result === 'collected') {
            const visual = this.visuals.get(this.targetId)!;
            this.chips.position.copy(visual.group.position);
            this.chips.visible = true;
            this.chipLife = 0.35;
            if (result === 'collected') {
              visual.group.visible = false;
              this.physics.removeCollider(visual.collider);
            }
          }
        }
      }
      if (this.attackTime > 0.55) this.cancel();
    }
    if (this.chipLife > 0) {
      this.chipLife -= dt;
      this.chips.children.forEach((chip, i) =>
        chip.position.set(
          Math.sin(i * 2.4) * (0.35 - this.chipLife) * 2,
          (0.35 - this.chipLife) * ((i % 3) + 1),
          Math.cos(i * 2.4) * (0.35 - this.chipLife) * 2,
        ),
      );
      if (this.chipLife <= 0) this.chips.visible = false;
    }
  }
  dispose(): void {
    for (const group of [this.root, this.pickaxe]) {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      group.removeFromParent();
    }
    this.materials.forEach((m) => m.dispose());
  }
}

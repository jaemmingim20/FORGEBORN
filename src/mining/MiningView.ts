import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { EventBus } from '../core/EventBus';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { MiningManager } from './MiningManager';
import { ORES } from './data';
import { mesh, batchStatic } from '../world/primitives';
import { buildPickaxeModel } from '../world/PickaxeModel';
import type { Materials } from '../render/materials';
import { seededRandom } from '../world/data';
import { cellAt, cellPosition } from '../world/mineLayout';

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
    worldMaterials: Materials,
  ) {
    const iron = new THREE.MeshStandardMaterial({
      color: '#9ca6a2',
      metalness: 0.7,
      roughness: 0.65,
    });
    this.materials.push(iron);
    const oreMaterials = new Map(
      Object.entries(ORES).map(([id, ore]) => {
        const material = new THREE.MeshStandardMaterial({
          color: ore.color,
          map: worldMaterials.rock.map,
          normalMap: worldMaterials.rock.normalMap,
          roughnessMap: worldMaterials.rock.roughnessMap,
          metalness: id === 'coal' ? 0.05 : 0.7,
          roughness: id === 'coal' ? 0.94 : 0.55,
          emissive: ore.color,
          emissiveIntensity: id === 'mithril' ? 0.07 : 0.015,
        });
        this.materials.push(material);
        return [id, material] as const;
      }),
    );
    for (const vein of manager.veins.values()) {
      const group = new THREE.Group();
      const random = seededRandom(
        vein.id.split('').reduce((n, c) => Math.imul(n, 31) + c.charCodeAt(0), 2166136261),
      );
      const base = mesh(group, new THREE.IcosahedronGeometry(0.58, 1), worldMaterials.rockDark);
      base.scale.set(0.9, 0.8, 1.05);
      // Root the mineral-bearing boulder into the floor/rock behind the visible seam.
      const cell = cellAt(vein.position),
        center = cell ? cellPosition(cell) : { x: 0, y: 0, z: vein.position.z };
      const dx = vein.position.x - center.x,
        dz = vein.position.z - center.z;
      const nx = Math.abs(dx) >= Math.abs(dz) ? Math.sign(dx) : 0,
        nz = nx ? 0 : Math.sign(dz);
      const anchor = mesh(group, new THREE.IcosahedronGeometry(0.62, 1), worldMaterials.rockDark, [
        nx * 0.3,
        -0.45,
        nz * 0.3,
      ]);
      anchor.scale.set(0.95, 1.05, 1.0);
      for (let i = 0; i < 14; i++) {
        const angle = random() * Math.PI * 2,
          elevation = (random() - 0.5) * 2;
        const patch = mesh(
          group,
          new THREE.DodecahedronGeometry(0.08 + random() * 0.1, 0),
          oreMaterials.get(vein.ore)!,
          [Math.cos(angle) * 0.41, elevation * 0.33, Math.sin(angle) * 0.45],
        );
        patch.scale.set(1.4, 0.45 + random() * 0.5, 0.7);
        patch.rotation.set(random() * 3, angle, random());
      }
      batchStatic(group);
      group.position.copy(vein.position);
      this.root.add(group);
      const collider = physics.addBox({
        center: vein.position,
        size: { x: 1.05, y: 1, z: 1.2 },
        fixtureId: vein.id,
      });
      this.visuals.set(vein.id, { group, collider });
    }
    this.pickaxe.add(buildPickaxeModel(worldMaterials));
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

  syncVeins(): void {
    for (const [id, visual] of this.visuals) {
      const vein = this.manager.veins.get(id)!;
      if (vein.depleted && visual.collider.isValid()) this.physics.removeCollider(visual.collider);
      if (!vein.depleted && !visual.collider.isValid())
        visual.collider = this.physics.addBox({
          center: vein.position,
          size: { x: 1.05, y: 1, z: 1.2 },
          fixtureId: id,
        });
      visual.group.visible = !vein.depleted;
    }
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

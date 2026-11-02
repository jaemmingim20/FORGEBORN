import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Triple = readonly [number, number, number];

export function mesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  at: Triple = [0, 0, 0],
): THREE.Mesh {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...at);
  object.castShadow = object.receiveShadow = true;
  group.add(object);
  return object;
}

export function box(
  group: THREE.Group,
  material: THREE.Material,
  size: Triple,
  at: Triple = [0, 0, 0],
): THREE.Mesh {
  return mesh(group, new THREE.BoxGeometry(...size), material, at);
}

export function cylinder(
  group: THREE.Group,
  material: THREE.Material,
  top: number,
  bottom: number,
  height: number,
  at: Triple,
  sides = 10,
): THREE.Mesh {
  return mesh(group, new THREE.CylinderGeometry(top, bottom, height, sides), material, at);
}

export function beam(
  group: THREE.Group,
  material: THREE.Material,
  start: Triple,
  end: Triple,
  width = 0.15,
): THREE.Mesh {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const object = box(group, material, [width, a.distanceTo(b), width]);
  object.position.copy(a).add(b).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return object;
}

/** One batch per material, preserving dynamic objects and sign textures. */
export function batchStatic(root: THREE.Group): void {
  root.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const originals: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      object.userData.unbatched ||
      Array.isArray(object.material)
    )
      return;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    // Different primitive types use different index and UV layouts; flatten before merge.
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    flat.deleteAttribute('uv');
    // Retain UVs on textured materials so repeated stone/wood patterns survive batching.
    if ('map' in object.material && object.material.map) {
      const source = object.geometry.index
        ? object.geometry.toNonIndexed()
        : object.geometry.clone();
      const uv = source.getAttribute('uv');
      if (uv) flat.setAttribute('uv', uv.clone());
      source.dispose();
    }
    const list = batches.get(object.material) ?? [];
    list.push(flat);
    batches.set(object.material, list);
    originals.push(object);
  });
  for (const object of originals) {
    object.removeFromParent();
    object.geometry.dispose();
  }
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) throw new Error('정적 월드 형상을 병합하지 못했습니다.');
    const object = new THREE.Mesh(merged, material);
    object.castShadow = object.receiveShadow = true;
    object.name = 'static-batch';
    root.add(object);
  }
}

export function textSign(
  group: THREE.Group,
  text: string,
  subtitle: string,
  at: Triple,
  width = 2.6,
  rotation = 0,
): void {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#27332d';
  ctx.fillRect(0, 0, 768, 256);
  ctx.strokeStyle = '#bba16f';
  ctx.lineWidth = 3;
  ctx.strokeRect(15, 15, 738, 226);
  ctx.fillStyle = '#e1c78e';
  ctx.textAlign = 'center';
  ctx.font = '36px Georgia, serif';
  ctx.fillText(text, 384, 115);
  ctx.font = '20px Georgia, serif';
  ctx.fillStyle = '#c0c4ae';
  ctx.fillText(subtitle, 384, 170);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const sign = mesh(group, new THREE.PlaneGeometry(width, width / 3), material, at);
  sign.rotation.y = rotation;
  sign.userData.unbatched = true;
}

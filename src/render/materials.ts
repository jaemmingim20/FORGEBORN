import * as THREE from 'three';
import { surfaceTextures } from './surfaceTextures';

export class Materials {
  readonly timber = new THREE.MeshStandardMaterial({
    color: '#c6bba4',
    ...surfaceTextures('timber', 1, 2),
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughness: 0.92,
  });
  readonly wood = new THREE.MeshStandardMaterial({
    color: '#ebd8b4',
    ...surfaceTextures('oak', 1, 2),
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.9,
  });
  readonly stone = new THREE.MeshStandardMaterial({
    color: '#cac6b6',
    ...surfaceTextures('limestone', 2, 2),
    roughness: 0.95,
    flatShading: true,
  });
  readonly stoneLight = new THREE.MeshStandardMaterial({
    color: '#f2e7c9',
    ...surfaceTextures('limestone', 2, 2),
    roughness: 1,
    flatShading: true,
  });
  readonly rock = new THREE.MeshStandardMaterial({
    color: '#c2c2b6',
    ...surfaceTextures('rock', 3, 2),
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 1,
    flatShading: false,
  });
  readonly rockDark = new THREE.MeshStandardMaterial({
    color: '#a3aaa4',
    ...surfaceTextures('rock', 3, 2),
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 1,
    flatShading: false,
  });
  readonly plaster = new THREE.MeshStandardMaterial({
    color: '#f0e6d0',
    ...surfaceTextures('plaster', 2, 2),
    roughness: 0.97,
  });
  readonly roof = new THREE.MeshStandardMaterial({
    color: '#b1b8a6',
    ...surfaceTextures('slate', 3, 3),
    roughness: 0.9,
    flatShading: true,
  });
  readonly roofEdge = new THREE.MeshStandardMaterial({ color: '#55665a', roughness: 0.88 });
  readonly metal = new THREE.MeshStandardMaterial({
    color: '#bec5c0',
    ...surfaceTextures('iron', 2, 2),
    normalScale: new THREE.Vector2(0.25, 0.25),
    metalness: 0.82,
    roughness: 0.62,
  });
  readonly iron = new THREE.MeshStandardMaterial({
    color: '#6d7975',
    ...surfaceTextures('iron', 2, 2),
    normalScale: new THREE.Vector2(0.3, 0.3),
    metalness: 0.6,
    roughness: 0.6,
  });
  readonly brass = new THREE.MeshStandardMaterial({
    color: '#be975b',
    metalness: 0.75,
    roughness: 0.4,
  });
  readonly earth = new THREE.MeshStandardMaterial({
    color: '#d0bea0',
    ...surfaceTextures('earth', 4, 4),
    roughness: 1,
  });
  readonly grass = new THREE.MeshStandardMaterial({
    color: '#c6c5a2',
    ...surfaceTextures('grass', 60, 60),
    roughness: 1,
  });
  readonly foliage = new THREE.MeshStandardMaterial({
    color: '#526e51',
    roughness: 1,
    flatShading: true,
  });
  readonly foliageLight = new THREE.MeshStandardMaterial({
    color: '#7d8c59',
    roughness: 1,
    flatShading: true,
  });
  readonly needles = new THREE.MeshStandardMaterial({
    color: '#304e46',
    roughness: 1,
    flatShading: true,
  });
  readonly hay = new THREE.MeshStandardMaterial({ color: '#c8a871', roughness: 1 });
  readonly cloth = new THREE.MeshStandardMaterial({ color: '#456f6b', roughness: 1 });
  readonly parchment = new THREE.MeshStandardMaterial({ color: '#daccab', roughness: 1 });
  readonly dark = new THREE.MeshStandardMaterial({ color: '#121d1d', roughness: 1 });
  readonly cobble = new THREE.MeshStandardMaterial({
    ...surfaceTextures('cobble', 6, 8),
    color: '#a7a393',
    roughness: 1,
  });
  readonly fire = new THREE.MeshStandardMaterial({
    color: '#ffb44c',
    emissive: '#ff731b',
    emissiveIntensity: 3,
    roughness: 1,
  });
  readonly flame = new THREE.MeshBasicMaterial({
    color: '#ffd17c',
    transparent: true,
    opacity: 0.92,
  });
  readonly water = new THREE.MeshStandardMaterial({
    color: '#497e82',
    metalness: 0.25,
    roughness: 0.16,
    transparent: true,
    opacity: 0.83,
  });

  dispose(): void {
    for (const value of Object.values(this)) {
      if (value instanceof THREE.Material) {
        for (const slot of ['map', 'normalMap', 'roughnessMap'] as const) {
          if (slot in value) {
            const texture = (value as THREE.MeshStandardMaterial)[slot];
            texture?.dispose();
          }
        }
        value.dispose();
      }
    }
  }
}

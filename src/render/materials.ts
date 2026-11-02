import * as THREE from 'three';
import { seededRandom } from '../world/data';

function texture(kind: 'wood' | 'stone' | 'plaster' | 'earth'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const random = seededRandom(41);
  ctx.fillStyle = { wood: '#796047', stone: '#85867c', plaster: '#b7aa8e', earth: '#77735b' }[kind];
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3500; i++) {
    ctx.fillStyle = `rgba(${random() > 0.5 ? '255,246,212' : '22,24,20'},${random() * 0.08})`;
    ctx.fillRect(
      random() * 256,
      random() * 256,
      kind === 'wood' ? random() * 65 : random() * 5,
      1 + random() * 3,
    );
  }
  if (kind === 'stone') {
    ctx.fillStyle = '#4f554f';
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 5; col++) {
        const x = col * 64 + (row % 2) * 32;
        const light = 86 + Math.floor(random() * 32);
        ctx.fillStyle = `rgb(${light + 9},${light + 9},${light})`;
        ctx.beginPath();
        ctx.roundRect(x + 2, row * 32 + 2, 59, 27, 4 + random() * 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(225,213,180,.13)';
        ctx.fillRect(x + 6, row * 32 + 3, 47, 2);
      }
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(kind === 'stone' ? 5 : 2, kind === 'stone' ? 8 : 2);
  map.anisotropy = 4;
  return map;
}

export class Materials {
  readonly timber = new THREE.MeshStandardMaterial({
    color: '#59402b',
    map: texture('wood'),
    roughness: 0.92,
  });
  readonly wood = new THREE.MeshStandardMaterial({
    color: '#b39a6c',
    map: texture('wood'),
    roughness: 0.9,
  });
  readonly stone = new THREE.MeshStandardMaterial({
    color: '#8b8b7f',
    roughness: 0.95,
    flatShading: true,
  });
  readonly stoneLight = new THREE.MeshStandardMaterial({
    color: '#b0ab96',
    roughness: 1,
    flatShading: true,
  });
  readonly rock = new THREE.MeshStandardMaterial({
    color: '#666f68',
    roughness: 1,
    flatShading: true,
  });
  readonly rockDark = new THREE.MeshStandardMaterial({
    color: '#3e4c49',
    roughness: 1,
    flatShading: true,
  });
  readonly plaster = new THREE.MeshStandardMaterial({
    color: '#d4c6a5',
    map: texture('plaster'),
    roughness: 0.97,
  });
  readonly roof = new THREE.MeshStandardMaterial({
    color: '#465c59',
    roughness: 0.9,
    flatShading: true,
  });
  readonly roofEdge = new THREE.MeshStandardMaterial({ color: '#536b65', roughness: 0.88 });
  readonly metal = new THREE.MeshStandardMaterial({
    color: '#525b58',
    metalness: 0.82,
    roughness: 0.35,
  });
  readonly iron = new THREE.MeshStandardMaterial({
    color: '#242e2c',
    metalness: 0.6,
    roughness: 0.6,
  });
  readonly brass = new THREE.MeshStandardMaterial({
    color: '#be975b',
    metalness: 0.75,
    roughness: 0.4,
  });
  readonly earth = new THREE.MeshStandardMaterial({
    color: '#b0a482',
    map: texture('earth'),
    roughness: 1,
  });
  readonly grass = new THREE.MeshStandardMaterial({ color: '#75815c', roughness: 1 });
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
  readonly cobble = new THREE.MeshStandardMaterial({ map: texture('stone'), roughness: 1 });
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
        if ('map' in value && value.map instanceof THREE.Texture) value.map.dispose();
        value.dispose();
      }
    }
  }
}

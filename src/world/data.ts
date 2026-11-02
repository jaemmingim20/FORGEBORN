import type { FixtureDefinition, Vec3, ZoneDefinition, ZoneId } from '../core/types';

export const WORLD_SEED = 7026;
export const WORLD_BOUNDS = { minX: -150, maxX: 150, minZ: -900, maxZ: 31 };
export const PLAYER_SPAWN: Vec3 = { x: 0, y: 1.05, z: 10 };

export const ZONES: readonly ZoneDefinition[] = [
  {
    id: 'counter',
    name: '카운터',
    english: 'THE COUNTER',
    description: '새로운 이야기가 찾아올 곳',
    bounds: { minX: -9, maxX: 9, minZ: 12, maxZ: 20.5 },
    map: [40, 83],
  },
  {
    id: 'forge',
    name: '대장간',
    english: 'THE FORGE',
    description: '작은 불씨에서, 장인의 이야기로',
    bounds: { minX: -9, maxX: 9, minZ: -4, maxZ: 12 },
    map: [40, 62],
  },
  {
    id: 'training',
    name: '훈련장',
    english: 'THE TRAINING GROUNDS',
    description: '언젠가 완성할 검을 위한 자리',
    bounds: { minX: 12, maxX: 29, minZ: -24, maxZ: -5 },
    map: [80, 35],
  },
  {
    id: 'mine',
    name: '광산',
    english: 'THE OLD MINE',
    description: '깊은 산 아래, 아직 쓰이지 않은 이야기',
    bounds: { minX: -140, maxX: 140, minZ: -899, maxZ: -27 },
    map: [40, 9],
  },
  {
    id: 'yard',
    name: '뒷마당',
    english: 'THE BACKYARD',
    description: '숲과 돌길이 이어지는 고요한 마당',
    bounds: WORLD_BOUNDS,
    map: [40, 35],
  },
];

export const CONNECTIONS: readonly (readonly [ZoneId, ZoneId])[] = [
  ['counter', 'forge'],
  ['forge', 'yard'],
  ['yard', 'training'],
  ['yard', 'mine'],
];

export function zoneAt(position: Vec3): ZoneDefinition {
  return (
    ZONES.find(
      ({ bounds: b }) =>
        position.x >= b.minX &&
        position.x <= b.maxX &&
        position.z >= b.minZ &&
        position.z <= b.maxZ,
    ) ?? ZONES[4]!
  );
}

export const FIXTURES: readonly FixtureDefinition[] = [
  {
    id: 'furnace-01',
    kind: 'furnace',
    zone: 'forge',
    name: '돌 용광로',
    description: '광석을 금속 재료로 제련할 첫 번째 용광로입니다.',
    phase: 3,
    position: { x: -6.3, y: 0, z: 0.1 },
  },
  {
    id: 'anvil-01',
    kind: 'anvil',
    zone: 'forge',
    name: '장인의 모루',
    description: '달궈진 금속을 두드려 무기의 형태를 잡는 곳입니다.',
    phase: 4,
    position: { x: -3.6, y: 0, z: 5.3 },
    rotation: 0.3,
  },
  {
    id: 'quench-01',
    kind: 'quench',
    zone: 'forge',
    name: '담금질 수조',
    description: '가공한 금속을 냉각하기 위한 물이 담겨 있습니다.',
    phase: 4,
    position: { x: 2.5, y: 0, z: 4.5 },
  },
  {
    id: 'workbench-01',
    kind: 'workbench',
    zone: 'forge',
    name: '무기 조립 작업대',
    description: '금속과 부품을 하나의 무기로 조립할 작업대입니다.',
    phase: 4,
    position: { x: 6.8, y: 0, z: 3 },
    rotation: -Math.PI / 2,
  },
  {
    id: 'storage-01',
    kind: 'storage',
    zone: 'forge',
    name: '재료 보관함',
    description: '채굴한 광석과 제련 재료를 보관할 공간입니다.',
    phase: 2,
    position: { x: 6.8, y: 0, z: 8.5 },
  },
  {
    id: 'rack-01',
    kind: 'rack',
    zone: 'forge',
    name: '완성품 보관대',
    description: '앞으로 제작할 장비들을 세워둘 빈 보관대입니다.',
    phase: 4,
    position: { x: -6.8, y: 0, z: 9.2 },
  },
  {
    id: 'ledger-01',
    kind: 'ledger',
    zone: 'forge',
    name: '부품 구매 장부',
    description: '손잡이와 장식 등 부품을 주문할 장부입니다.',
    phase: 4,
    position: { x: 5.1, y: 0, z: 11 },
  },
  {
    id: 'bed-01',
    kind: 'bed',
    zone: 'forge',
    name: '대장장이의 침대',
    description: '하루의 일을 마친 뒤 쉬어갈 자리입니다.',
    phase: 8,
    position: { x: 5.8, y: 0, z: -1.8 },
  },
  {
    id: 'counter-01',
    kind: 'counter',
    zone: 'counter',
    name: '손님 응대 카운터',
    description: '손님의 주문과 거래를 진행할 카운터입니다.',
    phase: 5,
    position: { x: 4.7, y: 0, z: 16 },
  },
  {
    id: 'submission-01',
    kind: 'submission',
    zone: 'counter',
    name: '무기 제출대',
    description: '완성한 장비를 손님에게 보여줄 공간입니다.',
    phase: 5,
    position: { x: 4.3, y: 0, z: 13.5 },
  },
  {
    id: 'waiting-01',
    kind: 'waiting',
    zone: 'counter',
    name: '손님 대기 공간',
    description: '손님이 도착하면 이곳에서 기다리게 됩니다.',
    phase: 5,
    position: { x: -6.4, y: 0, z: 16 },
  },
  {
    id: 'cart-01',
    kind: 'cart',
    zone: 'yard',
    name: '광석 운반 수레',
    description: '광산과 대장간을 잇는 길가의 나무 수레입니다.',
    phase: 2,
    position: { x: -7.4, y: 0, z: -11 },
    rotation: -0.4,
  },
  ...[17, 22, 27].map(
    (x, i): FixtureDefinition => ({
      id: `dummy-0${i + 1}`,
      kind: 'dummy',
      zone: 'training',
      name: `훈련 허수아비 ${i + 1}`,
      description: '제작한 무기의 공격 성능을 시험할 나무 표적입니다.',
      phase: 6,
      position: { x, y: 0, z: -19 },
    }),
  ),
  {
    id: 'shield-01',
    kind: 'shield',
    zone: 'training',
    name: '방패 시험 표적',
    description: '방패의 방어 성능을 시험할 장치입니다.',
    phase: 6,
    position: { x: 26, y: 0, z: -10 },
  },
  {
    id: 'training-panel',
    kind: 'panel',
    zone: 'training',
    name: '훈련 기록판',
    description: '추후 피해량과 훈련 결과를 표시할 기록판입니다.',
    phase: 6,
    position: { x: 14.5, y: 0, z: -8.5 },
  },
];

/** Deterministic decorations; gameplay randomness will belong to later systems. */
export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let n = Math.imul(value ^ (value >>> 15), 1 | value);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

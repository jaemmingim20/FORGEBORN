import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/EventBus';
import type { ZoneId } from '../src/core/types';
import {
  CONNECTIONS,
  FIXTURES,
  PLAYER_SPAWN,
  seededRandom,
  zoneAt,
  ZONES,
} from '../src/world/data';

describe('GDD Phase 1 월드 데이터', () => {
  it('5개 구역이 카운터에서 시작하는 하나의 연결 그래프다', () => {
    const visited = new Set<ZoneId>(['counter']);
    for (let i = 0; i < ZONES.length; i++)
      for (const [a, b] of CONNECTIONS) {
        if (visited.has(a)) visited.add(b);
        if (visited.has(b)) visited.add(a);
      }
    expect([...visited].sort()).toEqual(ZONES.map((zone) => zone.id).sort());
  });
  it('카운터/대장간 경계와 각 탐방 목적지를 정확히 판별한다', () => {
    expect(zoneAt(PLAYER_SPAWN).id).toBe('forge');
    expect(zoneAt({ x: 0, y: 1, z: 17 }).id).toBe('counter');
    expect(zoneAt({ x: 0, y: 1, z: 11.99 }).id).toBe('forge');
    expect(zoneAt({ x: 0, y: 1, z: -13 }).id).toBe('yard');
    expect(zoneAt({ x: 20, y: 1, z: -13 }).id).toBe('training');
    expect(zoneAt({ x: 0, y: 1, z: -34 }).id).toBe('mine');
  });
  it('설비의 ID는 고유하며 시작 용광로 1개와 허수아비 3개를 갖는다', () => {
    expect(new Set(FIXTURES.map((fixture) => fixture.id)).size).toBe(FIXTURES.length);
    expect(FIXTURES.filter((fixture) => fixture.kind === 'furnace')).toHaveLength(1);
    expect(FIXTURES.filter((fixture) => fixture.kind === 'dummy')).toHaveLength(3);
    for (const fixture of FIXTURES) {
      expect(zoneAt(fixture.position).id).toBe(fixture.zone);
      expect(fixture.phase).toBeGreaterThan(1);
    }
  });
  it('같은 시드의 장식 배치가 실행마다 동일하다', () => {
    const a = seededRandom(7026);
    const b = seededRandom(7026);
    expect(Array.from({ length: 100 }, a)).toEqual(Array.from({ length: 100 }, b));
  });
});

describe('시스템 이벤트 계약', () => {
  it('구독 해제 후 더는 알리지 않으며 해제는 다른 구독자에 영향이 없다', () => {
    const events = new EventBus();
    const a: string[] = [];
    const b: string[] = [];
    const unsubscribe = events.on('stateChanged', (value) => a.push(value));
    events.on('stateChanged', (value) => b.push(value));
    events.emit('stateChanged', 'playing');
    unsubscribe();
    events.emit('stateChanged', 'paused');
    expect(a).toEqual(['playing']);
    expect(b).toEqual(['playing', 'paused']);
    events.dispose();
    events.emit('stateChanged', 'playing');
    expect(b).toHaveLength(2);
  });
});

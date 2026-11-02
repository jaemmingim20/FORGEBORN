import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MovementIntent, Vec3 } from '../src/core/types';
import { FIXED_STEP, PhysicsWorld } from '../src/physics/PhysicsWorld';
import { CAPSULE_HEIGHT, PlayerMotor } from '../src/physics/PlayerMotor';

const idle: MovementIntent = { forward: 0, right: 0, yaw: 0, sprint: false, jump: false };
let physics: PhysicsWorld;
let motor: PlayerMotor;

function advance(frames: number, intent: Partial<MovementIntent> = {}): Vec3 {
  for (let i = 0; i < frames; i++) {
    motor.update({ ...idle, ...intent });
    physics.step();
  }
  return { ...motor.position };
}

beforeEach(async () => {
  physics = await PhysicsWorld.create();
  physics.addGround(0);
  motor = new PlayerMotor(physics, { x: 0, y: 2, z: 0 });
  physics.step();
  advance(90);
});
afterEach(() => {
  motor.dispose();
  physics.dispose();
});

describe('실제 Rapier 캐릭터 컨트롤러', () => {
  it('중력으로 내려오고 바닥 위에서 안정적으로 멈춘다', () => {
    expect(motor.grounded).toBe(true);
    expect(motor.position.y).toBeCloseTo(CAPSULE_HEIGHT + 0.015, 2);
    const settled = motor.position.y;
    advance(600);
    expect(motor.position.y).toBeCloseTo(settled, 4);
  });

  it('GDD 기본 속도 4.5m/s를 적용한다', () => {
    const start = motor.position.z;
    advance(60, { forward: 1 });
    expect(start - motor.position.z).toBeCloseTo(4.5, 2);
  });

  it('달리기 속도는 6.5m/s이고 역방향/좌우 이동도 가능하다', () => {
    const start = { ...motor.position };
    advance(60, { forward: -1, sprint: true });
    expect(motor.position.z - start.z).toBeCloseTo(6.5, 2);
    advance(60, { right: -1 });
    expect(motor.position.x - start.x).toBeCloseTo(-4.5, 2);
  });

  it('대각선 이동이 직진보다 빠르지 않다', () => {
    const start = { ...motor.position };
    advance(60, { forward: 1, right: 1 });
    expect(Math.hypot(motor.position.x - start.x, motor.position.z - start.z)).toBeCloseTo(4.5, 2);
  });

  it('시점의 yaw를 기준으로 이동한다', () => {
    advance(60, { forward: 1, yaw: Math.PI / 2 });
    expect(motor.position.x).toBeCloseTo(-4.5, 2);
    expect(motor.position.z).toBeCloseTo(0, 3);
  });

  it('점프 후 착지하고 공중 점프 요청이 추가 상승을 만들지 않는다', () => {
    const floor = motor.position.y;
    advance(1, { jump: true });
    expect(motor.grounded).toBe(false);
    advance(14);
    advance(1, { jump: true });
    let peak = motor.position.y;
    for (let i = 0; i < 20; i++) {
      advance(1);
      peak = Math.max(peak, motor.position.y);
    }
    expect(peak - floor).toBeGreaterThan(0.8);
    expect(peak - floor).toBeLessThan(1.1);
    advance(80);
    expect(motor.grounded).toBe(true);
    expect(motor.position.y).toBeCloseTo(floor, 2);
  });

  it('달리기로 얇은 벽을 밀어도 관통하지 않는다', () => {
    physics.addBox({ center: { x: 2.5, y: 2, z: 0 }, size: { x: 0.2, y: 4, z: 20 } });
    physics.step();
    advance(240, { right: 1, sprint: true });
    expect(motor.position.x).toBeLessThan(2.1);
    expect(motor.position.x).toBeGreaterThan(1.9);
    expect(motor.grounded).toBe(true);
  });

  it('벽에 대각선으로 접근하면 벽을 따라 미끄러진다', () => {
    physics.addBox({ center: { x: 2, y: 2, z: 0 }, size: { x: 0.3, y: 4, z: 30 } });
    physics.step();
    advance(180, { forward: 1, right: 1 });
    expect(motor.position.x).toBeLessThan(1.55);
    expect(motor.position.z).toBeLessThan(-8);
  });

  it('점프로 낮은 천장을 통과하지 않는다', () => {
    physics.addBox({ center: { x: 0, y: 2.2, z: 0 }, size: { x: 6, y: 0.2, z: 6 } });
    physics.step();
    advance(1, { jump: true });
    let peak = motor.position.y;
    for (let i = 0; i < 60; i++) {
      advance(1);
      peak = Math.max(peak, motor.position.y);
    }
    expect(peak + CAPSULE_HEIGHT).toBeLessThan(2.11);
    expect(motor.grounded).toBe(true);
  });

  it('0.2m 턱은 자동으로 넘고 통로 끝까지 전진한다', () => {
    physics.addBox({ center: { x: 0, y: 0.1, z: -2 }, size: { x: 4, y: 0.2, z: 1 } });
    physics.step();
    advance(100, { forward: 1 });
    expect(motor.position.z).toBeLessThan(-6);
    expect(motor.grounded).toBe(true);
  });

  it('기울어진 지붕 아래에서도 점프가 차단된다', () => {
    const angle = 0.15;
    physics.addBox({
      center: { x: 0, y: 2.3, z: 0 },
      size: { x: 6, y: 0.2, z: 6 },
      quaternion: { x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) },
    });
    physics.step();
    advance(1, { jump: true });
    let peak = motor.position.y;
    for (let i = 0; i < 70; i++) {
      advance(1);
      peak = Math.max(peak, motor.position.y);
    }
    expect(peak + CAPSULE_HEIGHT).toBeLessThan(2.3);
    expect(motor.grounded).toBe(true);
  });

  it('복귀 시 수직 속도와 점프 버퍼를 초기화한다', () => {
    advance(1, { jump: true });
    motor.teleport({ x: 3, y: 2, z: 3 });
    expect(motor.position.x).toBe(3);
    advance(Math.round(2 / FIXED_STEP));
    expect(motor.grounded).toBe(true);
    expect(motor.position.y).toBeCloseTo(CAPSULE_HEIGHT + 0.015, 2);
  });
});

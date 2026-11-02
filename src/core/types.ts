export type Vec3 = Readonly<{ x: number; y: number; z: number }>;
export type ZoneId = 'counter' | 'forge' | 'yard' | 'training' | 'mine';
export type GameState = 'ready' | 'playing' | 'paused';

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ZoneDefinition {
  id: ZoneId;
  name: string;
  english: string;
  description: string;
  bounds: Bounds;
  map: readonly [number, number];
}

export type ModelKind =
  | 'furnace'
  | 'anvil'
  | 'quench'
  | 'workbench'
  | 'storage'
  | 'rack'
  | 'ledger'
  | 'bed'
  | 'counter'
  | 'submission'
  | 'waiting'
  | 'cart'
  | 'dummy'
  | 'shield'
  | 'panel';

export interface FixtureDefinition {
  id: string;
  kind: ModelKind;
  zone: ZoneId;
  name: string;
  description: string;
  phase: number;
  position: Vec3;
  rotation?: number;
}

export interface BoxColliderSpec {
  center: Vec3;
  size: Vec3;
  rotation?: number;
  quaternion?: Readonly<{ x: number; y: number; z: number; w: number }>;
  fixtureId?: string;
}

export interface MovementIntent {
  forward: number;
  right: number;
  sprint: boolean;
  jump: boolean;
  yaw: number;
}

export interface GameEvents {
  stateChanged: GameState;
  zoneChanged: ZoneDefinition;
  targetChanged: FixtureDefinition | null;
  controlError: string;
}

export interface Disposable {
  dispose(): void;
}

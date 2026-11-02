import type { GameEvents } from './types';

export class EventBus {
  private readonly listeners = new Map<keyof GameEvents, Set<(value: never) => void>>();

  on<K extends keyof GameEvents>(event: K, listener: (value: GameEvents[K]) => void): () => void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener as (value: never) => void);
    this.listeners.set(event, listeners);
    return () => listeners.delete(listener as (value: never) => void);
  }

  emit<K extends keyof GameEvents>(event: K, value: GameEvents[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(value as never));
  }

  dispose(): void {
    this.listeners.clear();
  }
}

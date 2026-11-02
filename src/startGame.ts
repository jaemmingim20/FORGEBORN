import './ui/fonts.css';
import './ui/styles.css';
import { GameManager } from './core/GameManager';

export function startGame(
  app: HTMLElement,
  onError: (error: unknown) => void,
  onProgress: (message: string) => void,
): Promise<GameManager> {
  return GameManager.create(app, onError, onProgress);
}

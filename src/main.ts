import type { GameManager } from './core/GameManager';

const app = document.querySelector<HTMLElement>('#app')!;
let game: GameManager | undefined;

function progress(message: string): void {
  const label = document.querySelector('#boot-message');
  if (label) label.textContent = message;
}

function showError(error: unknown): void {
  console.error('[FORGEBORN] 부팅 또는 렌더링 실패:', error);
  game?.dispose();
  app.replaceChildren();
  const panel = document.createElement('div');
  panel.id = 'boot';
  panel.innerHTML =
    '<div class="fatal-error"><h1 style="font-size:38px">FORGEBORN</h1><h2>대장간을 열지 못했습니다.</h2><p>WebGL 2와 WebAssembly를 지원하는 PC 브라우저가 필요합니다. 하드웨어 가속 설정과 네트워크를 확인한 뒤 다시 시도해 주세요.</p><p class="error-detail"></p><button type="button">다시 시도</button></div>';
  panel.querySelector('.error-detail')!.textContent =
    error instanceof Error ? error.message : '알 수 없는 초기화 오류';
  panel.querySelector('button')!.addEventListener('click', () => location.reload());
  app.append(panel);
}

try {
  progress('게임 파일을 불러오는 중…');
  // Loading dependencies inside the error boundary also catches failed engine/CSS chunk requests.
  const { startGame } = await import('./startGame');
  game = await startGame(app, showError, progress);
  document.querySelector('#boot')?.remove();
} catch (error) {
  showError(error);
}

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    game?.dispose();
  });

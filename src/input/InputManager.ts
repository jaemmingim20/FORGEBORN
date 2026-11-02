import { EventBus } from '../core/EventBus';

export class InputManager {
  private readonly abort = new AbortController();
  private readonly keys = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;
  private jumpPressed = false;
  sensitivity = 0.002;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly events: EventBus,
    onLock: (locked: boolean) => void,
    onMap: () => void,
    actions: { inventory?(): boolean; equip?(): void; attack?(): void } = {},
  ) {
    const options = { signal: this.abort.signal };
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.code === 'Tab' && !event.repeat && actions.inventory?.()) {
          event.preventDefault();
          return;
        }
        if (event.code === 'Escape' && !this.locked) {
          actions.inventory?.();
          return;
        }
        if (!this.locked) return;
        if (event.code === 'Digit3' && !event.repeat) actions.equip?.();
        if (event.code === 'Escape') {
          document.exitPointerLock();
          return;
        }
        if (['Space', 'Tab', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyG'].includes(event.code))
          event.preventDefault();
        if (event.code === 'Space' && !event.repeat) this.jumpPressed = true;
        if (event.code === 'KeyG' && !event.repeat) onMap();
        this.keys.add(event.code);
      },
      options,
    );
    document.addEventListener(
      'keyup',
      (event) => {
        this.keys.delete(event.code);
      },
      options,
    );
    document.addEventListener(
      'mousedown',
      (event) => {
        if (this.locked && event.button === 0) actions.attack?.();
      },
      options,
    );
    document.addEventListener(
      'mousemove',
      (event) => {
        if (!this.locked) return;
        this.mouseX += event.movementX;
        this.mouseY += event.movementY;
      },
      options,
    );
    document.addEventListener(
      'pointerlockchange',
      () => {
        this.clear();
        onLock(this.locked);
      },
      options,
    );
    document.addEventListener(
      'pointerlockerror',
      () => {
        events.emit(
          'controlError',
          '마우스 잠금을 허용하지 못했습니다. 게임 시작 버튼을 다시 누르거나 브라우저 권한을 확인해 주세요.',
        );
      },
      options,
    );
    const pause = (): void => {
      this.clear();
      if (this.locked) document.exitPointerLock();
      onLock(false);
    };
    window.addEventListener('blur', pause, options);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) pause();
      },
      options,
    );
  }

  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  async requestLock(): Promise<void> {
    try {
      await this.canvas.requestPointerLock();
    } catch {
      this.events.emit(
        'controlError',
        '마우스 잠금을 시작하지 못했습니다. 잠시 후 버튼을 다시 눌러 주세요.',
      );
    }
  }

  axis(positive: string, negative: string): number {
    return Number(this.keys.has(positive)) - Number(this.keys.has(negative));
  }
  get sprint(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }
  consumeJump(): boolean {
    const jump = this.jumpPressed;
    this.jumpPressed = false;
    return jump;
  }

  consumeLook(): { x: number; y: number } {
    const look = { x: this.mouseX, y: this.mouseY };
    this.mouseX = this.mouseY = 0;
    return look;
  }

  clear(): void {
    this.keys.clear();
    this.mouseX = this.mouseY = 0;
    this.jumpPressed = false;
  }

  dispose(): void {
    if (this.locked) document.exitPointerLock();
    this.abort.abort();
    this.clear();
  }
}

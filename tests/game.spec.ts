import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { DebugSnapshot } from '../src/core/GameManager';

const snapshot = (page: Page): Promise<DebugSnapshot> =>
  page.evaluate(() => window.__forgeDebug!.snapshot());

async function start(page: Page): Promise<void> {
  await page.goto('/?debug');
  await expect(page.locator('#boot')).toHaveCount(0);
  await page.getByRole('button', { name: '대장간에 들어가기' }).click();
  await expect.poll(async () => (await snapshot(page)).state).toBe('playing');
  await expect.poll(async () => (await snapshot(page)).grounded).toBe(true);
}

/** Actual keyboard-driven traversal, reading coordinates only to release keys on arrival. */
async function walkTo(page: Page, x: number, z: number): Promise<void> {
  const startPosition = (await snapshot(page)).position;
  const yaw = Math.atan2(-(x - startPosition.x), -(z - startPosition.z));
  await page.evaluate((angle) => window.__forgeDebug!.look(angle), yaw);
  await page.keyboard.down('KeyW');
  try {
    await expect
      .poll(
        async () => {
          const p = (await snapshot(page)).position;
          return Math.hypot(p.x - x, p.z - z);
        },
        { timeout: 22000, intervals: [25, 50, 75] },
      )
      .toBeLessThan(0.55);
  } finally {
    await page.keyboard.up('KeyW');
  }
}

test('WebGL/WASM 로드, 마우스 잠금, 점프, 일시정지와 반응형 화면', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?debug');
  await expect(page.getByRole('button', { name: '대장간에 들어가기' })).toBeVisible();
  await page.screenshot({ path: 'test-results/title.png' });
  await page.getByRole('button', { name: '대장간에 들어가기' }).click();
  await expect.poll(async () => (await snapshot(page)).grounded).toBe(true);
  expect(await page.evaluate(() => document.pointerLockElement?.id)).toBe('game-canvas');
  const beforeLook = await snapshot(page);
  await page.mouse.move(720, 450);
  await page.mouse.move(800, 480);
  await expect
    .poll(async () => Math.abs((await snapshot(page)).yaw - beforeLook.yaw))
    .toBeGreaterThan(0.05);
  const beforeJump = (await snapshot(page)).position.y;
  await page.keyboard.press('Space');
  await expect
    .poll(async () => (await snapshot(page)).position.y)
    .toBeGreaterThan(beforeJump + 0.35);
  await expect.poll(async () => (await snapshot(page)).grounded).toBe(true);
  await page.keyboard.press('KeyG');
  await expect(page.locator('.world-map')).toBeVisible();
  await page.screenshot({ path: 'test-results/forge.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '탐방 계속하기' })).toBeVisible();
  const paused = (await snapshot(page)).position;
  await page.keyboard.press('KeyW');
  await page.waitForTimeout(300);
  await expect.poll(async () => (await snapshot(page)).position).toEqual(paused);
  await page.setViewportSize({ width: 960, height: 600 });
  await expect
    .poll(async () => (await page.locator('#game-canvas').boundingBox())?.width)
    .toBe(960);
  await expect
    .poll(async () => (await page.locator('#game-canvas').boundingBox())?.height)
    .toBe(600);
  await page.locator('#sensitivity').fill('1.5');
  await expect(page.locator('#sensitivity-value')).toHaveText('1.5');
  await page.getByRole('button', { name: '탐방 계속하기' }).click();
  await expect.poll(async () => (await snapshot(page)).state).toBe('playing');
  expect(errors).toEqual([]);
  expect((await snapshot(page)).draws).toBeGreaterThan(0);
  expect((await snapshot(page)).draws).toBeLessThan(100);
});

test('실제 키 입력으로 카운터↔대장간↔뒷마당↔훈련장↔광산 입구 왕복', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await start(page);
  await walkTo(page, 0, 17);
  expect((await snapshot(page)).zone).toBe('counter');
  await walkTo(page, 0, 7);
  expect((await snapshot(page)).zone).toBe('forge');
  await walkTo(page, 0, -13.5);
  expect((await snapshot(page)).zone).toBe('yard');
  await page.screenshot({ path: 'test-results/yard.png' });
  await walkTo(page, 19, -13.5);
  expect((await snapshot(page)).zone).toBe('training');
  await page.evaluate(() => window.__forgeDebug!.look(0, -0.04));
  await page.screenshot({ path: 'test-results/training.png' });
  await walkTo(page, 0, -13.5);
  await walkTo(page, 0, -35);
  expect((await snapshot(page)).zone).toBe('mine');
  await page.screenshot({ path: 'test-results/mine.png' });
  await walkTo(page, 0, -13.5);
  await walkTo(page, 0, 7);
  expect((await snapshot(page)).zone).toBe('forge');
  await expect(page.locator('#visited-count')).toHaveText('5');
  expect(errors).toEqual([]);
});

test('월드 설비 충돌·시선 안내와 광산 끝 폐쇄벽', async ({ page }) => {
  await start(page);
  const fixtures = await page.evaluate(() => window.__forgeDebug!.fixtureIds());
  expect(fixtures).toHaveLength(17);
  await page.evaluate(() => {
    window.__forgeDebug!.teleport({ x: -6.3, y: 1, z: 4 });
    window.__forgeDebug!.look(0, -0.1);
  });
  await expect(page.locator('.fixture-tooltip h3')).toHaveText('돌 용광로');
  await page.screenshot({ path: 'test-results/furnace.png' });
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await snapshot(page)).position.z).toBeLessThan(1.75);
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyW');
  expect((await snapshot(page)).position.z).toBeGreaterThan(1.55);
  await page.evaluate(() => {
    window.__forgeDebug!.teleport({ x: 0, y: 1, z: -40 });
    window.__forgeDebug!.look(0);
  });
  await page.keyboard.down('KeyW');
  await expect.poll(async () => (await snapshot(page)).position.z).toBeLessThan(-41.6);
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyW');
  const end = await snapshot(page);
  expect(end.position.z).toBeGreaterThan(-41.8);
  expect(end.position.z).toBeLessThan(-41.3);
  expect(end.position.y).toBeGreaterThan(0.8);
});

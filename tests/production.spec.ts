import { expect, test } from '@playwright/test';

test('프로덕션 정적 번들에서 WebGL·Rapier 실행과 개발 전용 훅 제외', async ({ page }) => {
  const errors: string[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/?debug');
  await expect(page.locator('#boot')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '대장간에 들어가기' })).toBeVisible();
  expect(await page.evaluate(() => typeof window.__forgeDebug)).toBe('undefined');
  await page.getByRole('button', { name: '대장간에 들어가기' }).click();
  await expect(page.locator('.hud')).toBeVisible();
  await expect(page.locator('#zone-name')).toHaveText('대장간');
  await page.keyboard.down('KeyW');
  try {
    await expect(page.locator('#zone-name')).toHaveText('뒷마당', { timeout: 40000 });
  } finally {
    await page.keyboard.up('KeyW');
  }
  await page.screenshot({ path: 'test-results/production.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '탐방 계속하기' })).toBeVisible();
  expect(errors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

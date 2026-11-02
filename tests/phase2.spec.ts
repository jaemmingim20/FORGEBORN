import { expect, test } from '@playwright/test';

test('짧은 Phase 2 확인: 철광석 타격·수집·인벤토리·입구 통과·대장간 복귀', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/?debug');
  await page.getByRole('button', { name: '대장간에 들어가기' }).click();
  await expect.poll(() => page.evaluate(() => window.__forgeDebug!.snapshot().grounded)).toBe(true);
  await page.evaluate(() => {
    window.__forgeDebug!.teleport({ x: 0, y: 1, z: -37.9 });
    window.__forgeDebug!.look(Math.atan2(2.25, 1.1), -0.24);
  });
  await expect(page.locator('.ore-target h3')).toHaveText('철광석');
  await page.screenshot({ path: 'test-results/phase2-mine.png' });
  for (const remaining of [2, 1, 0]) {
    await expect(async () => {
      await page.mouse.down();
      await page.mouse.up();
      expect(
        await page.evaluate(() => window.__forgeDebug!.miningSnapshot().veins[0]!.remaining),
      ).toBe(remaining);
    }).toPass({ timeout: 10000, intervals: [300] });
  }
  const collected = await page.evaluate(() =>
    window
      .__forgeDebug!.miningSnapshot()
      .inventory.slots.filter((s) => s.item === 'iron')
      .reduce((n, s) => n + s.quantity, 0),
  );
  expect(collected).toBeGreaterThanOrEqual(2);
  expect(collected).toBeLessThanOrEqual(5);
  await expect(page.locator('.ore-target')).toBeHidden();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog', { name: '인벤토리' })).toBeVisible();
  expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
  await expect(page.locator('[data-item="iron"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/phase2-inventory.png' });
  await page.getByRole('button', { name: '장착 해제', exact: true }).click();
  await expect(page.getByRole('button', { name: '장착하기', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '장착하기', exact: true }).click();
  await page.keyboard.press('Tab');
  await expect
    .poll(() => page.evaluate(() => window.__forgeDebug!.snapshot().state))
    .toBe('playing');
  await page.evaluate(() => {
    window.__forgeDebug!.teleport({ x: 0, y: 1, z: -40 });
    window.__forgeDebug!.look(0);
  });
  await page.keyboard.down('KeyW');
  try {
    await expect
      .poll(() => page.evaluate(() => window.__forgeDebug!.snapshot().position.z))
      .toBeLessThan(-44);
  } finally {
    await page.keyboard.up('KeyW');
  }
  await page.evaluate(() => window.__forgeDebug!.teleport({ x: 0, y: 1, z: 7 }));
  await expect(page.locator('.objective-text')).toContainText('첫 채굴 완료');
  expect(
    await page.evaluate(() =>
      window
        .__forgeDebug!.miningSnapshot()
        .inventory.slots.filter((s) => s.item === 'iron')
        .reduce((n, s) => n + s.quantity, 0),
    ),
  ).toBe(collected);
  expect(errors).toEqual([]);
});

test('Go Live용 정적 실행본에서도 곡괭이·인벤토리가 열린다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Serve the already-built single HTML, without Vite module transformation.
  const { readFile } = await import('node:fs/promises');
  const html = await readFile('standalone/index.html', 'utf8');
  await page.route('**/phase2-standalone.html', (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  );
  await page.goto('/phase2-standalone.html');
  await page.getByRole('button', { name: '대장간에 들어가기' }).click();
  await expect(page.locator('.mining-hud')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog', { name: '인벤토리' })).toBeVisible();
  await expect(page.locator('[data-item="worn-pickaxe"]')).toBeVisible();
  expect(errors).toEqual([]);
});

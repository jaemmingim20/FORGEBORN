import { expect, test } from '@playwright/test';
import { MINE_LAYOUT, cellPosition } from '../src/world/mineLayout';

test('짧은 Phase 3: E 제련·차감·진행·완료·강철·분기 통과·지하 지도', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/?debug');
  await page.getByRole('button', { name: '대장간에 들어가기' }).click();
  await expect.poll(() => page.evaluate(() => window.__forgeDebug!.snapshot().grounded)).toBe(true);
  await page.evaluate(() => {
    window.__forgeDebug!.giveItem('iron', 2);
    window.__forgeDebug!.giveItem('coal', 1);
    window.__forgeDebug!.teleport({ x: -6.3, y: 1, z: 3.6 });
    window.__forgeDebug!.look(0, -0.1);
  });
  await expect(page.locator('.fixture-tooltip small')).toContainText('E · 용광로');
  await page.keyboard.press('KeyE');
  await expect(page.getByRole('dialog', { name: '용광로 제련' })).toBeVisible();
  await page.getByRole('button', { name: '철 제련 시작', exact: true }).click();
  await expect(page.locator('.smelt-job[data-state="processing"]')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__forgeDebug!.smeltingSnapshot()[0]!.jobs[0]!.remaining))
    .toBeLessThan(12);
  expect(
    await page.evaluate(
      () =>
        window.__forgeDebug!.miningSnapshot().inventory.slots.find((s) => s.item === 'iron')!
          .quantity,
    ),
  ).toBe(1);
  await page.screenshot({ path: 'test-results/phase3-smelting.png' });
  await page.evaluate(() => window.__forgeDebug!.stepSmelting(12.01));
  await expect(page.locator('.smelt-job[data-state="complete"]')).toBeVisible();
  await page.getByRole('button', { name: '강철 합금 시작', exact: true }).click();
  await page.evaluate(() => window.__forgeDebug!.stepSmelting(12.01));
  await page.getByRole('button', { name: '닫기 · Esc', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__forgeDebug!.snapshot().state))
    .toBe('playing');
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-item="steel-ingot"]')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect
    .poll(() => page.evaluate(() => window.__forgeDebug!.snapshot().state))
    .toBe('playing');
  const branch = [...MINE_LAYOUT.values()].find(
    (c) => c.distance < 200 && c.parent && MINE_LAYOUT.get(c.parent)!.x !== c.x,
  )!;
  const parent = MINE_LAYOUT.get(branch.parent!)!;
  const a = cellPosition(parent),
    b = cellPosition(branch);
  await page.evaluate(
    ({ a, b }) => {
      window.__forgeDebug!.teleport({ ...a, y: 1 });
      window.__forgeDebug!.look(b.x > a.x ? -Math.PI / 2 : Math.PI / 2);
    },
    { a, b },
  );
  await page.keyboard.down('KeyW');
  try {
    await expect
      .poll(
        async () =>
          ((await page.evaluate(() => window.__forgeDebug!.snapshot().position.x)) - a.x) *
          Math.sign(b.x - a.x),
      )
      .toBeGreaterThan(8);
  } finally {
    await page.keyboard.up('KeyW');
  }
  await page.keyboard.press('KeyG');
  await expect(page.locator('.underground-map')).toBeVisible();
  await expect(page.locator('.mine-depth small')).toContainText('출구 방향');
  await page.screenshot({ path: 'test-results/phase3-mine.png' });
  expect(errors).toEqual([]);
});

test('Go Live 실행본에서 Phase 3 용광로 안내와 인벤토리 시작', async ({ page }) => {
  const { readFile } = await import('node:fs/promises');
  const html = await readFile('standalone/index.html', 'utf8');
  await page.route('**/phase3-standalone.html', (r) =>
    r.fulfill({ contentType: 'text/html', body: html }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/phase3-standalone.html');
  await page.getByRole('button', { name: '대장간에 들어가기' }).click();
  await expect(page.locator('.mining-hud')).toBeVisible();
  await expect(page.locator('.phase-badge')).toContainText('PHASE 03');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog', { name: '인벤토리' })).toBeVisible();
  expect(errors).toEqual([]);
});

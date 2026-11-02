import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import path from 'node:path';
import { expect, test } from '@playwright/test';

let server: Server;
let deliveryURL: string;

test.beforeAll(async () => {
  // Intentionally expose no root /assets route. This reproduces a prefixed preview host.
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://local').pathname;
    const prefix = '/nested/forgeborn/';
    let file: string;
    if (pathname === '/share/game.html') file = path.resolve('standalone/index.html');
    else if (pathname.startsWith(prefix)) {
      const relative = pathname.slice(prefix.length) || 'index.html';
      file = path.resolve('dist', relative);
      if (!file.startsWith(path.resolve('dist') + path.sep)) {
        response.writeHead(403).end();
        return;
      }
    } else {
      response.writeHead(404).end('This preview serves only its own files.');
      return;
    }
    try {
      const content = await readFile(file);
      const mime: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.woff2': 'font/woff2',
        '.svg': 'image/svg+xml',
      };
      response
        .writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' })
        .end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test preview did not start.');
  deliveryURL = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
});

test('하위 경로 미리보기에서 모든 게임 에셋이 올바른 위치로 로드된다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(`${deliveryURL}/nested/forgeborn/`);
  await expect(page.getByRole('button', { name: '대장간에 들어가기' })).toBeVisible();
  await expect(page.locator('#boot')).toHaveCount(0);
  await page.getByRole('button', { name: '대장간에 들어가기' }).click();
  await expect(page.locator('.hud')).toBeVisible();
  expect(errors).toEqual([]);
});

test('단일 HTML 미리보기는 추가 파일 요청 없이 로딩·이동·일시정지된다', async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.url().startsWith('http')) requests.push(request.url());
  });
  const url = `${deliveryURL}/share/game.html`;
  await page.goto(url);
  await expect(page.getByRole('button', { name: '대장간에 들어가기' })).toBeVisible();
  await expect(page.locator('#boot')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/standalone-title.png' });
  await page.getByRole('button', { name: '대장간에 들어가기' }).click();
  await expect(page.locator('.hud')).toBeVisible();
  await expect(page.locator('#zone-name')).toHaveText('대장간');
  await page.keyboard.down('KeyW');
  try {
    await expect(page.locator('#zone-name')).toHaveText('뒷마당', { timeout: 40000 });
  } finally {
    await page.keyboard.up('KeyW');
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '탐방 계속하기' })).toBeVisible();
  expect(requests).toEqual([url]);
  expect(errors).toEqual([]);
});

test('첫 스크립트가 차단되어도 로딩 문구 대신 실행 안내를 표시한다', async ({ page }) => {
  await page.route('**/src/main.ts*', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#boot-message')).toHaveText('게임 파일을 불러오지 못했습니다.');
  await expect(page.locator('#boot-help')).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
});

test('프로덕션의 첫 스크립트 실패도 HTML 자체에서 안내한다', async ({ page }) => {
  await page.route('**/assets/index-*.js', (route) => route.abort());
  await page.goto(`${deliveryURL}/nested/forgeborn/`);
  await expect(page.locator('#boot-message')).toHaveText('게임 파일을 불러오지 못했습니다.');
  await expect(page.locator('#boot-help')).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
});

test('게임 모듈 로드 실패를 표시하고 다시 시도하면 복구한다', async ({ page }) => {
  await page.route('**/src/startGame.ts*', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '대장간을 열지 못했습니다.' })).toBeVisible();
  await page.unroute('**/src/startGame.ts*');
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('button', { name: '대장간에 들어가기' })).toBeVisible();
});

test('WASM 초기화 실패는 무한 로딩으로 남지 않는다', async ({ page }) => {
  await page.addInitScript(() => {
    WebAssembly.instantiate = (): Promise<never> =>
      Promise.reject(new Error('WASM initialization blocked for regression test'));
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '대장간을 열지 못했습니다.' })).toBeVisible();
  await expect(page.locator('.error-detail')).toContainText('WASM initialization blocked');
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
});

test('끝나지 않는 초기화에도 지연 안내와 재시도를 제공한다', async ({ page }) => {
  await page.clock.install();
  await page.route('**/src/startGame.ts*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'export function startGame(){document.getElementById("boot-message").textContent="TEST_PENDING";return new Promise(()=>{});}',
    }),
  );
  await page.goto('/');
  await expect(page.locator('#boot-message')).toHaveText('TEST_PENDING');
  await page.clock.fastForward(15001);
  await expect(page.locator('#boot-detail')).toContainText('초기화가 지연되고 있습니다.');
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
});

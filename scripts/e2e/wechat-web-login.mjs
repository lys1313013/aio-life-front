// 本地真实 Web 页面 + 精确范围模拟接口，不调用微信或业务服务器。
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import QRCode from '../../apps/web-antd/node_modules/qrcode/lib/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.join(root, 'node_modules/.cache/wechat-web-login');
await mkdir(output, { recursive: true });
const port = 5688;
const origin = `http://127.0.0.1:${port}`;
const server = spawn('pnpm', ['--filter', '@vben/web-antd', 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
const fixtureQr = await QRCode.toDataURL('AIO LIFE TEST FIXTURE - NOT A LOGIN CODE', { width: 280, margin: 2 });
let logs = '';
server.stdout.on('data', chunk => { logs += chunk; });
server.stderr.on('data', chunk => { logs += chunk; });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 180; i++) {
    if (server.exitCode != null) throw new Error(logs);
    try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, logs);
  browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
  for (const width of [390, 768, 1440]) {
    for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme });
      const page = await context.newPage();
      let state = 'WAITING', created = 0, exchanged = 0;
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route(/\/api\/auth\/wechat\/web\/(capabilities|create|status|exchange|revoke)$/, async route => {
        const operation = new URL(route.request().url()).pathname.split('/').at(-1);
        let data;
        if (operation === 'capabilities') data = { enabled: true };
        if (operation === 'create') {
          created++;
          data = { scene: 'a'.repeat(32), browserSecret: 'b'.repeat(64), expiresIn: 300,
            // 仅为布局占位，模拟码不能用于登录。
            qrCode: fixtureQr };
        }
        if (operation === 'status') {
          assert.deepEqual(route.request().postDataJSON(), { scene: 'a'.repeat(32), browserSecret: 'b'.repeat(64) });
          data = { status: state };
        }
        if (operation === 'exchange') { exchanged++; return route.fulfill({ status: 400, json: { code: 100400, message: '模拟兑换失败，请重新扫码' } }); }
        await route.fulfill({ json: { code: 0, data } });
      });
      await page.goto(origin + '/auth/login');
      await page.getByText('扫码登录', { exact: true }).click();
      await page.getByAltText('微信登录小程序码').waitFor();
      // 明确切换根主题，独立验证深浅色，避免持久化偏好影响截图。
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), colorScheme === 'dark');
      await page.screenshot({ path: path.join(output, `web-${width}-${colorScheme}.png`), fullPage: true });
      state = 'SCANNED';
      await page.getByText('已扫码，请在小程序确认', { exact: true }).waitFor();
      assert.equal(exchanged, 0);
      state = width === 768 ? 'CANCELLED' : 'CONFIRMED';
      await page.getByText(width === 768 ? '已取消登录' : '连接失败，请重试', { exact: true }).waitFor();
      assert.equal(exchanged, width === 768 ? 0 : 1);
      state = 'EXPIRED';
      await page.getByRole('button', { name: '刷新二维码' }).click();
      await page.getByText('二维码已过期', { exact: true }).waitFor();
      assert.equal(created, 2);
      assert.deepEqual(errors, []);
      console.log(`Web 扫码、确认/取消、失败恢复、过期 ${width}px ${colorScheme}: passed`);
      await context.close();
    }
  }
} finally {
  if (browser) await browser.close();
  try { process.kill(-server.pid, 'SIGTERM'); } catch { /* 已退出。 */ }
  await writeFile(path.join(output, 'server.log'), logs);
}

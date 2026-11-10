import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

import { chromium, expect } from '@playwright/test';

const origin = process.env.API_KEYS_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/api-keys';
await mkdir(output, { recursive: true });
const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let rows = [
    {
      id: '9007199254740993',
      remark: '模拟 MCP 客户端',
      apiKey: 'ak-synth***6789',
      expiredAt: null,
      createTime: '2026-11-10 10:00:00',
      isExpired: false,
    },
  ];
  let reads = 0;
  let failSave = false;
  let failDelete = false;
  const writes = [];
  const secret = 'ak-synthetic-new-key-123456789';
  const fixtures = {
    '/auth/login': { accessToken: 'synthetic-api-keys-token' },
    '/user/info': {
      id: '7',
      userId: '7',
      username: 'fixture',
      realName: '模拟用户',
      roles: ['admin'],
      homePath: '/mcp/api-keys',
    },
    '/auth/codes': ['admin'],
    '/menu/all': [
      {
        name: 'MCP',
        path: '/ai',
        component: 'BasicLayout',
        meta: { title: 'AI 接入' },
        children: [
          {
            name: 'mcpApiKeys',
            path: '/mcp/api-keys',
            component: 'mcp/api-keys/index',
            meta: { title: 'API Key 管理', menuId: '1' },
          },
        ],
      },
    ],
    '/auth/secondary-lock/menus': [],
    '/message/unread-count': { count: 0 },
    '/message/page': { items: [], total: 0 },
    '/menu/visuals': { menus: [], cards: {} },
    '/menu/preferences': { menus: [], hiddenMenuIds: [] },
    '/auth/wechat/web/capabilities': { enabled: false },
  };
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (!pathname.startsWith('/api/')) return route.fallback();
    const path = pathname.replace(/^\/api/, '');
    const method = route.request().method();
    const ok = (data) =>
      route.fulfill({ json: { code: 0, message: null, data } });
    if (path === '/api-key/list') {
      reads++;
      return ok(rows);
    }
    if (path.startsWith('/api-key/') && method === 'PUT') {
      const body = route.request().postDataJSON();
      writes.push({ path, body });
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (failSave)
        return route.fulfill({ json: { code: 1, message: '模拟保存失败' } });
      assert.deepEqual(Object.keys(body), ['remark']);
      const row = rows.find((row) => path.endsWith(row.id));
      row.remark = body.remark;
      return ok(row);
    }
    if (path === '/api-key/generate') {
      rows.unshift({
        ...rows[0],
        id: '9007199254740995',
        remark: route.request().postDataJSON().remark,
      });
      return ok({ apiKey: secret });
    }
    if (path.startsWith('/api-key/') && method === 'DELETE') {
      if (failDelete)
        return route.fulfill({ json: { code: 1, message: '模拟删除失败' } });
      rows = rows.filter((row) => !path.endsWith(row.id));
      return ok(null);
    }
    if (!(path in fixtures)) throw new Error(`缺少接口夹具 ${method} ${path}`);
    return ok(fixtures[path]);
  });
  await page.goto(`${origin}/auth/login`);
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page
    .locator('button')
    .filter({ hasText: /^登录$/ })
    .click();
  await page.waitForURL('**/mcp/api-keys');
  const edit = page.getByRole('button', { name: '修改备注', exact: true });
  await edit.click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByText('有效期', { exact: true })).toHaveCount(0);
  await dialog.getByRole('textbox').fill('   ');
  await dialog.getByRole('button', { name: /^保\s*存$/ }).click();
  assert.equal(writes.length, 0);
  await dialog.getByRole('textbox').fill('修改后的备注');
  failSave = true;
  await dialog.getByRole('button', { name: /^保\s*存$/ }).click();
  await expect(dialog.locator('.ant-btn-loading')).toBeVisible();
  await expect(page.getByText('模拟保存失败', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('textbox')).toHaveValue('修改后的备注');
  await expect(dialog.locator('.ant-btn-loading')).toHaveCount(0);
  failSave = false;
  await dialog.getByRole('textbox').press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('修改后的备注', { exact: true })).toBeVisible();
  assert.equal(reads, 1, '修改只更新对应行');
  assert.equal(writes.at(-1).path, '/api-key/9007199254740993');
  for (const width of [390, 768, 1440])
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        async ({ url, theme }) => {
          const { updatePreferences } = await import(url);
          updatePreferences({ theme: { mode: theme } });
        },
        { url: preferencesModule, theme },
      );
      await (theme === 'dark'
        ? expect(page.locator('html')).toHaveClass(/dark/)
        : expect(page.locator('html')).not.toHaveClass(/dark/));
      await expect(page.locator('.ant-modal-wrap:visible')).toHaveCount(0);
      await page.screenshot({
        animations: 'disabled',
        path: `${output}/${width}-${theme}-list.png`,
      });
      await edit.first().click();
      dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox').fill('很长的模拟备注'.repeat(30));
      await dialog.screenshot({
        animations: 'disabled',
        path: `${output}/${width}-${theme}-edit.png`,
      });
      await dialog.getByRole('button', { name: /^取\s*消$/ }).click();
      await page
        .getByRole('button', { name: '创建 API Key', exact: true })
        .click();
      dialog = page.getByRole('dialog');
      await dialog.getByRole('textbox').fill('模拟新密钥');
      await dialog.getByRole('button', { name: /^创\s*建$/ }).click();
      await expect(
        page.getByText('完整密钥仅显示一次，请复制并妥善保存。'),
      ).toBeVisible();
      dialog = page.getByRole('dialog');
      await expect(dialog.locator('code')).toHaveText(secret);
      await dialog.getByRole('button', { name: '复制 API Key' }).click();
      await expect(
        page.getByText('API Key 已复制', { exact: true }),
      ).toBeVisible();
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        secret,
      );
      const box = await dialog.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
      await dialog.screenshot({
        animations: 'disabled',
        path: `${output}/${width}-${theme}-created.png`,
      });
      await dialog.getByRole('button', { name: /^关\s*闭$/ }).click();
      await expect(page.getByText(secret, { exact: true })).toHaveCount(0);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      rows = rows.slice(1);
    }
  const beforeDelete = reads;
  const deleteButton = page
    .locator('tr')
    .filter({ hasText: '修改后的备注' })
    .getByRole('button', { name: '删除 API Key', exact: true });
  await deleteButton.click();
  await page
    .locator('.ant-popover')
    .getByRole('button', { name: /^取\s*消$/ })
    .click();
  await expect(page.getByText('修改后的备注', { exact: true })).toBeVisible();
  failDelete = true;
  await deleteButton.click();
  await page
    .locator('.ant-popover')
    .getByRole('button', { name: /^确\s*定$/ })
    .click();
  await expect(page.getByText('模拟删除失败', { exact: true })).toBeVisible();
  await expect(page.getByText('修改后的备注', { exact: true })).toBeVisible();
  failDelete = false;
  await deleteButton.click();
  await page
    .locator('.ant-popover')
    .getByRole('button', { name: /^确\s*定$/ })
    .click();
  await expect(page.getByText('修改后的备注', { exact: true })).toHaveCount(0);
  assert.equal(reads, beforeDelete, '删除只移除对应行');
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      result: 'passed',
      writes: writes.length,
      viewports: [390, 768, 1440],
      themes: ['light', 'dark'],
      screenshots: output,
    }),
  );
} catch (error) {
  console.log(
    await browser.contexts()[0]?.pages()[0]?.locator('body').innerText(),
  );
  await browser
    .contexts()[0]
    ?.pages()[0]
    ?.screenshot({ path: `${output}/failure.png` });
  throw error;
} finally {
  await browser.close();
}

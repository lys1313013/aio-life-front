import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// 真实配置页面配合隔离接口夹具；不修改部署中的管理员配置或第三方凭据。
const origin = process.env.SYSTEM_CONFIG_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/system-config';
await mkdir(output, { recursive: true });
const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
const records = [
  [
    'typesafe.recommendation',
    'Typesafe 智能推荐',
    {
      enabled: true,
      model: 'jev-latest',
      apiKeyConfigured: true,
      requestTimeoutMs: 1500,
      dataCacheTtlMs: 18000000,
    },
  ],
  [
    'mbti.api',
    'MBTI 接口',
    { apiKeyConfigured: true, baseUrl: 'https://api.devil.ai' },
  ],
  [
    'footprints.baidu',
    '生活足迹地图',
    { serviceAkConfigured: true, timeoutMs: 5000 },
  ],
].map(([configKey, description, value]) => ({
  configKey,
  description,
  configType: 'JSON',
  configValue: JSON.stringify(value),
  updateTime: '',
}));
const errors = [];
const writes = [];
let failSave = false;
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(30000);
  page.on('pageerror', (error) => errors.push(error.message));
  const fixtures = {
    '/auth/login': { accessToken: 'synthetic-system-config-token' },
    '/user/info': {
      id: '7',
      userId: '7',
      username: 'fixture',
      realName: '模拟管理员',
      roles: ['admin'],
      homePath: '/system/config',
    },
    '/auth/codes': ['admin'],
    '/menu/all': [
      {
        name: 'System',
        path: '/system',
        component: 'BasicLayout',
        meta: { title: '系统管理' },
        children: [
          {
            name: 'SystemConfig',
            path: '/system/config',
            component: 'system/config/index',
            meta: { title: '系统配置', authority: ['admin'], menuId: '1' },
          },
        ],
      },
    ],
    '/auth/secondary-lock/menus': [],
    '/message/unread-count': { count: 0 },
    '/menu/visuals': { menus: [], cards: {} },
    '/menu/preferences': { menus: [], hiddenMenuIds: [] },
    '/auth/wechat/web/capabilities': { enabled: false },
  };
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.fallback();
    const path = url.pathname.replace(/^\/api/, '');
    if (path === '/system-config/list')
      return route.fulfill({ json: { code: 0, data: records } });
    if (
      path.startsWith('/system-config/') &&
      route.request().method() === 'PUT'
    ) {
      const key = path.split('/').at(-1);
      const input = JSON.parse(route.request().postDataJSON().configValue);
      writes.push({ key, input });
      await new Promise((resolve) => setTimeout(resolve, 450));
      if (failSave)
        return route.fulfill({ json: { code: 1, message: '模拟保存失败' } });
      const row = records.find((item) => item.configKey === key);
      const { apiKey, clearApiKey, serviceAk, clearServiceAk, ...fields } =
        input;
      const current = JSON.parse(row.configValue);
      Object.assign(current, fields);
      if (clearApiKey) current.apiKeyConfigured = false;
      else if (apiKey) current.apiKeyConfigured = true;
      if (clearServiceAk) current.serviceAkConfigured = false;
      else if (serviceAk) current.serviceAkConfigured = true;
      row.configValue = JSON.stringify(current);
      row.updateTime = '2026-10-22 12:00:00';
      return route.fulfill({ json: { code: 0, data: row } });
    }
    return route.fulfill({ json: { code: 0, data: fixtures[path] ?? [] } });
  });
  await page.goto(`${origin}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page
    .locator('button')
    .filter({ hasText: /^登录$/ })
    .click();
  await page.waitForURL('**/system/config');
  const card = (title) =>
    page
      .locator('.ant-card')
      .filter({
        has: page.locator('.ant-card-head-title', { hasText: title }),
      });
  const typesafe = card('Typesafe 智能推荐');
  const mbti = card('MBTI 接口');
  const map = card('生活足迹地图');
  await expect(typesafe.getByLabel('模型', { exact: true })).toHaveValue(
    'jev-latest',
  );
  await typesafe.getByLabel('模型', { exact: true }).fill('new-model');
  await typesafe
    .getByLabel('API Key', { exact: true })
    .fill('synthetic-secret');
  await typesafe.getByLabel('数据缓存时长（毫秒）', { exact: true }).fill('0');
  const oldHeight = (await typesafe.boundingBox()).height;
  await typesafe.getByRole('button', { name: /^保\s*存$/ }).click();
  await expect(typesafe.locator('.ant-btn-loading')).toBeVisible();
  assert.equal((await typesafe.boundingBox()).height, oldHeight);
  await expect(typesafe.getByLabel('API Key', { exact: true })).toBeDisabled();
  await expect(typesafe.locator('.ant-btn-loading')).toHaveCount(0);
  await expect(typesafe.getByLabel('API Key', { exact: true })).toHaveValue('');
  await expect(typesafe.getByLabel('模型', { exact: true })).toHaveValue(
    'new-model',
  );
  assert.equal(writes.at(-1).input.dataCacheTtlMs, 0);
  assert.equal(writes.at(-1).input.apiKey, 'synthetic-secret');
  await map.getByLabel('地图请求超时（毫秒）', { exact: true }).fill('8000');
  await map.getByRole('button', { name: /^保\s*存$/ }).click();
  await expect(map.locator('.ant-btn-loading')).toHaveCount(0);
  assert.equal(writes.at(-1).input.timeoutMs, 8000);

  failSave = true;
  await mbti.getByLabel('API Key', { exact: true }).fill('replacement-secret');
  await mbti.getByRole('button', { name: /^保\s*存$/ }).click();
  await expect(mbti.locator('.ant-btn-loading')).toHaveCount(0);
  await expect(page.getByText('模拟保存失败', { exact: true })).toBeVisible();
  await expect(mbti.getByLabel('API Key', { exact: true })).toHaveValue(
    'replacement-secret',
  );
  failSave = false;
  await mbti.getByRole('button', { name: /^保\s*存$/ }).click();
  await expect(mbti.getByLabel('API Key', { exact: true })).toHaveValue('');
  await mbti
    .getByRole('checkbox', { name: '清除 API Key', exact: true })
    .check();
  await mbti.getByRole('button', { name: /^保\s*存$/ }).click();
  await expect(
    mbti.getByRole('checkbox', { name: '清除 API Key', exact: true }),
  ).toHaveCount(0);
  await expect(mbti.getByLabel('API Key', { exact: true })).toHaveAttribute(
    'placeholder',
    '请输入 API Key',
  );
  assert.equal(writes.at(-1).input.clearApiKey, true);

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
      await page.waitForTimeout(120);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await typesafe.scrollIntoViewIfNeeded();
      const height = (await typesafe.boundingBox()).height;
      await typesafe.getByRole('button', { name: /^保\s*存$/ }).click();
      await expect(typesafe.locator('.ant-btn-loading')).toBeVisible();
      assert.equal((await typesafe.boundingBox()).height, height);
      await expect(typesafe.locator('.ant-btn-loading')).toHaveCount(0);
      assert.equal((await typesafe.boundingBox()).height, height);
      await expect(page.locator('.ant-message-notice')).toHaveCount(0, {
        timeout: 5000,
      });
      await typesafe.evaluate((node) =>
        node.scrollIntoView({ block: 'center' }),
      );
      await typesafe.screenshot({ path: `${output}/${width}-${theme}.png` });
    }
  for (const [name, target] of [
    ['mbti', mbti],
    ['map', map],
  ]) {
    await target.evaluate((node) => node.scrollIntoView({ block: 'center' }));
    await target.screenshot({ path: `${output}/${name}-desktop.png` });
  }
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
} finally {
  await browser.close();
}

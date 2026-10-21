import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium, expect } from '@playwright/test';
const require = createRequire(import.meta.url);
const { setupMapFixture } = require('./footprint-map-fixture.cjs');
const origin = process.env.FOOTPRINT_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/life-footprints';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const state = await setupMapFixture(page);
  const fixtures = {
    '/auth/login': { accessToken: 'synthetic-footprint-token' },
    '/user/info': { userId: '7', id: '7', username: 'fixture', realName: '模拟用户', nickname: '模拟用户', roles: ['admin'], homePath: '/record/life-footprints' },
    '/auth/codes': ['admin'],
    '/menu/all': [{ name: 'Demos', path: '/record', component: 'BasicLayout', meta: { title: '记录', icon: 'ic:baseline-view-in-ar' }, children: [{ name: 'LifeFootprints', path: '/record/life-footprints', component: 'my-hub/life-footprints/index', meta: { title: '生活足迹', icon: 'mdi:map-marker-path', menuId: '1512' } }] }],
    '/auth/secondary-lock/menus': [], '/message/unread-count': { count: 0 }, '/message/list': [], '/message/page': { items: [], total: 0 },
    '/menu/visuals': { menus: [], cards: {} }, '/menu/preferences': { menus: [], hiddenMenuIds: [] }, '/auth/wechat/web/capabilities': { enabled: false },
  };
  await page.route('**/api/**', async route => {
    if (!new URL(route.request().url()).pathname.startsWith('/api/')) return route.fallback();
    if (await state.handle(route)) return;
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (Object.hasOwn(fixtures, path)) return route.fulfill({ json: { code: 0, data: fixtures[path] } });
    return route.fulfill({ json: { code: 0, data: [] } });
  });
  await page.goto(origin + '/auth/login');
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page.locator('button').filter({ hasText: /^登录$/ }).click();
  await page.waitForURL('**/record/life-footprints');
  const main = page.locator('.footprints');
  await expect(main.locator('.footprint-map-hit')).toHaveCount(1);
  await expect(main.locator('.footprint-detail')).toHaveCount(0);
  await main.getByRole('button', { name: '3条地点记录', exact: true }).click();
  await expect(main.locator('.group-record')).toHaveCount(3);
  await main.locator('.group-record').first().click();
  await expect(main.locator('.footprint-detail')).toContainText('丁香公寓');
  const reads = state.reads;
  await main.getByRole('button', { name: '编辑生活足迹', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('.ant-picker').first().hover();
  await dialog.locator('.ant-picker-clear').first().click();
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await expect(dialog.getByRole('alert')).toContainText('完整日期');
  await dialog.getByLabel('开始', { exact: true }).click();
  await dialog.getByLabel('开始', { exact: true }).fill('2016-01-01');
  await dialog.getByLabel('开始', { exact: true }).press('Enter');
  await dialog.getByRole('textbox', { name: '备注', exact: true }).fill('');
  state.failSave = true;
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: '地点', exact: true })).toHaveValue('丁香公寓');
  state.failSave = false;
  await dialog.getByRole('checkbox', { name: '至今' }).check();
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await expect(dialog).not.toBeVisible();
  assert.equal(state.writes.at(-1).note, null); assert.equal(state.reads, reads);
  assert.equal(state.writes.at(-1).endDate, '9999-12-31');
  await main.getByRole('button', { name: '编辑生活足迹', exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: '至今' })).toBeChecked();
  await dialog.getByRole('checkbox', { name: '至今' }).uncheck();
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await expect(dialog.getByRole('alert')).toContainText('完整日期');
  await dialog.getByLabel('结束', { exact: true }).click();
  await dialog.getByLabel('结束', { exact: true }).fill('2020-06-30');
  await dialog.getByLabel('结束', { exact: true }).press('Enter');
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await expect(dialog).not.toBeVisible();
  assert.equal(state.writes.at(-1).endDate, '2020-06-30');
  await main.getByRole('button', { name: '新增生活足迹', exact: true }).click();
  await dialog.getByLabel('开始', { exact: true }).click();
  await dialog.getByLabel('开始', { exact: true }).fill('2020-08-01');
  await dialog.getByLabel('开始', { exact: true }).press('Enter');
  await dialog.getByRole('textbox', { name: '地点', exact: true }).fill('新住所');
  await dialog.locator('.location-results button').first().click();
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await expect(dialog.getByRole('alert')).toContainText('确认');
  await dialog.getByRole('button', { name: '确认位置', exact: true }).click();
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await expect(dialog).not.toBeVisible();
  assert.equal(state.records.length, 4); assert.equal(state.writes.at(-1).startDate, '2020-08-01');
  assert.equal(state.writes.at(-1).endDate, '9999-12-31');
  assert.equal(Object.hasOwn(state.writes.at(-1), 'ongoing'), false);
  assert.equal(Object.hasOwn(state.writes.at(-1), 'requestKey'), false);
  await expect(main.locator('.footprint-detail')).toContainText('至今');
  await expect(main.locator('.footprint-detail')).not.toContainText('9999');
  for (const width of [390, 768, 1440]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(async ({ module, theme }) => { const { updatePreferences } = await import(module); updatePreferences({ theme: { mode: theme } }); }, { module: `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`, theme });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // 等待全局 Ant Design 主题切换完成后再归档视觉状态。
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${output}/${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
    await main.getByRole('button', { name: '编辑生活足迹', exact: true }).click();
    await expect(dialog.getByLabel('开始', { exact: true })).toHaveValue('2020-08-01');
    await page.screenshot({ path: `${output}/${width}-${theme}-editor.png`, fullPage: true, animations: 'disabled' });
    await dialog.getByRole('button', { name: /取\s*消/ }).click();
    await expect(dialog).not.toBeVisible();
  }
  const dots = await page.locator('.footprint-map-dot:not(.footprint-map-cluster)').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().width));
  assert(dots.every(size => size <= 10));
  await main.getByRole('button', { name: '编辑生活足迹', exact: true }).click();
  await dialog.getByRole('button', { name: /删\s*除/ }).click();
  await page.locator('.ant-popconfirm:visible').getByRole('button', { name: /删\s*除/ }).click();
  await expect(dialog).not.toBeVisible(); assert.equal(state.records.length, 3);
  const single = { ...state.records[0], placeName: '用于检查换行的较长住所名称'.repeat(3), note: '用于检查完整阅读的较长备注。'.repeat(80) };
  state.records = [single];
  await page.reload();
  await expect(main.locator('.footprint-map-hit')).toHaveCount(1);
  await main.locator('.footprint-map-hit').click();
  await expect(main.locator('.footprint-detail')).toBeVisible();
  assert(await main.locator('.footprint-detail').evaluate(el => el.scrollHeight > el.clientHeight));
  for (const width of [390, 768, 1440]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(async ({ module, theme }) => { const { updatePreferences } = await import(module); updatePreferences({ theme: { mode: theme } }); }, { module: `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`, theme });
    state.delay = 1800; state.failRead = true;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(main.locator('.list-loading')).toBeVisible();
    const region = main.locator('.footprint-map-area');
    const initial = await region.boundingBox();
    await expect(main.locator('.footprint-read-error')).toBeVisible();
    const failed = await region.boundingBox();
    assert.equal(failed.y, initial.y); assert.equal(failed.height, initial.height);
    state.failRead = false; state.records = [];
    await main.locator('.footprint-read-error').getByRole('button', { name: /重\s*试/ }).click();
    await expect(main.locator('.footprint-empty')).toBeVisible();
    await expect(main.locator('.footprint-map-hit')).toHaveCount(0);
    const empty = await region.boundingBox();
    assert.equal(empty.y, initial.y); assert.equal(empty.height, initial.height);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: Web 全量标记、聚合选择、编辑清空、失败恢复、新增确认、删除、六布局、小圆点、长备注与加载重试；API/SDK为模拟。');
} finally { await browser.close(); }

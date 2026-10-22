import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const origin = process.env.EXPENSE_DEVICE_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/expense-device';
await mkdir(output, { recursive: true });
const expenseId = '9223372036854775806', deviceId = '9223372036854775805';
const defaults = { name: '模拟耳机', purchasePrice: 42.5, purchaseDate: '2026-10-22', purchasePlace: '模拟商家', remark: '模拟备注', status: '1' };
const devices = Array.from({ length: 35 }, (_, i) => ({ id: i === 0 ? deviceId : String(100 + i), name: `模拟设备${i + 1}`, spec: '256GB · 深空灰', purchaseDate: '2026-10-01' }));
let linked = null, fail = false;
const writes = [], pages = [], errors = [];
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
 page.on('pageerror', e => errors.push(e.message));
 await page.route('**/api/**', async route => {
  const url = new URL(route.request().url()), path = url.pathname.replace(/^\/api/, ''), method = route.request().method();
  if (!url.pathname.startsWith('/api/')) return route.fallback();
  let data = [];
  const fixtures = {
   '/auth/login': { accessToken: 'synthetic-device-token' },
   '/user/info': { userId: '7', id: '7', username: 'fixture', realName: '模拟用户', roles: ['admin'], homePath: '/finance/expense' },
   '/auth/codes': ['admin'], '/auth/secondary-lock/menus': [],
   '/menu/all': [{ name: 'Finance', path: '/finance', component: 'BasicLayout', meta: { title: '财务', icon: 'mdi:wallet' }, children: [{ name: 'Expense', path: '/finance/expense', component: 'my-hub/expense/index', meta: { title: '支出', menuId: '1', icon: 'mdi:cash-minus' } }] }],
   '/message/unread-count': { count: 0 }, '/message/page': { items: [], total: 0 },
   '/menu/visuals': { menus: [], cards: {} }, '/menu/preferences': { menus: [], hiddenMenuIds: [] },
   '/auth/wechat/web/capabilities': { enabled: false },
  };
  if (Object.hasOwn(fixtures, path)) data = fixtures[path];
  if (path === '/userDictType/getByDictType') data = { dictDetailList: [{ id: '81', dictLabel: '电子设备', dictValue: '1' }] };
  if (path === '/expense/query') data = { items: [{ id: expenseId, amt: 42.5, transactionAmt: 60, expTime: '2026-10-22 23:30:00', remark: '模拟账单', expTypeId: '81', payTypeId: '81', deviceId: linked?.id, deviceName: linked?.name }], total: 1 };
  if (path === '/device/query') {
   const current = Number(url.searchParams.get('page') || 1), name = url.searchParams.get('name') || '';
   pages.push(current); const matches = devices.filter(row => row.name.includes(name));
   data = { items: matches.slice((current - 1) * 30, current * 30), total: matches.length };
  }
  if (path === `/expense/${expenseId}/device`) {
   if (method === 'GET') data = { device: linked, defaults };
   else {
    const body = route.request().postDataJSON(); writes.push({ method, body });
    if (fail) return route.fulfill({ json: { code: 1, message: '模拟保存失败' } });
    if (method === 'POST') linked = { ...body, id: deviceId };
    if (method === 'PUT') linked = devices.find(row => row.id === body.deviceId);
    if (method === 'DELETE') linked = null;
    data = method === 'DELETE' ? true : linked;
   }
  }
  return route.fulfill({ json: { code: 0, data } });
 });
 await page.goto(origin + '/auth/login');
 await page.locator('input:not([type="password"])').first().fill('fixture');
 await page.locator('input[type="password"]').fill('fixture-password');
 await page.locator('button').filter({ hasText: /^登录$/ }).click();
 await page.waitForURL('**/finance/expense');
 const open = async () => {
  await page.getByRole('button', { name: '关联设备', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('已有设备', { exact: true })).toBeVisible(); return dialog;
 };
 let dialog = await open();
 await dialog.getByRole('combobox').click();
 await page.locator('.rc-virtual-list-holder').hover(); await page.mouse.wheel(0, 2000);
 await expect.poll(() => pages.includes(2)).toBe(true);
 await page.locator('.rc-virtual-list-holder').hover(); await page.mouse.wheel(0, 2000);
 await page.getByTitle('模拟设备35 · 256GB · 深空灰 · 2026-10-01', { exact: true }).click();
 await dialog.getByRole('button', { name: /^保\s*存$/ }).click(); await expect(dialog).toHaveCount(0);
 assert.equal(writes.at(-1).body.deviceId, '134');
 dialog = await open();
 await dialog.getByRole('button', { name: '解除设备关联', exact: true }).click();
 await page.getByRole('button', { name: /确\s*定/ }).last().click(); await expect(dialog).toHaveCount(0);
 dialog = await open(); await dialog.getByText('新建设备', { exact: true }).click();
 await expect(dialog.getByRole('textbox', {name: '设备名称', exact: true})).toHaveValue(defaults.name);
 await expect(dialog.getByRole('spinbutton')).toHaveValue('42.50');
 await dialog.getByRole('textbox', {name: '设备名称', exact: true}).fill('用户确认的设备'); fail = true;
 await dialog.getByRole('button', { name: /^保\s*存$/ }).click();
 await expect(page.getByText('模拟保存失败', { exact: true })).toBeVisible();
 await expect(dialog.getByRole('textbox', {name: '设备名称', exact: true})).toHaveValue('用户确认的设备'); fail = false;
 const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
 for (const width of [390, 768, 1440]) for (const theme of ['light', 'dark']) {
  await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(async ({ url, theme }) => { const { updatePreferences } = await import(url); updatePreferences({ theme: { mode: theme } }); }, { url: preferencesModule, theme });
  await page.waitForTimeout(150); await page.screenshot({ path: `${output}/${width}-${theme}.png` });
  const bounds = await dialog.boundingBox(); assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
 }
 await dialog.getByRole('button', { name: /^保\s*存$/ }).click(); await expect(dialog).toHaveCount(0);
 assert.equal(writes.at(-1).body.purchasePrice, 42.5); assert.equal(writes.at(-1).body.purchaseDate, '2026-10-22');
 assert.equal(writes.at(-1).body.purchasePlace, '模拟商家'); assert.equal(writes.at(-1).body.name, '用户确认的设备');
 assert(!Object.hasOwn(writes.at(-1).body, 'expense_purpose')); assert.deepEqual(errors, []);
 console.log('Web passed: paginated binding, unbind, prefill, failed save recovery, 6 viewport/theme screenshots.');
} finally { await browser.close(); }

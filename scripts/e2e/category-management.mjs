import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// 运行当前 Web 页面并拦截全部业务接口；仅使用模拟账号与分类。
const origin = process.env.CATEGORY_WEB_ORIGIN || 'http://127.0.0.1:5673';
const output = 'node_modules/.cache/category-management';
await mkdir(output, { recursive: true });
const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
const generalPath = '/my-hub/exercise/category-config';
const personalPath = '/time/my-categories';
const adminPath = '/time/category-admin';
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
const unhandled = new Set(), errors = [];
let page;
async function settleMotion() {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations()
      .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})));
  });
}
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  const fixtures = {
    '/auth/login': { accessToken: 'synthetic-category-token' },
    '/user/info': { id: '7', userId: '7', username: 'fixture', realName: '模拟分类管理员', roles: ['admin'], homePath: '/profile?tab=categories' },
    '/auth/codes': ['admin'],
    '/auth/secondary-lock/menus': [],
    '/auth/wechat/web/capabilities': { enabled: false },
    '/message/unread-count': { count: 0 },
    '/message/page': { items: [], total: 0 },
    '/menu/visuals': { menus: [], cards: {} },
    '/menu/preferences': { menus: [], hiddenMenuIds: [] },
    '/menu/all': [
      { name: 'Profile', path: '/profile', component: '_core/profile/index', meta: { title: '个人中心', hideInMenu: true, menuId: '2200' } },
      { name: 'ProfileCategoryManagement', path: '/profile/category-management', component: 'BasicLayout', meta: { title: '分类管理', hideInMenu: true, menuId: '2201' }, children: [
        { name: 'exerciseCategoryConfig', path: generalPath, component: 'my-hub/exercise/category-config/index', meta: { title: '通用分类', menuId: '1508' } },
        { name: 'CategoryConfig', path: personalPath, component: 'time/time-tracker/category-config/index', meta: { title: '时迹分类', menuId: '1303' } },
      ] },
      { name: 'TimeManagement', path: '/time', component: 'BasicLayout', meta: { title: '时间', menuId: '1300' }, children: [
        { name: 'TimeTracker', path: '/time/time-tracker', component: 'time/time-tracker/index', meta: { title: '时迹', menuId: '1301' } },
      ] },
      { name: 'System', path: '/system', component: 'BasicLayout', meta: { title: '系统管理', menuId: '1900' }, children: [
        { name: 'TimeTrackerCategoryAdmin', path: adminPath, component: 'time/time-tracker/admin/index', meta: { title: '时迹分类', authority: ['admin'], menuId: '1304' } },
      ] },
    ],
    '/userDictType/dictTypeEnum': [{ value: 'exercise_type', label: '运动分类' }],
    '/userDictData/query': { items: [{ id: '9223372036854775807', dictType: 'exercise_type', dictLabel: '模拟通用分类', color: '#1890ff', isEnabled: 1, sortOrder: 0 }], total: 1 },
    '/timeTrackerCategory/list': [{ id: '9223372036854775806', parentId: '0', userId: '7', name: '模拟个人时迹分类', color: '#52c41a', isEnabled: 1, isTrackTime: 1, sortOrder: 10 }],
    '/timeTrackerCategory/hidden': [],
    '/timeTrackerCategory/admin/list': [{ id: '9223372036854775805', parentId: '0', userId: '0', name: '模拟公共时迹分类', color: '#1890ff', isEnabled: 1, isTrackTime: 1, sortOrder: 10 }],
  };
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (!pathname.startsWith('/api/')) return route.fallback();
    const path = pathname.replace(/^\/api/, '');
    if (!Object.hasOwn(fixtures, path)) {
      unhandled.add(`${route.request().method()} ${path}`);
      return route.fulfill({ status: 400, json: { code: 1, message: '未声明模拟接口' } });
    }
    return route.fulfill({ json: { code: 0, message: null, data: fixtures[path] } });
  });
  await page.goto(`${origin}/auth/login`);
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page.locator('button').filter({ hasText: /^登录$/ }).click();
  await page.waitForURL('**/profile?tab=categories');
  await expect(page.getByRole('tab', { name: '分类管理', exact: true })).toHaveAttribute('data-state', 'active');
  await expect(page.locator('.ant-notification-notice')).toHaveCount(0);
  for (const width of [390, 768, 1440]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(async ({ url, theme }) => { const { updatePreferences } = await import(url); updatePreferences({ theme: { mode: theme } }); }, { url: preferencesModule, theme });
    if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
    else await expect(page.locator('html')).not.toHaveClass(/dark/);
    await page.getByRole('tab', { name: '通用分类', exact: true }).click();
    await expect(page.getByText('模拟通用分类', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /添加/ }).filter({ visible: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await settleMotion();
    await page.screenshot({ path: `${output}/${width}-${theme}-general-editor.png` });
    await page.getByRole('dialog').getByRole('button', { name: /^取\s*消$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const timeTab = page.getByRole('tab', { name: '时迹分类', exact: true });
    await timeTab.click();
    await expect(timeTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('模拟个人时迹分类', { exact: true })).toBeVisible();
    await settleMotion();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${output}/${width}-${theme}-time.png` });
  }
  await page.goto(`${origin}${adminPath}`);
  await expect(page.getByText('模拟公共时迹分类', { exact: true })).toBeVisible();
  await expect(page.getByText('系统管理', { exact: true }).filter({ visible: true })).toBeVisible();
  assert.deepEqual([...unhandled], []);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'passed', viewports: [390, 768, 1440], themes: ['light', 'dark'], screenshots: output }));
} catch (error) {
  console.error(JSON.stringify({ unhandled: [...unhandled], errors, url: page?.url(), body: await page?.locator('body').innerText().catch(() => '') }));
  await page?.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally { await browser.close(); }

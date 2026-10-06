// Real Web settings/home with synthetic accounts and narrowly scoped API fixtures.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origin = process.env.HOME_CARDS_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/home-card-preferences';
const preferencesModule =
  '/@fs' +
  new URL('../../packages/@core/preferences/src/index.ts', import.meta.url)
    .pathname;
await mkdir(output, { recursive: true });
const definitions = [
  ['overview.leetcode', '每日一题', 'lucide:code'],
  ['overview.github', 'GitHub', 'mdi:github'],
  ['overview.exercise', '今日运动', 'mdi:run'],
  ['overview.shanbay', '扇贝单词', 'lucide:leaf'],
  ['overview.read', '今日阅读', 'lucide:book-open'],
  ['section.time', '时迹', 'lucide:clock'],
  ['section.links', '快捷导航', 'lucide:layout-grid'],
  ['section.watched', '待办', 'lucide:list-checks'],
  ['section.thoughts', '闪念', 'lucide:lightbulb'],
  ['section.goal', '目标', 'lucide:crosshair'],
  ['section.anniversary', '纪念日', 'mdi:calendar-heart'],
  ['section.reading', '阅读', 'lucide:book-open'],
  ['section.membership', '会员', 'lucide:crown'],
  ['section.movie', '观影', 'lucide:clapperboard'],
  ['section.exercise', '运动', 'mdi:run'],
  ['section.github', 'GitHub 最近提交', 'mdi:github'],
];
const defaults = () =>
  definitions.map(([cardKey, title, icon], sortOrder) => ({
    cardKey,
    title,
    icon,
    sortOrder,
    group: cardKey.split('.')[0],
    enabled: true,
  }));
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();
  let cards = defaults(),
    fail = false;
  const calls = [],
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const fixtures = {
    '/auth/login': { accessToken: 'home-card-fixture' },
    '/user/info': {
      userId: '9007199254740993',
      id: '9007199254740993',
      username: 'fixture',
      realName: '测试用户',
      roles: ['user'],
      homePath: '/profile?tab=home-cards',
    },
    '/auth/codes': [],
    '/menu/all': [
      {
        name: 'FixtureLayout',
        path: '/fixture',
        component: 'BasicLayout',
        meta: { title: '生活' },
        children: [
          {
            name: 'Profile',
            path: '/profile',
            component: '/_core/profile/index',
            meta: { title: '个人中心', keepAlive: true },
          },
          {
            name: 'Home',
            path: '/',
            component: '/dashboard/home/index',
            meta: { title: '首页', keepAlive: true },
          },
        ],
      },
    ],
    '/auth/secondary-lock/menus': [],
    '/message/unread-count': { count: 0 },
    '/message/list': [],
    '/menu/preferences': { menus: [], hiddenMenuIds: [] },
    '/auth/wechat/web/capabilities': { enabled: false },
    '/dashboard/tasks': [
      { type: 'GITHUB', title: 'GitHub', icon: 'mdi:github' },
      { type: 'EXERCISE', title: '今日运动', icon: 'mdi:run' },
    ],
    '/dashboard/card/GITHUB': {
      type: 'GITHUB',
      title: 'GitHub',
      value: '2',
      refreshInterval: 60,
    },
    '/dashboard/card/EXERCISE': {
      type: 'EXERCISE',
      title: '今日运动',
      value: '3',
      refreshInterval: 60,
    },
    '/userbinds/list': [{ platform: 'github', platformUsername: 'fixture' }],
    '/github/recent-commits': [],
    '/taskDetails/watched': [],
    '/thought/dashboard': [],
    '/quick-nav/my': [],
    '/exerciseRecord/dashboardSummary': { days: [] },
    '/timeRecord/query': [],
    '/timeTrackerCategory/list': [],
  };
  for (const [path, data] of Object.entries(fixtures)) {
    const handler = (route) => {
      calls.push(new URL(route.request().url()).pathname);
      return route.fulfill({ json: { code: 0, data } });
    };
    await page.route('**/api' + path, handler);
    await page.route('**/api' + path + '?*', handler);
  }
  const preference = async (route) => {
    const path = new URL(route.request().url()).pathname,
      method = route.request().method();
    calls.push(path);
    if (method !== 'GET') {
      if (fail)
        return route.fulfill({ json: { code: 1, message: '模拟保存失败' } });
      if (method === 'DELETE') cards = defaults();
      else if (path.endsWith('/order')) {
        const { group, keys } = route.request().postDataJSON();
        cards = cards
          .map((item) =>
            item.group === group
              ? { ...item, sortOrder: keys.indexOf(item.cardKey) }
              : item,
          )
          .sort(
            (a, b) =>
              a.group.localeCompare(b.group) || a.sortOrder - b.sortOrder,
          );
      } else {
        const key = decodeURIComponent(path.split('/').at(-1));
        cards = cards.map((item) =>
          item.cardKey === key
            ? { ...item, enabled: route.request().postDataJSON().enabled }
            : item,
        );
      }
    }
    return route.fulfill({ json: { code: 0, data: cards } });
  };
  await page.route('**/api/home/cards', preference);
  await page.route('**/api/home/cards/*', preference);
  await page.goto(origin + '/auth/login');
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page
    .locator('button')
    .filter({ hasText: /^登录$/ })
    .click();
  await page.locator('.home-card-row').first().waitFor({ timeout: 30000 });
  assert.equal(await page.locator('.home-card-row').count(), 16);
  await page
    .getByText('登录成功', { exact: true })
    .waitFor({ state: 'hidden' });
  for (const width of [390, 820, 1440])
    for (const dark of [false, true]) {
      await page.setViewportSize({ width, height: 1100 });
      await page.evaluate(
        async ({ dark, module }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { dark, module: preferencesModule },
      );
      await page.waitForTimeout(400);
      await page.screenshot({
        path: `${output}/web-${width}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}: overflow`,
      );
    }
  await page.setViewportSize({ width: 1440, height: 1100 });
  const switchButton = page.getByRole('switch', {
    name: '显示每日一题',
    exact: true,
  });
  await switchButton.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="显示每日一题"]')
        .getAttribute('aria-checked') === 'false',
  );
  fail = true;
  await switchButton.click();
  await page.getByText('模拟保存失败', { exact: true }).waitFor();
  assert.equal(await switchButton.getAttribute('aria-checked'), 'false');
  fail = false;
  const first = page.locator(
    '[data-card-key="overview.leetcode"] .card-drag-handle',
  );
  const third = page.locator(
    '[data-card-key="overview.exercise"] .card-drag-handle',
  );
  const a = await first.boundingBox(),
    b = await third.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height - 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction(
    () =>
      document
        .querySelector('.home-card-row')
        ?.getAttribute('data-card-key') === 'overview.github',
  );
  await page.reload();
  await page.locator('.home-card-row').first().waitFor();
  assert.equal(
    await page.locator('.home-card-row').first().getAttribute('data-card-key'),
    'overview.github',
  );
  // Every business card disabled: homepage may fetch metadata, never hidden card content.
  cards = cards.map((item) => ({ ...item, enabled: false }));
  calls.length = 0;
  fixtures['/user/info'].homePath = '/';
  await page.goto(origin + '/');
  await page.locator('.dashboard-home').waitFor();
  await page.waitForTimeout(250);
  assert.equal(
    calls.filter(
      (path) =>
        path.startsWith('/api/dashboard/card/') ||
        path === '/api/taskDetails/watched' ||
        path === '/api/thought/dashboard',
    ).length,
    0,
  );
  assert.equal(
    await page.locator('.analysis-card,.dashboard-section').count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: Web 6 layouts, switch/failure rollback, mouse drag/reload, hidden-card request suppression',
  );
  await context.close();
} finally {
  await browser.close();
}

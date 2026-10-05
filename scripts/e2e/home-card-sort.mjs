// Real Web settings/home with synthetic accounts and narrowly scoped API fixtures.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origin = process.env.HOME_CARDS_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/home-card-sort';
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
  const writes = [];
  const calls = [],
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().includes('/api/'))
      console.log('unmocked', response.status(), response.url());
  });
  const fixtures = {
    '/auth/login': { accessToken: 'home-card-fixture' },
    '/user/info': {
      userId: '9007199254740993',
      id: '9007199254740993',
      username: 'fixture',
      realName: '测试用户',
      roles: ['user'],
      homePath: '/',
    },
    '/auth/codes': [],
    '/menu/visuals': { menus: [], cards: {} },
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
    '/timeTrackerCategory/all': [],
  };
  for (const [path, data] of Object.entries(fixtures)) {
    const handler = (route) => {
      calls.push(new URL(route.request().url()).pathname);
      return route.fulfill({ json: { rscode: '0', data } });
    };
    await page.route('**/api' + path, handler);
    await page.route('**/api' + path + '?*', handler);
  }
  const preference = async (route) => {
    const path = new URL(route.request().url()).pathname,
      method = route.request().method();
    calls.push(path);
    if (method !== 'GET') {
      writes.push(route.request().postDataJSON());
      await new Promise((resolve) => setTimeout(resolve, 180));
      assert.equal(
        await page.locator('.home-sort-saving, [aria-label="正在保存卡片顺序"]').count(),
        0,
        'pending reorder must not add card loading',
      );
      if (fail)
        return route.fulfill({ json: { rscode: '1', result: '模拟保存失败' } });
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
    return route.fulfill({ json: { rscode: '0', data: cards } });
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
  await page.locator('.dashboard-home').waitFor({ timeout: 30000 });
  await page
    .locator('[data-card-key="overview.exercise"] .analysis-card-progress')
    .waitFor({ state: 'hidden' });
  await page
    .getByText('登录成功', { exact: true })
    .waitFor({ state: 'hidden' });
  await page.screenshot({ path: output + '/initial.png', fullPage: true });
  assert.equal(
    await page.getByRole('button', { name: '调整首页卡片排序' }).count(),
    0,
  );
  const order = (group) =>
    page
      .locator(`[data-sort-group="${group}"] > [data-card-key]:visible`)
      .evaluateAll((rows) => rows.map((row) => row.dataset.cardKey));
  async function drag(key, targetKey) {
    const source = page.locator(`[data-card-key="${key}"]`);
    const destination = page.locator(`[data-card-key="${targetKey}"]`);
    const a = await source.boundingBox(),
      b = await destination.boundingBox();
    await page.mouse.move(
      a.x + a.width / 2,
      key.startsWith('section.') ? a.y + 20 : a.y + a.height / 2,
    );
    await page.mouse.down();
    await page.waitForTimeout(350);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.85, {
      steps: 15,
    });
    await page.waitForTimeout(120);
    await page.mouse.up();
  }
  const quickCard = page.locator(
    '[data-card-key="overview.exercise"] .analysis-card',
  );
  const requestsBeforeClick = calls.filter(
    (path) => path === '/api/dashboard/card/EXERCISE',
  ).length;
  await quickCard.click();
  await page.waitForFunction(
    () =>
      !document.querySelector(
        '[data-card-key="overview.exercise"] .analysis-card-progress',
      ),
  );
  assert.equal(
    calls.filter((path) => path === '/api/dashboard/card/EXERCISE').length,
    requestsBeforeClick + 1,
  );
  assert.equal(writes.length, 0);
  const before = [...calls];
  const cardInstance = await page
    .locator('[data-card-key="overview.github"]')
    .elementHandle();
  await drag('overview.github', 'overview.exercise');
  await page.waitForFunction(
    () =>
      document.querySelector('[data-sort-group="overview"] > [data-card-key]')
        ?.dataset.cardKey === 'overview.exercise',
  );
  await page.waitForFunction(
    () =>
      !document.querySelector('[data-sort-group="overview"][aria-busy="true"]'),
  );
  assert.equal(writes.length, 1);
  assert.equal(await page.locator('.ant-message-success').count(), 0);
  assert.equal(writes[0].keys.length, 5);
  assert.equal(writes[0].keys[0], 'overview.leetcode');
  assert.equal(
    await cardInstance.evaluate((node) => node.isConnected),
    true,
    'sorting must retain card instance',
  );
  assert.equal(
    calls.filter((path) => path.startsWith('/api/dashboard/card/')).length,
    before.filter((path) => path.startsWith('/api/dashboard/card/')).length,
    'sorting must not refetch card data',
  );
  const previous = await order('section');
  fail = true;
  await page.locator('[data-card-key="section.time"]').press('Alt+ArrowDown');
  await page.getByText('模拟保存失败', { exact: true }).waitFor();
  await page.waitForFunction(
    () =>
      !document.querySelector('[data-sort-group="section"][aria-busy="true"]'),
  );
  assert.deepEqual(await order('section'), previous);
  fail = false;
  await drag('section.time', 'section.thoughts');
  await page.waitForFunction(
    () =>
      document.querySelector('[data-sort-group="section"] > [data-card-key]')
        ?.dataset.cardKey === 'section.links',
  );
  await page.waitForFunction(
    () =>
      !document.querySelector('[data-sort-group="section"][aria-busy="true"]'),
  );
  assert.equal(writes.at(-1).keys.length, 11);
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
      await page.waitForTimeout(200);
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
  await page.reload();
  await page.locator('.dashboard-home').waitFor();
  assert.equal((await order('overview'))[0], 'overview.exercise');
  assert.equal((await order('section'))[0], 'section.links');
  assert.deepEqual(errors, []);
  console.log(
    'PASS: Web mouse drag in both groups, full payload, no card reload, failure rollback, reload persistence, 6 layouts',
  );
  await context.close();
} finally {
  await browser.close();
}

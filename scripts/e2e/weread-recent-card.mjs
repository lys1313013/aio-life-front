import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const origin = process.env.HOME_CARDS_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/weread-recent';
const preferencesModule =
  '/@fs' +
  new URL('../../packages/@core/preferences/src/index.ts', import.meta.url)
    .pathname;
await mkdir(output, { recursive: true });
const menus = [
  {
    name: 'FixtureLayout',
    path: '/fixture',
    component: 'BasicLayout',
    meta: { title: '生活' },
    children: [
      {
        name: 'Home',
        path: '/',
        component: '/dashboard/home/index',
        meta: { title: '首页', keepAlive: true },
      },
      {
        name: 'FixtureMembership',
        path: '/membership',
        component: '/membership/index',
        meta: { title: '会员', menuId: 'member-menu' },
      },
      {
        name: 'Weread',
        path: '/record/weread',
        component: '/my-hub/weread/index',
        meta: { title: '微信读书', menuId: 'weread-menu', keepAlive: true },
      },
    ],
  },
];
const visual = {
  menuId: 'weread-menu',
  path: '/record/weread',
  icon: 'lucide:book-open',
  iconColor: '#4489ce',
};
const memberVisual = {
  menuId: 'member-menu',
  path: '/membership',
  icon: 'lucide:crown',
};
const memberships = Array.from({ length: 4 }, (_, i) => ({
  id: 'member-' + i,
  name: '模拟会员 ' + i,
  expiryDate: '2099-12-31',
  status: 'active',
  category: 'other',
  autoRenew: 0,
}));
const cards = [
  {
    cardKey: 'section.membership',
    group: 'section',
    title: '会员',
    enabled: true,
    sortOrder: 2,
    ...memberVisual,
  },
  {
    cardKey: 'section.weread',
    group: 'section',
    title: '微信读书',
    enabled: true,
    sortOrder: 0,
    ...visual,
  },
  {
    cardKey: 'section.thoughts',
    group: 'section',
    title: '闪念',
    enabled: true,
    sortOrder: 1,
    icon: 'lucide:lightbulb',
  },
];
const covers = ['#deb241', '#eeeee8', '#6abecb'].map(
  (color, i) =>
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="128"><rect width="84" height="128" fill="${color}"/><text x="42" y="56" fill="#333" text-anchor="middle" font-size="12">BOOK ${i + 1}</text></svg>`,
    ),
);
const books = ['西西弗神话', '思考，快与慢', '动物农场'].map((title, i) => ({
  bookId: String(i + 1),
  title,
  author: ['阿尔贝·加缪', '丹尼尔·卡尼曼', '乔治·奥威尔'][i],
  cover: covers[i],
  readUpdateTime: String(1791163200 - i * 86400),
  progress: [42, 68, 15][i],
  deepLink: 'https://weread.qq.com/web/reader/fixture-' + i,
}));
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
const results = [];
try {
  for (const width of [390, 820, 1440])
    for (const dark of [false, true]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      const page = await context.newPage();
      page.on('response', (response) => {
        if (response.status() >= 400)
          console.error(
            'HTTP',
            response.status(),
            new URL(response.url()).pathname,
          );
      });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const fixtures = {
        '/auth/login': { accessToken: 'weread-fixture' },
        '/user/info': {
          userId: '9007199254740993',
          id: '9007199254740993',
          username: 'fixture',
          realName: '测试用户',
          roles: ['user'],
          homePath: '/',
        },
        '/auth/codes': [],
        '/menu/all': menus,
        '/menu/visuals': {
          menus: [visual, memberVisual],
          cards: {
            'section.weread': visual,
            'section.membership': memberVisual,
          },
        },
        '/home/cards': cards,
        '/auth/secondary-lock/menus': [],
        '/message/unread-count': { count: 0 },
        '/message/list': [],
        '/menu/preferences': { menus: [], hiddenMenuIds: [] },
        '/auth/wechat/web/capabilities': { enabled: false },
        '/dashboard/tasks': [],
        '/userbinds/list': [],
        '/thought/dashboard': [
          {
            id: 'thought-1',
            content: '后续卡片位置对照',
            createTime: '2026-10-05 10:00:00',
          },
        ],
        '/weread/connection': { connected: false },
        '/timeTrackerCategory/all': [],
        '/timeTrackerCategory/list': [],
      };
      for (const [path, data] of Object.entries(fixtures)) {
        const respond = (route) =>
          route.fulfill({ json: { rscode: '0', data } });
        await page.route('**/api' + path, respond);
        await page.route('**/api' + path + '?*', respond);
      }
      let responseBooks = Array.from({ length: 14 }, (_, i) => ({
          ...books[i % 3],
          bookId: String(i + 1),
          title: i < 3 ? books[i].title : '模拟分页图书 ' + (i + 1),
        })),
        fail = false,
        moreFail = false,
        calls = 0,
        release;
      let gate = new Promise((resolve) => {
        release = resolve;
      });
      let memberRelease;
      let memberGate = Promise.resolve();
      await page.route('**/api/membership/list', async (route) => {
        await memberGate;
        await route.fulfill({ json: { rscode: '0', data: memberships } });
      });
      const cursors = [];
      const recent = async (route) => {
        const cursor = new URL(route.request().url()).searchParams.get(
          'cursor',
        );
        cursors.push(cursor);
        calls++;
        await gate;
        await route.fulfill({
          json:
            fail || (cursor && moreFail)
              ? { rscode: '1', result: '模拟失败' }
              : {
                  rscode: '0',
                  data: {
                    connected: true,
                    books: responseBooks.slice(
                      cursor ? Number(cursor.split(':')[1]) : 0,
                      (cursor ? Number(cursor.split(':')[1]) : 0) + 6,
                    ),
                    nextCursor:
                      (cursor ? Number(cursor.split(':')[1]) : 0) + 6 <
                      responseBooks.length
                        ? '200:' +
                          ((cursor ? Number(cursor.split(':')[1]) : 0) + 6)
                        : null,
                  },
                },
        });
      };
      await page.route('**/api/weread/recent', recent);
      await page.route('**/api/weread/recent?*', recent);
      await page.goto(origin + '/auth/login');
      await page
        .locator('input:not([type="password"])')
        .first()
        .fill('fixture');
      await page.locator('input[type="password"]').fill('fixture-password');
      await page
        .locator('button')
        .filter({ hasText: /^登录$/ })
        .click();
      const card = page.getByLabel('微信读书首页卡片', { exact: true });
      await expect(card)
        .toBeVisible({ timeout: 15000 })
        .catch(async (error) => {
          console.error({
            url: page.url(),
            errors,
            body: await page.locator('body').innerText(),
          });
          throw error;
        });
      await page.evaluate(
        async ({ module, dark }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { module: preferencesModule, dark },
      );
      const geometry = () =>
        page.evaluate(() => {
          const rect = document
            .querySelector('[aria-label="微信读书首页卡片"]')
            .getBoundingClientRect();
          const sibling = document
            .querySelector('[data-card-key="section.thoughts"]')
            .getBoundingClientRect();
          return { height: rect.height, nextTop: sibling.top };
        });
      const memberCard = page.locator('.membership-card');
      await expect(memberCard).toContainText('模拟会员');
      const skeleton = await geometry();
      await card.screenshot({
        path: `${output}/${width}-${dark ? 'dark' : 'light'}-loading.png`,
      });
      release();
      await expect(card).toContainText('42%');
      const loaded = await geometry();
      assert.deepEqual(loaded, skeleton);
      const peerHeight = await memberCard.evaluate(
        (el) => el.getBoundingClientRect().height,
      );
      assert.equal(
        loaded.height,
        peerHeight,
        'full card matches membership height',
      );
      assert.equal(loaded.height, width >= 768 && width < 1024 ? 250 : 280);
      const rowGeometry = await card
        .locator('.weread-row')
        .evaluateAll((rows) =>
          rows
            .slice(0, 3)
            .map((el) => ({
              row: el.getBoundingClientRect().height,
              content: el.querySelector('a').getBoundingClientRect().height,
            })),
        );
      assert.ok(
        rowGeometry.every((row) => row.content <= row.row),
        'three rows fully visible',
      );
      await card.screenshot({
        path: `${output}/${width}-${dark ? 'dark' : 'light'}.png`,
      });
      assert.equal(
        await card.locator('button').count(),
        2,
        'only blank refresh and title',
      );
      const list = card.getByLabel('最近阅读列表', { exact: true });
      const scrollEnd = () =>
        list.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
      moreFail = true;
      await scrollEnd();
      await expect(card.getByLabel('重试加载更多书籍')).toBeVisible();
      await expect(card.locator('a')).toHaveCount(6);
      assert.deepEqual(await geometry(), loaded);
      moreFail = false;
      await card.getByLabel('重试加载更多书籍').click();
      await expect(card.locator('a')).toHaveCount(12);
      await scrollEnd();
      await expect(card.locator('a')).toHaveCount(14);
      assert.deepEqual(await geometry(), loaded);
      await scrollEnd();
      await page.waitForTimeout(100);
      assert.deepEqual(cursors, [null, '200:6', '200:6', '200:12']);
      await card.screenshot({
        path: `${output}/${width}-${dark ? 'dark' : 'light'}-pagination.png`,
      });
      await list.evaluate((el) => {
        el.scrollTop = 0;
      });
      const beforeBook = calls;
      const popupTask = page.waitForEvent('popup');
      await card.locator('a').first().click();
      const popup = await popupTask;
      await popup.close();
      assert.equal(calls, beforeBook, 'book does not refresh');
      gate = new Promise((resolve) => {
        release = resolve;
      });
      await card.click({ position: { x: 4, y: 20 } });
      await expect(card).toHaveAttribute('aria-busy', 'true');
      assert.deepEqual(await geometry(), loaded, 'refresh keeps geometry');
      memberGate = new Promise((resolve) => {
        memberRelease = resolve;
      });
      await memberCard
        .getByRole('button', { name: '刷新会员', exact: true })
        .click();
      await expect(card.getByLabel('正在刷新', { exact: true })).toBeVisible();
      await expect(
        memberCard.getByLabel('正在刷新', { exact: true }),
      ).toBeVisible();
      assert.equal(await card.locator('.refresh-dot').count(), 3);
      assert.equal(await memberCard.locator('.refresh-dot').count(), 3);
      assert.equal(await card.locator('.h-0\\.5').count(), 0);
      await page.screenshot({
        path: `${output}/${width}-${dark ? 'dark' : 'light'}-compare-refresh.png`,
      });
      memberRelease();
      await expect(card).toContainText('42%');
      release();
      await expect(card).toHaveAttribute('aria-busy', 'false');
      fail = true;
      await card.click({ position: { x: 4, y: 20 } });
      await expect(card).toContainText('刷新失败');
      assert.deepEqual(await geometry(), loaded);
      fail = false;
      responseBooks = [];
      await card.click({ position: { x: 4, y: 20 } });
      await expect(card).toContainText('暂无最近阅读');
      const empty = await geometry();
      assert.deepEqual(empty, loaded);
      gate = new Promise((resolve) => {
        release = resolve;
      });
      await card.click({ position: { x: 4, y: 20 } });
      await expect(card).toHaveAttribute('aria-busy', 'true');
      assert.deepEqual(await geometry(), empty);
      release();
      await expect(card).toHaveAttribute('aria-busy', 'false');
      responseBooks = [books[0]];
      await card.click({ position: { x: 4, y: 20 } });
      await expect(card).toContainText('42%');
      await expect(card.locator('a')).toHaveCount(1);
      const single = await geometry();
      assert.ok(
        single.height < loaded.height,
        'single book has no permanent whitespace',
      );
      responseBooks = [
        {
          ...books[0],
          title:
            '长书名用于检查手机平板桌面是否溢出以及书籍封面作者和阅读进度是否仍然清晰可见',
        },
      ];
      await card.click({ position: { x: 4, y: 20 } });
      await expect(card).toContainText('长书名');
      assert.deepEqual(await geometry(), single);
      assert.equal(
        await card.evaluate((el) => el.scrollWidth > el.clientWidth),
        false,
      );
      const beforeTitle = calls;
      await card
        .getByRole('button', { name: '查看微信读书', exact: true })
        .click();
      await expect(page).toHaveURL(/\/record\/weread/);
      assert.equal(calls, beforeTitle);
      assert.deepEqual(errors, []);
      results.push({ width, dark, skeleton, loaded, empty, single });
      await context.close();
    }
  await writeFile(output + '/geometry.json', JSON.stringify(results, null, 2));
  console.log(
    'Web Weread: 6 viewport/theme combinations passed, loading/refresh/error/empty/single/long text and click boundaries verified.',
  );
} finally {
  await browser.close();
}

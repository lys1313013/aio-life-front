import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

import { chromium, expect } from '@playwright/test';

const origin = process.env.HOME_CARDS_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/weread-stats';
const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
await mkdir(output, { recursive: true });
const visual = {
  menuId: 'weread-menu',
  path: '/record/weread',
  icon: 'svg:weread',
  iconColor: '#0069eb',
};
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
        name: 'Weread',
        path: '/record/weread',
        component: '/my-hub/weread/index',
        meta: { title: '微信读书', ...visual },
      },
    ],
  },
];
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
try {
  for (const width of [390, 820, 1440])
    for (const dark of [false, true]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => console.error(error.message));
      const fixtures = {
        '/auth/login': { accessToken: 'reading-stats-fixture' },
        '/user/info': {
          userId: '9007199254740993',
          id: '9007199254740993',
          username: 'fixture',
          realName: '模拟用户',
          roles: ['user'],
          homePath: '/',
        },
        '/auth/codes': [],
        '/menu/all': menus,
        '/menu/visuals': {
          menus: [visual],
          cards: { 'section.weread-stats': visual },
        },
        '/home/cards': [
          {
            cardKey: 'section.weread-stats',
            group: 'section',
            title: '阅读统计',
            isEnabled: 1,
            sortOrder: 0,
            ...visual,
          },
          {
            cardKey: 'section.thoughts',
            group: 'section',
            title: '闪念',
            isEnabled: 1,
            sortOrder: 1,
          },
        ],
        '/auth/secondary-lock/menus': [],
        '/message/unread-count': { count: 0 },
        '/message/list': [],
        '/message/page': { records: [], total: 0 },
        '/menu/preferences': { menus: [], hiddenMenuIds: [] },
        '/auth/wechat/web/capabilities': { enabled: false },
        '/dashboard/tasks': [],
        '/userbinds/list': [],
        '/thought/dashboard': [],
        '/weread/connection': { connected: false },
        '/timeTrackerCategory/all': [],
        '/timeTrackerCategory/list': [],
      };
      for (const [path, data] of Object.entries(fixtures)) {
        const respond = (route) =>
          route.fulfill({ json: { code: 0, message: null, data } });
        await page.route(`**/api${path}`, respond);
        await page.route(`**/api${path}?*`, respond);
      }
      let empty = false;
      let fail = false;
      let single = false;
      await page.route('**/api/home/sections/weread-stats?*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 450));
        if (fail)
          return route.fulfill({ json: { code: 1, message: '模拟失败' } });
        const granularity = new URL(route.request().url()).searchParams.get(
          'granularity',
        );
        const count = { week: 7, month: 30, year: 12 }[granularity];
        const buckets = Array.from({ length: count }, (_, i) => {
          let key = `2026-11-${String(i + 1).padStart(2, '0')}`;
          let label = String(i + 1);
          if (granularity === 'week') {
            key = `2026-11-${String(i + 2).padStart(2, '0')}`;
            label = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i];
          } else if (granularity === 'year') {
            key = `2026-${String(i + 1).padStart(2, '0')}`;
            label = `${i + 1}月`;
          }
          let seconds = [3000, 9000, 1200][i] || 0;
          if (empty) seconds = 0;
          else if (single) seconds = Number(i === 0) * 10;
          return { key, label, seconds };
        });
        const totalSeconds = buckets.reduce(
          (sum, bucket) => sum + bucket.seconds,
          0,
        );
        return route.fulfill({
          json: {
            code: 0,
            message: null,
            data: {
              connected: true,
              granularity,
              periodStart: '2026-11-02',
              periodEnd: '2026-11-08',
              elapsedDays: 3,
              buckets,
              totalSeconds,
              dailyAverageSeconds: Math.round(totalSeconds / 3),
              previousPeriodStart: '2026-10-26',
              previousPeriodEnd: '2026-10-28',
              previousTotalSeconds: 9300,
              refreshInterval: 600,
            },
          },
        });
      });
      await page.goto(`${origin}/auth/login`);
      await page
        .locator('input:not([type="password"])')
        .first()
        .fill('fixture');
      await page.locator('input[type="password"]').fill('fixture-password');
      await page
        .locator('button')
        .filter({ hasText: /^登录$/ })
        .click();
      const card = page.getByLabel('微信读书阅读统计', { exact: true });
      await expect(card)
        .toBeVisible({ timeout: 20_000 })
        .catch(async (error) => {
          console.error(await page.locator('body').innerText());
          console.error(page.url());
          await page.screenshot({ path: `${output}/failure.png` });
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
        page.evaluate(() => ({
          height: document
            .querySelector('[aria-label="微信读书阅读统计"]')
            .getBoundingClientRect().height,
          nextTop: document
            .querySelector('[data-card-key="section.thoughts"]')
            .getBoundingClientRect().top,
        }));
      const loading = await geometry();
      await expect(card).toContainText('比上周');
      assert.deepEqual(await geometry(), loading);
      for (const [label, text] of [
        ['周', '比上周'],
        ['月', '比上月'],
        ['年', '比上年'],
      ]) {
        await card.getByLabel(`按${label}统计`).click();
        await expect(card).toContainText(text);
        await expect(card).toHaveAttribute('aria-busy', 'false');
        await page.waitForTimeout(300);
        await card.screenshot({
          path: `${output}/${width}-${dark ? 'dark' : 'light'}-${label}.png`,
        });
        assert.equal(
          await card.evaluate((el) => el.scrollWidth > el.clientWidth + 1),
          false,
        );
        assert.deepEqual(await geometry(), loading);
      }
      empty = true;
      await card.getByLabel('按周统计').click();
      await expect(card).toContainText('本周还没有阅读记录');
      await expect(card).toHaveAttribute('aria-busy', 'false');
      await page.waitForTimeout(300);
      await card.screenshot({
        path: `${output}/${width}-${dark ? 'dark' : 'light'}-empty.png`,
      });
      assert.deepEqual(await geometry(), loading);
      empty = false;
      single = true;
      await card.getByLabel('按月统计').click();
      await expect(card).toContainText('不足 1 分钟');
      fail = true;
      await card.getByLabel('按年统计').click();
      await expect(
        card.getByRole('button', { name: '阅读统计加载失败，重试' }),
      ).toBeVisible();
      assert.deepEqual(await geometry(), loading);
      fail = false;
      await card
        .getByRole('button', { name: '阅读统计加载失败，重试' })
        .click();
      await expect(card).toHaveAttribute('aria-busy', 'false');
      await expect(
        card.getByRole('button', { name: '阅读统计加载失败，重试' }),
      ).toHaveCount(0);
      await expect(card).toContainText('比上年');
      assert.deepEqual(await geometry(), loading);
      await context.close();
      console.log(`PASS ${width} ${dark ? 'dark' : 'light'}`);
    }
} finally {
  await browser.close();
}

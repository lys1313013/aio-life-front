import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

import { chromium, expect } from '@playwright/test';

const origin = process.env.HOME_CARDS_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/github-recent-commits';
const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
await mkdir(output, { recursive: true });
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
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const fixtures = {
        '/auth/login': { accessToken: 'github-fixture' },
        '/user/info': {
          userId: '9007199254740993',
          id: '9007199254740993',
          username: 'fixture',
          realName: '测试用户',
          roles: ['user'],
          homePath: '/',
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
                name: 'Home',
                path: '/',
                component: '/dashboard/home/index',
                meta: { title: '首页', keepAlive: true },
              },
            ],
          },
        ],
        '/menu/visuals': {
          menus: [],
          cards: { 'section.github': { icon: 'mdi:github' } },
        },
        '/home/cards': ['github', 'thoughts'].map((key, sortOrder) => ({
          cardKey: `section.${key}`,
          group: 'section',
          title: key,
          enabled: true,
          sortOrder,
        })),
        '/auth/secondary-lock/menus': [],
        '/message/unread-count': { count: 0 },
        '/message/list': [],
        '/message/page': { records: [], total: 0 },
        '/menu/preferences': { menus: [], hiddenMenuIds: [] },
        '/auth/wechat/web/capabilities': { enabled: false },
        '/dashboard/tasks': [
          { type: 'GITHUB', title: 'GitHub', icon: 'mdi:github' },
        ],
        '/userbinds/list': [
          { platform: 'github', platformUsername: 'fixture' },
        ],
        '/thought/dashboard': [
          {
            id: 'thought-1',
            content: '后续卡片位置对照',
            createTime: '2026-10-05 10:00:00',
          },
        ],
        '/timeTrackerCategory/all': [],
      };
      for (const [path, data] of Object.entries(fixtures)) {
        const respond = (route) => route.fulfill({ json: { code: 0, data } });
        await page.route(`**/api${path}`, respond);
        await page.route(`**/api${path}?*`, respond);
      }
      let fail = true;
      let rows = [];
      let release;
      let gate = new Promise((resolve) => {
        release = resolve;
      });
      await page.route('**/api/github/recent-commits?*', async (route) => {
        await gate;
        await route.fulfill({
          json: fail
            ? { code: 1, message: 'GitHub 最近提交查询失败，请稍后重试' }
            : { code: 0, data: rows },
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
      const card = page.locator('.dashboard-section').filter({
        has: page.getByRole('button', { name: '刷新最近提交', exact: true }),
      });
      await expect(card).toBeVisible({ timeout: 15_000 });
      await page.evaluate(
        async ({ module, dark }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { module: preferencesModule, dark },
      );
      await expect(
        page
          .locator('.dashboard-section')
          .filter({ hasText: '后续卡片位置对照' }),
      ).toBeVisible();
      await page.waitForFunction(
        (expected) =>
          document.documentElement.classList.contains('dark') === expected,
        dark,
      );
      // Wait for theme color transitions before visual inspection.
      await page.waitForTimeout(350);
      const geometry = () =>
        page.evaluate(() => {
          const rect = document
            .querySelector('[data-card-key="section.github"]')
            .getBoundingClientRect();
          const next = document
            .querySelector('[data-card-key="section.thoughts"]')
            .getBoundingClientRect();
          return { height: rect.height, nextTop: next.top - rect.top };
        });
      const initial = await geometry();
      release();
      const retry = card.getByRole('button', {
        name: '最近提交加载失败，重试',
        exact: true,
      });
      await expect(retry).toBeVisible();
      await expect(card).toContainText('最近提交加载失败');
      await expect(card).not.toContainText('暂无最近提交');
      await expect(card).not.toContainText('绑定');
      assert.deepEqual(await geometry(), initial);
      await card.screenshot({
        path: `${output}/${width}-${dark ? 'dark' : 'light'}-error.png`,
      });
      fail = false;
      gate = new Promise((resolve) => {
        release = resolve;
      });
      await retry.click();
      await expect(retry).toBeDisabled();
      await expect(retry).toHaveAttribute('aria-busy', 'true');
      await expect(card).toContainText('最近提交加载失败');
      assert.deepEqual(await geometry(), initial);
      release();
      await expect(card).toContainText('暂无最近提交');
      await expect(card).not.toContainText('绑定');
      assert.deepEqual(await geometry(), initial);
      const refresh = card.getByRole('button', {
        name: '刷新最近提交',
        exact: true,
      });
      gate = new Promise((resolve) => {
        release = resolve;
      });
      await refresh.click();
      await expect(refresh).toHaveAttribute('aria-busy', 'true');
      await expect(card).toContainText('暂无最近提交');
      assert.deepEqual(await geometry(), initial);
      release();
      await expect(refresh).toBeEnabled();
      for (const count of [1, 8]) {
        rows = Array.from({ length: count }, (_, i) => ({
          id: String(i),
          repo: 'fixture',
          message: `模拟提交 ${i} 长文本检查手机平板桌面的展示与溢出`.repeat(3),
          date: '2026-10-13T00:00:00Z',
        }));
        await refresh.click();
        await expect(card).toContainText(`模拟提交 ${count - 1}`);
        assert.deepEqual(await geometry(), initial);
        gate = new Promise((resolve) => {
          release = resolve;
        });
        await refresh.click();
        await expect(refresh).toHaveAttribute('aria-busy', 'true');
        await expect(card).toContainText(`模拟提交 ${count - 1}`);
        assert.deepEqual(await geometry(), initial);
        release();
        await expect(refresh).toBeEnabled();
      }
      fail = true;
      await refresh.click();
      await expect(retry).toBeVisible();
      await expect(card).toContainText('模拟提交 7');
      assert.deepEqual(await geometry(), initial);
      assert.equal(
        await card.evaluate((el) => el.scrollWidth > el.clientWidth),
        false,
      );
      assert.deepEqual(errors, []);
      results.push({ width, dark, ...initial });
      await context.close();
    }
  await writeFile(`${output}/geometry.json`, JSON.stringify(results, null, 2));
  console.log(
    'GitHub recent commits: 6 viewport/theme combinations passed; failure/retry/empty/single/multiple/long text/refresh and geometry verified.',
  );
} finally {
  await browser.close();
}

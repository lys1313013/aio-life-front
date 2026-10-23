import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

import { chromium, expect } from '@playwright/test';

const origin = process.env.HOME_CARDS_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/home-device';
await mkdir(output, { recursive: true });
const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const width of [390, 820, 1440])
    for (const dark of [false, true]) {
      const context = await browser.newContext({
        viewport: { width, height: 1100 },
      });
      const page = await context.newPage();
      const id = '9223372036854775807';
      let detail = {
        id,
        name: '模拟电脑',
        type: '81',
        status: '1',
        spec: '模拟完整配置',
        purchasePrice: null,
        purchaseDate: null,
        endDate: null,
        purchasePlace: '模拟渠道',
        remark: '完整备注需要保留',
        fileId: null,
      };
      let deleted = false;
      let failed = false;
      let slow = false;
      let release;
      let saved;
      const calls = [];
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const fixtures = {
        '/auth/login': { accessToken: 'fixture-home-device' },
        '/user/info': {
          userId: '9007199254740993',
          id: '9007199254740993',
          username: 'fixture',
          realName: '测试用户',
          roles: ['user'],
          homePath: '/',
        },
        '/auth/codes': [],
        '/menu/visuals': {
          menus: [],
          cards: {
            'section.device': {
              menuId: 'device-menu',
              path: '/my-hub/device',
              icon: 'solar:devices-line-duotone',
            },
          },
        },
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
              {
                name: 'Device',
                path: '/my-hub/device',
                component: '/my-hub/device/index',
                meta: { title: '设备', menuId: 'device-menu', keepAlive: true },
              },
            ],
          },
        ],
        '/auth/secondary-lock/menus': [],
        '/message/unread-count': { count: 0 },
        '/menu/preferences': { menus: [], hiddenMenuIds: [] },
        '/auth/wechat/web/capabilities': { enabled: false },
        '/home/cards': [
          {
            cardKey: 'section.device',
            title: '我的设备',
            group: 'section',
            enabled: true,
            sortOrder: 0,
          },
        ],
        '/quick-nav/candidates': [{ path: '/my-hub/device' }],
        '/userDictType/getByDictType': {
          dictDetailList: [{ id: '81', dictLabel: '电脑' }],
        },
        '/sysDictType/getByDictType': {
          dictDetailList: [{ value: '1', label: '使用中' }],
        },
      };
      await page.route('**/api/**', async (route) => {
        const pathname = new URL(route.request().url()).pathname;
        if (!pathname.startsWith('/api/')) return route.continue();
        const path = pathname.slice(4);
        calls.push(path);
        if (path === `/device/${id}`) {
          if (route.request().method() === 'PUT') {
            saved = route.request().postDataJSON();
            detail = { ...detail, ...saved };
          }
          if (route.request().method() === 'DELETE') deleted = true;
          if (slow)
            await new Promise((resolve) => {
              release = resolve;
            });
          return route.fulfill({
            json: failed
              ? { code: 1, message: '模拟详情失败' }
              : { code: 0, data: detail },
          });
        }
        let data = fixtures[path] ?? [];
        if (path === '/home/sections/device') {
          data = {
            items: deleted
              ? []
              : [{ id, name: detail.name, usageDays: null, dailyCost: null }],
            refreshInterval: 600,
          };
        } else if (path === '/device/query') {
          data = { items: deleted ? [] : [detail], total: deleted ? 0 : 1 };
        }
        return route.fulfill({ json: { code: 0, data } });
      });
      await page.goto(`${origin}/auth/login`);
      await page
        .locator('input:not([type="password"])')
        .first()
        .fill('fixture')
        .catch(async (error) => {
          console.error({
            errors,
            url: page.url(),
            text: await page.locator('body').innerText(),
          });
          await page.waitForTimeout(350);
          await page.screenshot({ path: `${output}/login-error.png` });
          throw error;
        });
      await page.locator('input[type="password"]').fill('fixture-password');
      await page
        .locator('button')
        .filter({ hasText: /^登录$/ })
        .click();
      const card = page.locator('section[aria-label="我的设备"]');
      await expect(card)
        .toBeVisible({ timeout: 20_000 })
        .catch(async (error) => {
          console.error({
            errors,
            calls,
            url: page.url(),
            text: await page.locator('body').innerText(),
          });
          throw error;
        });
      await page.evaluate(
        async ({ dark, module }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { dark, module: preferencesModule },
      );
      await page
        .locator('.ant-notification-notice-close')
        .first()
        .click()
        .catch(() => {});
      const homeUrl = page.url();
      await card.getByRole('button', { name: /模拟电脑/ }).click();
      const editor = page.getByRole('dialog', {
        name: '编辑设备',
        exact: true,
      });
      await expect(editor.locator('input').first()).toHaveValue('模拟电脑');
      assert.equal(page.url(), homeUrl);
      await page.waitForTimeout(350);
      await page.screenshot({
        path: `${output}/editor-${width}-${dark ? 'dark' : 'light'}.png`,
      });
      await editor.locator('input').first().fill('修改后的电脑');
      await editor
        .getByRole('button', { name: /保\s*存/, exact: true })
        .click();
      await expect(editor).toBeHidden();
      await expect(card).toContainText('修改后的电脑');
      assert.equal(saved.remark, '完整备注需要保留');
      assert.equal(saved.purchaseDate, null);
      assert.equal(saved.purchasePrice, null);
      assert.equal(page.url(), homeUrl);
      failed = true;
      await card.getByRole('button', { name: /修改后的电脑/ }).click();
      await expect(
        editor.getByRole('button', { name: '重新加载详情' }),
      ).toBeVisible();
      failed = false;
      await editor.getByRole('button', { name: '重新加载详情' }).click();
      await expect(editor.locator('input').first()).toHaveValue('修改后的电脑');
      await editor
        .getByRole('button', { name: /取\s*消/, exact: true })
        .click();
      slow = true;
      await card.getByRole('button', { name: /修改后的电脑/ }).click();
      await expect.poll(() => typeof release).toBe('function');
      await editor
        .getByRole('button', { name: /取\s*消/, exact: true })
        .click();
      slow = false;
      release();
      await expect(editor).toBeHidden();
      await card.getByRole('button', { name: /修改后的电脑/ }).click();
      await expect(editor.locator('input').first()).toHaveValue('修改后的电脑');
      await editor
        .getByRole('button', { name: /删\s*除/, exact: true })
        .click();
      await page
        .locator('.ant-popover')
        .getByRole('button', { name: /删\s*除/, exact: true })
        .click();
      await expect(editor).toBeHidden();
      await expect(card).toContainText('暂无在用设备');
      assert.equal(page.url(), homeUrl);
      assert.ok(!calls.includes('/device/query'));
      await card.getByRole('button', { name: '我的设备', exact: true }).click();
      await expect(page).toHaveURL(/my-hub\/device/);
      await expect(page.locator('.device-page')).toBeVisible();
      assert.deepEqual(errors, []);
      console.log(
        `PASS home device ${width} ${dark ? 'dark' : 'light'}: save, retry, cancel stale response, delete, title navigation`,
      );
      await context.close();
    }
} finally {
  await browser.close();
}

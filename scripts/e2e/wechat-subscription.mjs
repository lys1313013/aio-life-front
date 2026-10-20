import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// 真实 Web 页面 + 隔离接口数据；不请求或修改真实用户通知配置。
import { chromium } from '@playwright/test';

const origin = process.env.WECHAT_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/wechat-subscription';
const preferencesModule = `/@fs${
  new URL('../../packages/@core/preferences/src/index.ts', import.meta.url)
    .pathname
}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
try {
  const page = await browser.newPage();
  const errors = [];
  const writes = [];
  let bound = false;
  let enabled = false;
  const preferences = [
    {
      bizType: 'LEETCODE_REMINDER',
      description: '力扣未打卡提醒',
      visible: true,
      channels: [
        { channel: 'EMAIL', enabled: true },
        { channel: 'WECHAT_MINI', enabled: false },
      ],
    },
  ];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(`${origin}/api/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    let data = [];
    if (path === '/auth/login') data = { accessToken: 'wechat-web-fixture' };
    if (path === '/user/info')
      data = {
        id: '9223372036854775807',
        userId: '9223372036854775807',
        username: 'fixture',
        realName: '通知测试用户',
        roles: ['user'],
        homePath: '/profile?tab=notice',
      };
    if (path === '/menu/all')
      data = [
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
              meta: { title: '个人中心' },
            },
          ],
        },
      ];
    if (path === '/auth/wechat/web/capabilities') data = { enabled: false };
    if (path === '/menu/preferences') data = { menus: [], hiddenMenuIds: [] };
    if (path === '/message/unread-count') data = { count: 0 };
    if (path === '/notification/channels/feishu')
      data = { configured: false, enabled: false, bound: false };
    if (path === '/notification/channels/wechat-mini')
      data = {
        enabled,
        bound,
        bizType: 'LEETCODE_REMINDER',
        templateId: enabled ? 'fixture-template' : null,
      };
    if (path === '/notification/preferences') {
      if (route.request().method() === 'PUT')
        writes.push(route.request().postDataJSON());
      data = preferences;
    }
    await route.fulfill({ json: { code: 0, data } });
  });
  await page.goto(`${origin}/auth/login`);
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page
    .locator('button')
    .filter({ hasText: /^登录$/ })
    .click();
  await page.getByText('暂未开通订阅消息', { exact: true }).waitFor();
  const wechat = page.getByRole('switch', {
    name: '力扣未打卡提醒微信',
    exact: true,
  });
  assert.equal(await wechat.isDisabled(), true);
  enabled = true;
  await page.reload();
  await page
    .getByText('请先通过微信登录绑定当前账号', { exact: true })
    .waitFor();
  assert.equal(await wechat.isDisabled(), true);
  bound = true;
  await page.reload();
  await page.getByText('请在微信小程序内订阅', { exact: true }).waitFor();
  assert.equal(await wechat.isDisabled(), false);
  for (const width of [390, 820, 1440])
    for (const dark of [false, true]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        async ({ module, dark }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { module: preferencesModule, dark },
      );
      await page.locator('.ant-spin-spinning').waitFor({ state: 'hidden' });
      await page.screenshot({
        path: `${output}/web-${width}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
    }
  await wechat.click();
  await page.getByRole('button', { name: '保存通知类型', exact: true }).click();
  await page.getByText('通知类型设置已保存', { exact: true }).waitFor();
  assert.deepEqual(writes, [
    {
      items: [
        { bizType: 'LEETCODE_REMINDER', channel: 'EMAIL', enabled: true },
        { bizType: 'LEETCODE_REMINDER', channel: 'WECHAT_MINI', enabled: true },
      ],
    },
  ]);
  assert.deepEqual(errors, []);
  console.log('PASS: Web 微信渠道三种状态、通知偏好保存、三类视口与深浅主题');
} finally {
  await browser.close();
}

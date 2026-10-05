import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';
// Real Web components with scoped API fixtures; never writes live user data.
const origin = process.env.MEMBERSHIP_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/membership-provider';
const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const providers = [
  {
    id: '900719925474099401',
    name: '腾讯视频',
    code: 'tencent_video',
    category: 'video',
    iconKey: 'tencent_video',
    sortOrder: 0,
    isEnabled: 1,
  },
  {
    id: '900719925474099402',
    name: '网易云音乐',
    code: 'netease_music',
    category: 'music',
    iconKey: 'netease_music',
    sortOrder: 1,
    isEnabled: 1,
  },
  {
    id: '900719925474099403',
    name: '家庭共享学习平台',
    code: 'family_study',
    category: 'study',
    iconKey: null,
    sortOrder: 2,
    isEnabled: 0,
  },
  {
    id: '900719925474099404',
    name: 'Claude',
    code: 'claude',
    category: 'AI',
    iconKey: null,
    sortOrder: 3,
    isEnabled: 1,
  },
];
const record = {
  id: '900719925474099410',
  name: '腾讯视频年度VIP',
  providerId: providers[0].id,
  providerName: '腾讯视频',
  providerIconKey: 'tencent_video',
  provider: '腾讯视频',
  category: 'video',
  expiryDate: '2027-10-05',
  startDate: '2026-10-05',
  price: 198,
  billingCycle: 'year',
  monthlyAmount: 16.5,
  status: 'active',
  remainingDays: 365,
  autoRenew: 0,
};
const fixtures = {
  '/auth/login': { accessToken: 'membership-fixture' },
  '/user/info': {
    id: '1',
    userId: '1',
    username: 'fixture',
    realName: '测试用户',
    roles: ['admin'],
    homePath: '/system/membership-providers',
  },
  '/auth/codes': ['admin'],
  '/menu/all': [
    {
      name: 'FixtureLayout',
      path: '/fixture',
      component: 'BasicLayout',
      meta: { title: '生活' },
      children: [
        {
          name: 'MembershipProviderAdmin',
          path: '/system/membership-providers',
          component: '/system/membership-providers/index',
          meta: { title: '会员平台' },
        },
        {
          name: 'Membership',
          path: '/membership',
          component: '/membership/index',
          meta: { title: '会员' },
        },
      ],
    },
  ],
  '/auth/secondary-lock/menus': [],
  '/message/unread-count': { count: 0 },
  '/message/list': [],
  '/menu/preferences': { menus: [], hiddenMenuIds: [] },
  '/auth/wechat/web/capabilities': { enabled: false },
  '/membership/list': [record],
  '/membership/stats': {
    activeCount: 1,
    expiringCount: 0,
    expiredCount: 0,
    expiringThisMonthCount: 0,
    monthlyAmount: 16.5,
  },
  '/membership/providers': providers.filter((p) => p.isEnabled === 1),
  '/membership/provider-icons': [
    {
      key: 'tencent_video',
      name: '腾讯视频',
      url: '/api/membership/provider-icons/tencent_video',
    },
    {
      key: 'netease_music',
      name: '网易云音乐',
      url: '/api/membership/provider-icons/netease_music',
    },
  ],
};
for (const [path, data] of Object.entries(fixtures))
  for (const suffix of ['', '?*'])
    await page.route(`**/api${path}${suffix}`, (r) =>
      r.fulfill({ json: { rscode: '0', data } }),
    );
const writes = [];
await page.route('**/api/system/membership-providers', async (r) => {
  if (r.request().method() === 'GET')
    return r.fulfill({ json: { rscode: '0', data: providers } });
  const data = r.request().postDataJSON();
  const saved = { ...data, id: '900719925474099420' };
  providers.push(saved);
  writes.push({ method: 'POST', data });
  return r.fulfill({ json: { rscode: '0', data: saved } });
});
await page.route('**/api/system/membership-providers/*', async (r) => {
  const id = new URL(r.request().url()).pathname.split('/').at(-1);
  const idx = providers.findIndex((p) => p.id === id);
  const method = r.request().method();
  if (method === 'DELETE') {
    providers.splice(idx, 1);
    writes.push({ method, id });
    return r.fulfill({ json: { rscode: '0', data: null } });
  }
  const data = r.request().postDataJSON();
  const saved = { ...data, id };
  providers[idx] = saved;
  writes.push({ method, id, data });
  return r.fulfill({ json: { rscode: '0', data: saved } });
});
await page.route('**/api/membership', (r) => {
  const data = r.request().postDataJSON();
  writes.push({ method: 'MEMBERSHIP', data });
  return r.fulfill({
    json: {
      rscode: '0',
      data: {
        ...record,
        ...data,
        providerName: providers.find((p) => p.id === data.providerId)?.name,
        providerIconKey: providers.find((p) => p.id === data.providerId)
          ?.iconKey,
      },
    },
  });
});
await page.route('**/api/membership/provider-icons/*', async (r) => {
  const key = new URL(r.request().url()).pathname.split('/').at(-1);
  try {
    const body = await readFile(
      new URL(
        `../../../aio-life-server/src/main/resources/static/membership-icons/${key}.png`,
        import.meta.url,
      ),
    );
    return r.fulfill({ contentType: 'image/png', body });
  } catch {
    errors.push(`Missing logo fixture: ${key}`);
    return r.fulfill({ status: 404 });
  }
});
try {
  await page.goto(`${origin}/auth/login`);
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page
    .locator('button')
    .filter({ hasText: /^登录$/ })
    .click();
  await page
    .getByRole('button', { name: '新增会员平台', exact: true })
    .waitFor({ timeout: 30_000 });
  await page
    .getByText('登录成功', { exact: true })
    .waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '编辑腾讯视频', exact: true }).click();
  const modal = page.locator('.ant-modal:visible');

  await modal.locator('input').first().fill('腾讯视频测试');
  await modal.locator('[data-modal-confirm]').click();
  await page
    .getByRole('button', { name: '编辑腾讯视频测试', exact: true })
    .waitFor();
  assert.equal(writes.at(-1).id, '900719925474099401');
  await page.getByRole('switch', { name: '停用腾讯视频测试' }).click();
  await page.getByRole('switch', { name: '启用腾讯视频测试' }).waitFor();
  assert.equal(writes.at(-1).data.isEnabled, 0);
  await page.getByRole('button', { name: '新增会员平台', exact: true }).click();
  await modal.locator('#form_item_name').fill('自建平台');
  await modal.locator('#form_item_code').fill('custom_platform');
  await modal.locator('[data-modal-confirm]').click();
  await page
    .getByRole('button', { name: '编辑自建平台', exact: true })
    .waitFor();
  assert.equal(writes.at(-1).method, 'POST');
  assert.equal(writes.at(-1).data.iconKey, null);
  await page.getByRole('button', { name: '删除自建平台', exact: true }).click();
  await page
    .locator('.ant-popconfirm')
    .getByRole('button', { name: /确\s*定/ })
    .click();
  await page
    .getByRole('button', { name: '编辑自建平台', exact: true })
    .waitFor({ state: 'hidden' });
  assert.equal(writes.at(-1).method, 'DELETE');

  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const dark of [false, true]) {
      await page.evaluate(
        async ({ dark, module }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { dark, module: preferencesModule },
      );
      await page.waitForTimeout(150);
      await page.screenshot({
        path: `${output}/admin-${width}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page
        .getByRole('button', { name: '新增会员平台', exact: true })
        .click();
      await modal.locator('input').first().waitFor();
      await page.waitForTimeout(350);
      await page.screenshot({
        path: `${output}/editor-${width}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      const box = await modal.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
      await modal.getByRole('button', { name: /取\s*消/ }).click();
    }
  }
  await page.setViewportSize({ width: 820, height: 1000 });
  await page.goto(`${origin}/membership`);
  await page.getByText(record.name, { exact: true }).click();
  await modal.locator('.ant-select').first().click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option')
    .filter({ hasText: /\bAI\b/ })
    .click();
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const dark of [false, true]) {
      await page.evaluate(
        async ({ dark, module }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { dark, module: preferencesModule },
      );
      await modal.locator('.ant-select').nth(1).click();
      const options = page
        .locator('.ant-select-dropdown:visible')
        .last()
        .locator('.ant-select-item-option');
      await options.filter({ hasText: 'Claude' }).waitFor();
      const optionLabels = await options
        .locator('.ant-select-item-option-content')
        .allTextContents();
      assert.deepEqual(
        optionLabels.map((text) => text.trim()),
        ['Claude'],
      );
      await page.screenshot({
        path: `${output}/category-AI-${width}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      await modal.locator('#form_item_name').click();
      await options.waitFor({ state: 'hidden' });
    }
  }
  await modal.locator('.ant-select').first().click();
  await page
    .locator('.ant-select-dropdown:visible .ant-select-item-option')
    .filter({ hasText: '音乐' })
    .click();
  await modal.locator('.ant-select').nth(1).click();
  assert.equal(
    await page
      .locator('.ant-select-dropdown:visible .ant-select-item-option')
      .filter({ hasText: '腾讯视频' })
      .count(),
    0,
  );
  await page
    .locator('.ant-select-item-option')
    .filter({ hasText: '网易云音乐' })
    .click();
  const selectedCategory = await modal
    .locator('.ant-select')
    .first()
    .innerText();
  assert.ok(selectedCategory.includes('音乐'));
  await modal.locator('[data-modal-confirm]').click();
  await page.waitForTimeout(300);
  assert.equal(writes.at(-1).data.providerId, providers[1].id);
  assert.equal(writes.at(-1).data.category, 'music');
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const dark of [false, true]) {
      await page.evaluate(
        async ({ dark, module }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { dark, module: preferencesModule },
      );
      await page.waitForTimeout(150);
      await page.screenshot({
        path: `${output}/records-${width}-${dark ? 'dark' : 'light'}.png`,
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({ screenshots: 24, writes: writes.length, errors }, null, 2),
  );
} finally {
  await browser.close();
}

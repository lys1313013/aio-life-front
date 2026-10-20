import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

import { chromium } from '@playwright/test';

const origin = process.env.BODY_PROFILE_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/body-profile';
await mkdir(output, { recursive: true });
const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
const empty = {
  id: null,
  version: 0,
  updateTime: null,
  bmi: null,
  gender: null,
  heightCm: null,
  weightKg: null,
  bodyFatPercent: null,
  shoulderWidthCm: null,
  chestCm: null,
  upperArmCm: null,
  forearmCm: null,
  waistCm: null,
  hipCm: null,
  thighCm: null,
  calfCm: null,
  inseamCm: null,
  measurementSide: null,
  armState: null,
  topSize: null,
  trousersSize: null,
  shoeSize: null,
  shoeSystem: null,
};
let profile = {
  ...empty,
  id: '9223372036854775807',
  version: 1,
  updateTime: '2026-10-20T12:00:00',
  gender: 'male',
  heightCm: 178,
  weightKg: 72,
  bodyFatPercent: 18.5,
  shoulderWidthCm: 45,
  chestCm: 94,
  waistCm: 80,
  hipCm: 96,
  upperArmCm: 32,
  forearmCm: 27,
  thighCm: 54,
  calfCm: 36,
  shoeSize: '42',
  shoeSystem: 'EU',
  topSize: 'L',
  trousersSize: 'W30',
  inseamCm: 81,
};
let delay = 0;
let failRead = false;
let failSave = false;
let reads = 0;
const errors = [];
const writes = [];
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(15_000);
  page.on('pageerror', (error) => errors.push(error.message));
  const fixtures = {
    '/auth/login': { accessToken: 'body-profile-fixture' },
    '/user/info': {
      userId: '7',
      id: '7',
      username: 'fixture',
      realName: '模拟用户',
      nickname: '模拟用户',
      roles: ['admin'],
      homePath: '/profile?tab=basic',
    },
    '/auth/codes': ['admin'],
    '/menu/all': [
      {
        name: 'Demos',
        path: '/record',
        component: 'BasicLayout',
        meta: { title: '记录', icon: 'ic:baseline-view-in-ar' },
        children: [
          {
            name: 'BodyProfile',
            path: '/record/body-profile',
            component: 'my-hub/body-profile/index',
            meta: {
              title: '身体数据',
              icon: 'mdi:human-handsup',
              menuId: '1511',
            },
          },
        ],
      },
      {
        name: 'Profile',
        path: '/profile',
        component: '_core/profile/index',
        meta: { title: '个人中心', hideInMenu: true },
      },
    ],
    '/auth/secondary-lock/menus': [],
    '/message/unread-count': { count: 0 },
    '/message/list': [],
    '/message/page': { items: [], total: 0 },
    '/menu/visuals': { menus: [], cards: {} },
    '/menu/preferences': { menus: [], hiddenMenuIds: [] },
    '/auth/wechat/web/capabilities': { enabled: false },
  };
  await page.route('**/api/**', async (route) => {
    if (!new URL(route.request().url()).pathname.startsWith('/api/'))
      return route.fallback();
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    if (path === '/body-profile') {
      if (request.method() === 'PUT') {
        const data = request.postDataJSON();
        writes.push(data);
        if (failSave)
          return route.fulfill({ json: { code: 1, message: '模拟保存失败' } });
        assert.equal(data.version, profile.version);
        for (const key of ['id', 'bmi', 'userId', 'updateTime'])
          assert.equal(Object.hasOwn(data, key), false);
        profile = {
          ...profile,
          ...data,
          id: profile.id || '9223372036854775807',
          version: data.version + 1,
          updateTime: '2026-10-20T12:01:00',
        };
      } else {
        reads++;
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        if (failRead)
          return route.fulfill({ json: { code: 1, message: '模拟读取失败' } });
      }
      profile.bmi =
        profile.heightCm && profile.weightKg
          ? Number(
              (profile.weightKg / (profile.heightCm / 100) ** 2).toFixed(1),
            )
          : null;
      return route.fulfill({ json: { code: 0, data: profile } });
    }
    if (Object.hasOwn(fixtures, path))
      return route.fulfill({ json: { code: 0, data: fixtures[path] } });
    console.error('Unmocked API:', path);
    return route.abort();
  });
  await page.goto(`${origin}/auth/login`);
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page
    .locator('button')
    .filter({ hasText: /^登录$/ })
    .click();
  await page.getByText('基本设置', { exact: true }).waitFor();
  assert.equal(await page.getByText('身体档案', { exact: true }).count(), 0);
  await page.getByText('记录', { exact: true }).first().click();
  await page.getByText('身体数据', { exact: true }).click();
  await page.waitForURL('**/record/body-profile');
  const body = page.locator('.body-profile');
  await body.waitFor({ timeout: 30_000 });
  await page
    .getByText('登录成功', { exact: true })
    .waitFor({ state: 'hidden' });
  const bmi = body.locator('[data-testid="body-bmi"]');
  assert.equal(await bmi.innerText(), '22.7');
  assert.equal(await body.getByRole('combobox').count(), 0);

  for (const width of [390, 768, 1440])
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        async ({ url, theme }) => {
          const { updatePreferences } = await import(url);
          updatePreferences({ theme: { mode: theme } });
        },
        { url: preferencesModule, theme },
      );
      await page.waitForTimeout(100);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page.screenshot({
        path: `${output}/${width}-${theme}.png`,
        fullPage: true,
        animations: 'disabled',
      });
      await body
        .getByRole('button', { name: '编辑身体数据', exact: true })
        .click();
      await page.screenshot({
        path: `${output}/${width}-${theme}-editor.png`,
        fullPage: true,
        animations: 'disabled',
      });
      await page
        .getByRole('dialog')
        .getByRole('button', { name: /取\s*消/ })
        .click();
      await page.locator('.ant-modal-wrap').waitFor({ state: 'hidden' });
    }
  await body.getByRole('button', { name: '编辑身体数据', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog
    .locator('.ant-form-item')
    .filter({ hasText: '性别' })
    .locator('.ant-select')
    .click();
  await page
    .locator('.ant-select-dropdown:visible')
    .getByText('女', { exact: true })
    .click();
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(profile.gender, 'female');
  await body.getByRole('button', { name: /^编辑上臂围/ }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('spinbutton', { name: /^上臂围/ }).fill('33.5');
  failSave = true;
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(
    await dialog.getByRole('spinbutton', { name: /^上臂围/ }).inputValue(),
    '33.5',
  );
  failSave = false;
  const beforeSaveReads = reads;
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(profile.upperArmCm, 33.5);
  assert.equal(reads, beforeSaveReads);
  await body.getByRole('button', { name: /^编辑身高/ }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('spinbutton', { name: /^身高/ }).fill('');
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(profile.heightCm, null);
  assert.equal(await bmi.innerText(), '—');

  failRead = true;
  await page.reload();
  await body.getByText('模拟读取失败', { exact: true }).waitFor();
  assert.equal(
    await body
      .getByRole('button', { name: '编辑身体数据', exact: true })
      .isDisabled(),
    true,
  );
  failRead = false;
  delay = 400;
  await body.getByRole('button', { name: '重试', exact: true }).click();
  await page.waitForTimeout(600);
  assert.equal(
    await body
      .getByRole('button', { name: '编辑身体数据', exact: true })
      .isEnabled(),
    true,
  );
  profile = { ...empty };
  delay = 400;
  await page.reload();
  await body.waitFor();
  const before = await body.locator('.profile-anatomy').boundingBox();
  await page.waitForTimeout(600);
  const after = await body.locator('.profile-anatomy').boundingBox();
  assert.equal(before.height, after.height);
  await page.screenshot({ path: `${output}/empty.png`, fullPage: true });
  await page.goto(`${origin}/profile?tab=body-profile`);
  await page.waitForURL('**/record/body-profile');
  await body.waitFor();
  assert.deepEqual(errors, []);
  console.log(
    `Web body profile passed: 6 viewport/theme screenshots, current-state save/clear, failure retry, local updates, initial failure guard, stable empty layout; ${writes.length} writes.`,
  );
} finally {
  await browser.close();
}

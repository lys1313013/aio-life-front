import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium, expect } from '@playwright/test';
const require = createRequire(import.meta.url);
const { setupMapFixture } = require('./footprint-map-fixture.cjs');
const origin = process.env.FOOTPRINT_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/life-footprint-periods';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const state = await setupMapFixture(page);
  state.records[1].startDate = state.records[0].startDate;
  state.records[1].endDate = state.records[0].endDate;
  const firstId = state.records[0].id,
    secondId = state.records[1].id,
    otherId = state.records[2].id;
  const fixtures = {
    '/auth/login': { accessToken: 'synthetic-footprint-token' },
    '/user/info': {
      userId: '7',
      id: '7',
      username: 'fixture',
      realName: '模拟用户',
      roles: ['admin'],
      homePath: '/record/life-footprints',
    },
    '/auth/codes': ['admin'],
    '/menu/all': [
      {
        name: 'Demos',
        path: '/record',
        component: 'BasicLayout',
        meta: { title: '记录', icon: 'mdi:map-marker-path' },
        children: [
          {
            name: 'LifeFootprints',
            path: '/record/life-footprints',
            component: 'my-hub/life-footprints/index',
            meta: { title: '生活足迹', menuId: '1512' },
          },
        ],
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
    const url = new URL(route.request().url());
    if (
      url.origin !== new URL(origin).origin ||
      !url.pathname.startsWith('/api/')
    )
      return route.fallback();
    if (await state.handle(route)) return;
    return route.fulfill({
      json: {
        code: 0,
        data: fixtures[url.pathname.replace(/^\/api/, '')] ?? [],
      },
    });
  });
  await page.goto(origin + '/auth/login');
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page
    .locator('button')
    .filter({ hasText: /^登录$/ })
    .click();
  await page.waitForURL('**/record/life-footprints');
  const main = page.locator('.footprints'),
    dialog = page.getByRole('dialog');
  await expect(main.locator('.footprint-row')).toHaveCount(2);
  const firstPeriod = main.locator('.footprint-row').first();
  await expect(firstPeriod.locator('.footprint-place')).toHaveCount(2);
  const placeRows = await firstPeriod
    .locator('.footprint-place')
    .evaluateAll((nodes) =>
      nodes.map((el) => ({
        y: el.getBoundingClientRect().y,
        height: el.getBoundingClientRect().height,
      })),
    );
  assert(placeRows[1].y >= placeRows[0].y + placeRows[0].height);
  await expect(main.locator('.footprint-detail')).toHaveCount(0);
  // 无需先选地图或时间段，就能从左侧直接打开编辑。
  await firstPeriod
    .getByRole('button', { name: '编辑生活足迹', exact: true })
    .click();
  await expect(dialog.locator('.editor-detail-row')).toHaveCount(2);
  await expect(dialog.locator('.footprint-map-hit')).toHaveCount(2);
  await dialog
    .getByRole('textbox', { name: '备注', exact: true })
    .fill('第一条的修改');
  await dialog.locator('.editor-detail-row').nth(1).click();
  await expect(
    dialog.getByRole('combobox', { name: '地点', exact: true }),
  ).toHaveValue('文三路254号院');
  await dialog.locator('.editor-detail-row').first().click();
  await expect(
    dialog.getByRole('textbox', { name: '备注', exact: true }),
  ).toHaveValue('第一条的修改');
  const mapInstances = await dialog.locator('.tencent-fixture-canvas').count();
  await dialog.getByRole('button', { name: '调整位置', exact: true }).click();
  await expect(dialog.locator('.footprint-map-hit')).toHaveCount(2);
  await dialog.getByRole('button', { name: '取消选点', exact: true }).click();
  assert.equal(
    await dialog.locator('.tencent-fixture-canvas').count(),
    mapInstances,
  );
  console.log('PASS: 按日期分组、切换草稿保留、选点保留全部标记');
  // 删除仅修改草稿，取消整个会话不发出删除或保存请求。
  await dialog.getByRole('button', { name: '删除', exact: true }).click();
  await page
    .locator('.ant-popconfirm:visible')
    .getByRole('button', { name: /删\s*除/ })
    .click();
  await expect(dialog.locator('.editor-detail-row')).toHaveCount(1);
  assert.equal(state.records.length, 3);
  assert.equal(state.batches?.length ?? 0, 0);
  await dialog.getByRole('button', { name: /^取\s*消$/ }).click();
  await main
    .locator('.footprint-row')
    .first()
    .getByRole('button', { name: '编辑生活足迹', exact: true })
    .click();
  await expect(dialog.locator('.editor-detail-row')).toHaveCount(2);
  // 切换后迟到的逆地址响应不能污染当前明细。
  let releaseReverse;
  state.reverseGate = new Promise((resolve) => {
    releaseReverse = resolve;
  });
  await dialog.getByRole('button', { name: '调整位置', exact: true }).click();
  await dialog
    .locator('.footprint-map-canvas')
    .click({ position: { x: 65, y: 210 } });
  await dialog.locator('.editor-detail-row').nth(1).click();
  releaseReverse();
  state.reverseGate = null;
  await expect(
    dialog.getByRole('combobox', { name: '地点', exact: true }),
  ).toHaveValue('文三路254号院');
  await expect(dialog.getByText('未完整识别地区，可手动补充')).toHaveCount(0);
  // 同一批同时更新、删除、新增。
  await dialog.getByRole('button', { name: '删除', exact: true }).click();
  await page
    .locator('.ant-popconfirm:visible')
    .getByRole('button', { name: /删\s*除/ })
    .click();
  await dialog.getByRole('button', { name: '添加明细', exact: true }).click();
  await dialog
    .getByRole('combobox', { name: '地点', exact: true })
    .fill('新增住所');
  await page
    .locator('.location-results:visible .ant-select-item-option')
    .first()
    .click();
  await dialog.getByRole('button', { name: '确认位置', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: '保存全部', exact: true }),
  ).toBeEnabled();
  await dialog.getByRole('checkbox', { name: '至今' }).check();
  await dialog
    .getByRole('textbox', { name: '备注', exact: true })
    .fill('新明细备注');
  state.failSave = true;
  await dialog.getByRole('button', { name: '保存全部', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.locator('.editor-detail-row')).toHaveCount(2);
  assert.equal(state.records.length, 3);
  state.failSave = false;
  await dialog.getByRole('button', { name: '保存全部', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const batch = state.batches.at(-1);
  assert.deepEqual(batch.deletedIds, [secondId]);
  assert.equal(batch.items.length, 2);
  assert.equal(batch.items[0].id, firstId);
  assert.equal(batch.items[1].id, undefined);
  assert(
    batch.items.every(
      (item) =>
        item.startDate === '2016-01-01' && item.endDate === '9999-12-31',
    ),
  );
  assert.equal(
    state.records.find((item) => item.id === otherId).startDate,
    '2023-05-01',
  );
  assert.equal(state.records.length, 3);
  console.log(
    'PASS: 删除暂存、取消无写入、迟到响应隔离、一次提交增改删与失败重试',
  );
  for (const [width, theme] of [
    [1440, 'light'],
    [900, 'dark'],
    [390, 'light'],
  ]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(
      (theme) =>
        document.documentElement.classList.toggle('dark', theme === 'dark'),
      theme,
    );
    await expect(main.locator('.footprint-detail')).toHaveCount(0);
    await expect(
      main.locator('.footprint-row').first().locator('.footprint-place'),
    ).toHaveCount(2);
    await page.screenshot({
      path: `${output}/list-${width}-${theme}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    assert.equal(
      await main.evaluate((el) => el.scrollWidth > el.clientWidth + 2),
      false,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  // 同坐标不同备注可从地图聚合列表切换。
  await main
    .locator('.footprint-row.selected')
    .getByRole('button', { name: '编辑生活足迹', exact: true })
    .click();
  await expect(dialog.locator('.editor-detail-row')).toHaveCount(2);
  for (const [width, height, theme] of [
    [1440, 1100, 'light'],
    [900, 1100, 'dark'],
    [390, 844, 'light'],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      (theme) =>
        document.documentElement.classList.toggle('dark', theme === 'dark'),
      theme,
    );
    await expect(dialog.locator('.editor-detail-row')).toHaveCount(2);
    const bounds = await dialog.boundingBox();
    assert(bounds.x >= -1 && bounds.x + bounds.width <= width + 1);
    await page.screenshot({
      path: `${output}/${width}-${theme}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await expect
      .poll(() => dialog.evaluate((el) => el.scrollWidth > el.clientWidth + 2))
      .toBe(false);
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await dialog.getByRole('button', { name: /^取\s*消$/ }).click();
  // 让两条成为同点；重新读取后验证聚合选择与日期变更后自动合组。
  state.records[1].longitude = state.records[0].longitude;
  state.records[1].latitude = state.records[0].latitude;
  // Use a deterministic fixture with all three records on the shared dates after page reload.
  for (const r of state.records) {
    r.startDate = '2020-01-01';
    r.endDate = '9999-12-31';
    r.longitude = 116.3;
    r.latitude = 40.07;
  }
  await page.reload();
  await expect(main.locator('.footprint-row')).toHaveCount(1);
  await main.locator('.footprint-period-time').first().click();
  await main
    .locator('.footprint-row.selected')
    .getByRole('button', { name: '编辑生活足迹', exact: true })
    .click();
  await expect(dialog.locator('.footprint-map-hit')).toHaveCount(1);
  await dialog
    .getByRole('button', { name: '3条地点记录', exact: true })
    .click();
  await expect(dialog.locator('.editor-map-choices .group-record')).toHaveCount(
    3,
  );
  await dialog.locator('.editor-map-choices .group-record').nth(1).click();
  await expect(dialog.locator('.editor-detail-row').nth(1)).toHaveClass(
    /selected/,
  );
  await page.screenshot({
    path: `${output}/desktop-shared-map.png`,
    fullPage: true,
    animations: 'disabled',
  });
  // 服务端已经保存，但客户端未收到响应：禁止重复提交，重读后显示已保存数据。
  await dialog.getByRole('button', { name: '添加明细', exact: true }).click();
  await dialog
    .getByRole('combobox', { name: '地点', exact: true })
    .fill('响应丢失测试地点');
  await page
    .locator('.location-results:visible .ant-select-item-option')
    .first()
    .click();
  await dialog.getByRole('button', { name: '确认位置', exact: true }).click();
  state.loseSaveResponse = true;
  const beforeBatches = state.batches.length;
  await dialog.getByRole('button', { name: '保存全部', exact: true }).click();
  await expect(
    dialog.getByText('保存结果未确认，请重新读取后再操作，避免重复新增'),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: '保存全部', exact: true }),
  ).toBeDisabled();
  assert.equal(state.batches.length, beforeBatches + 1);
  assert.equal(state.records.length, 4);
  state.loseSaveResponse = false;
  await dialog
    .getByRole('button', { name: '关闭并重新读取', exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(main.locator('.footprint-place')).toHaveCount(4);
  console.log('PASS: 响应丢失后禁止重复提交，重新读取恢复服务端已保存明细');
  assert.deepEqual(errors, []);
  console.log('PASS: 桌面/平板/手机布局、主题、同点多明细地图选择');
} finally {
  await browser.close();
}

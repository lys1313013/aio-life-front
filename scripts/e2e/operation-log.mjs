import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const origin = process.env.OPERATION_LOG_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/operation-log';
await mkdir(output, { recursive: true });
const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
const id = '9223372036854775806';
const seed = {
  id,
  userId: id,
  username: 'fixture',
  nickname: '日志用户',
  browser: 'Chrome',
  functionName: '待办',
  functionItem: '修改',
  requestPath: '/tasks/{id}',
  requestMethod: 'PUT',
  requestTime: '2026-10-21 12:00:00.123',
  durationMs: 0,
  ipAddress: '2001:db8::2',
  serverIp: '2001:db8::1',
  success: true,
  createTime: '2026-10-21 12:00:00',
  accessType: '登出',
};
let data = [
  { ...seed },
  {
    ...seed,
    id: '9223372036854775805',
    requestTime: null,
    requestMethod: null,
    durationMs: null,
    serverIp: null,
    requestPath: '/very-long/'.repeat(18),
    success: false,
  },
];
let params = { path: { id }, body: { password: '[REDACTED]' } };
let delay = 0;
let failList = false;
let failDetail = false;
const listReads = [];
const detailReads = [];
const exports = [];
const errors = [];
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const fixtures = {
    '/auth/login': { accessToken: 'synthetic-operation-log-token' },
    '/user/info': {
      userId: '7',
      id: '7',
      username: 'fixture',
      realName: '模拟管理员',
      nickname: '模拟管理员',
      roles: ['admin'],
      homePath: '/system/operation-log',
    },
    '/auth/codes': ['admin'],
    '/menu/all': [
      {
        name: 'System',
        path: '/system',
        component: 'BasicLayout',
        meta: { title: '系统管理', icon: 'mdi:cog' },
        children: [
          {
            name: 'OperationLog',
            path: '/system/operation-log',
            component: 'system/operation-log/index',
            meta: {
              title: '操作日志',
              icon: 'mdi:history',
              menuId: '1',
              authority: ['admin'],
            },
          },
          {
            name: 'AccessLog',
            path: '/system/access-log',
            component: 'system/access-log/index',
            meta: {
              title: '访问日志',
              icon: 'mdi:login',
              menuId: '2',
              authority: ['admin'],
            },
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
    if (!url.pathname.startsWith('/api/')) return route.fallback();
    const path = url.pathname.replace(/^\/api/, '');
    if (path === '/system/logs/operation/export') {
      exports.push(Object.fromEntries(url.searchParams));
      return route.fulfill({
        contentType: 'text/csv;charset=UTF-8',
        body: '\ufeff用户ID,请求参数\r\n"\'9223372036854775806","[REDACTED]"\r\n',
      });
    }
    if (path === '/system/logs/operation') {
      listReads.push(Object.fromEntries(url.searchParams));
      const snapshot = data.map((row) => ({ ...row }));
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      return route.fulfill({
        json: failList
          ? { code: 1, message: '模拟列表失败' }
          : { code: 0, data: { items: snapshot, total: snapshot.length } },
      });
    }
    if (path.startsWith('/system/logs/operation/')) {
      detailReads.push(path);
      await new Promise((resolve) => setTimeout(resolve, 150));
      return route.fulfill({
        json: failDetail
          ? { code: 1, message: '模拟参数失败' }
          : { code: 0, data: { ...seed, requestParams: params } },
      });
    }
    if (path === '/system/logs/access')
      return route.fulfill({
        json: { code: 0, data: { items: [seed], total: 1 } },
      });
    if (Object.hasOwn(fixtures, path))
      return route.fulfill({ json: { code: 0, data: fixtures[path] } });
    return route.fulfill({ json: { code: 0, data: [] } });
  });
  await page.goto(origin + '/auth/login');
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page
    .locator('button')
    .filter({ hasText: /^登录$/ })
    .click();
  await page.waitForURL('**/system/operation-log');
  const main = page.locator('.activity-log-page');
  await expect(main.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(
    2,
  );
  for (const title of [
    '用户ID',
    '用户名',
    '功能点',
    '请求地址',
    '请求方式',
    '请求参数',
    '请求时间',
    '处理时间',
    '请求IP',
    '服务器IP',
  ])
    await expect(
      main.getByRole('columnheader', { name: title, exact: true }),
    ).toBeVisible();
  await expect(main.getByText('0 ms', { exact: true })).toBeVisible();
  await expect(main.getByText('历史记录时间')).toBeVisible();
  assert.equal(detailReads.length, 0);
  await main
    .getByRole('button', { name: '查看请求参数', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.parameter-json')).toContainText(id);
  await expect(dialog.locator('.parameter-json')).toContainText('[REDACTED]');
  await dialog.getByRole('button', { name: /关\s*闭/ }).click();
  for (const [value, text] of [
    [null, '未采集'],
    [{}, '无参数'],
  ]) {
    params = value;
    await main
      .getByRole('button', { name: '查看请求参数', exact: true })
      .first()
      .click();
    await expect(dialog.locator('.parameter-json')).toHaveText(text);
    await dialog.getByRole('button', { name: /关\s*闭/ }).click();
  }
  failDetail = true;
  await main
    .getByRole('button', { name: '查看请求参数', exact: true })
    .first()
    .click();
  await expect(dialog.getByText('参数加载失败')).toBeVisible();
  failDetail = false;
  params = { path: { id } };
  await dialog.getByRole('button', { name: '重试参数' }).click();
  await expect(dialog.locator('.parameter-json')).toContainText(id);
  await dialog.getByRole('button', { name: /关\s*闭/ }).click();
  await main
    .getByRole('textbox', { name: '用户账号', exact: true })
    .fill('fixture');
  await main.getByRole('button', { name: '查询', exact: true }).click();
  await expect.poll(() => listReads.at(-1)?.username).toBe('fixture');
  await expect(main.locator('.ant-spin-spinning')).toHaveCount(0);
  await main
    .getByRole('textbox', { name: '用户账号', exact: true })
    .fill('not-submitted');
  const downloadPromise = page.waitForEvent('download');
  await main.getByRole('button', { name: '导出全部', exact: true }).click();
  const download = await downloadPromise;
  assert.equal(exports.at(-1).username, 'fixture');
  assert.ok(
    (await readFile(await download.path(), 'utf8')).includes('[REDACTED]'),
  );
  await main
    .getByRole('textbox', { name: '用户账号', exact: true })
    .fill('');
  await main.getByRole('button', { name: '查询', exact: true }).click();
  await expect.poll(() => listReads.at(-1)?.username).toBeUndefined();
  await expect(main.locator('.ant-spin-spinning')).toHaveCount(0);

  // 已有内容刷新、失败和恢复时，保留表格及高度。
  const box = await main.locator('.log-results').boundingBox();
  delay = 450;
  await main.getByRole('button', { name: '查询', exact: true }).click();
  await expect(main.locator('.ant-spin-spinning')).toBeVisible();
  assert.equal(
    (await main.locator('.log-results').boundingBox()).height,
    box.height,
  );
  await expect(main.locator('.ant-spin-spinning')).toHaveCount(0);
  failList = true;
  await main.getByRole('button', { name: '查询', exact: true }).click();
  await expect(main.getByText('日志加载失败，请重试')).toBeVisible();
  assert.equal(
    (await main.locator('.log-results').boundingBox()).height,
    box.height,
  );
  await expect(main.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(
    2,
  );
  failList = false;
  await main.getByRole('button', { name: '重试日志' }).click();
  await expect(main.locator('.ant-spin-spinning')).toBeVisible();
  await expect(main.getByText('日志加载失败，请重试')).toHaveCount(0);
  await expect(main.locator('.ant-spin-spinning')).toHaveCount(0);

  data = Array.from({ length: 21 }, (_, index) => ({
    ...seed,
    id: String(BigInt(id) - BigInt(index)),
  }));
  await main.getByRole('button', { name: '查询', exact: true }).click();
  await expect(main.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(
    20,
  );
  for (const width of [390, 768, 1024, 1440])
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
      if (width >= 1024) {
        const tableBody = main.locator('.ant-table-body');
        await expect(tableBody).toBeVisible();
        assert.equal(
          await tableBody.evaluate(
            (node) => node.scrollHeight > node.clientHeight,
          ),
          true,
        );
        const paginationBox = await main
          .locator('.ant-table-pagination')
          .boundingBox();
        assert.ok(paginationBox.y + paginationBox.height <= 1000);
        const pageBox = await main.boundingBox();
        assert.ok(pageBox.y + pageBox.height <= 1000);
      }
      await main
        .locator('.ant-table-body, .ant-table-content')
        .first()
        .evaluate((node) => {
          node.scrollLeft = 0;
        });
      await page.screenshot({
        path: `${output}/${width}-${theme}.png`,
        fullPage: true,
        animations: 'disabled',
      });
      await main
        .getByRole('button', { name: '查看请求参数', exact: true })
        .first()
        .click();
      await expect(dialog.locator('.parameter-json')).toContainText(id);
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(350);
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.width <= width);
      await page.screenshot({
        path: `${output}/${width}-${theme}-params.png`,
        fullPage: true,
        animations: 'disabled',
      });
      await dialog.getByRole('button', { name: /关\s*闭/ }).click();
    }
  await main.locator('.ant-pagination-item-2').click();
  await expect(main.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(
    1,
  );
  // 单条、空态与空态刷新。
  data = [seed];
  await main.getByRole('button', { name: '查询', exact: true }).click();
  await expect(main.locator('.ant-spin-spinning')).toBeVisible();
  await expect(main.locator('.ant-table-tbody tr.ant-table-row')).toHaveCount(
    1,
  );
  await expect(main.locator('.ant-spin-spinning')).toHaveCount(0);
  data = [];
  await main.getByRole('button', { name: '查询', exact: true }).click();
  await expect(main.getByText('暂无日志', { exact: true })).toBeVisible();
  const emptyBox = await main.locator('.log-results').boundingBox();
  await main.getByRole('button', { name: '查询', exact: true }).click();
  await expect(main.locator('.ant-spin-spinning')).toBeVisible();
  assert.equal(
    (await main.locator('.log-results').boundingBox()).height,
    emptyBox.height,
  );
  await expect(main.locator('.ant-spin-spinning')).toHaveCount(0);
  await page.goto(`${origin}/system/access-log`);
  await page.waitForURL('**/system/access-log');
  await expect(
    main.getByRole('columnheader', { name: '登录方式', exact: true }),
  ).toBeVisible();
  await expect(main.getByRole('button', { name: '查看请求参数' })).toHaveCount(
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    'Operation log passed: 10 columns; large IDs; 0ms; lazy parameters, empty/null and retry; filters/export; stable refresh/failure/empty; desktop viewport pagination; 8 viewport/theme screenshots; access-log regression.',
  );
} finally {
  await browser.close();
}

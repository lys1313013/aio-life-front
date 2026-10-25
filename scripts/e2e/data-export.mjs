import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const origin = process.env.EXPORT_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/data-export';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const writes = [];
  let remaining = 5;
  let jobs = [];
  const id = '9223372036854775806';
  const fixtures = {
    '/auth/login': { accessToken: 'synthetic-export-token' },
    '/user/info': {
      userId: '7',
      id: '7',
      username: 'fixture',
      realName: '模拟用户',
      nickname: '模拟用户',
      roles: ['admin'],
      homePath: '/profile?tab=data-export',
    },
    '/auth/codes': ['admin'],
    '/menu/all': [
      { name: 'OperationLog', path: '/system/operation-log', component: 'system/operation-log/index', meta: { title: '操作日志', icon: 'mdi:history', authority: ['admin'] } },
      {
        name: 'Profile',
        path: '/profile',
        component: '_core/profile/index',
        meta: { title: '个人中心', icon: 'lucide:user' },
      },
    ],
    '/system/data-export-audits': { items: [{ id: '5', userId: '7', jobId: id, eventTime: '2026-10-25 12:00:00', eventType: 'QUOTA_RESERVED', resultCode: 'OK', clientIp: '127.0.0.1' }], total: 1 },
    '/system/logs/operation': { items: [], total: 0 },
    '/me/data-exports/catalog': {
      version: 'v1',
      verificationMethod: 'PASSWORD',
      datasets: [
        { key: 'tasks', title: '待办', state: 'AVAILABLE' },
        {
          key: 'cards',
          title: '银行卡',
          state: 'LOCKED',
          lockedMenu: '/finance/bank-cards',
        },
        { key: 'graph', title: '人物关系', state: 'UNAVAILABLE' },
      ],
      exclusions: ['不含登录凭据、附件原件'],
    },
  };
  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (!url.pathname.startsWith('/api/')) return route.fallback();
    const path = url.pathname.slice(4);
    let data = fixtures[path] ?? [];
    if (path === '/me/data-exports/quota')
      data = { remaining, limit: 5, used: 5 - remaining, month: '2026-10' };
    if (path === '/me/data-exports/authorizations') {
      const body = req.postDataJSON();
      writes.push(body);
      if (body.password === 'wrong')
        return route.fulfill({
          status: 403,
          json: { code: 4001, message: '登录密码错误' },
        });
      data = { grant: 'single-use-grant' };
    }
    if (path === '/me/data-exports') {
      if (req.method() === 'POST') {
        writes.push({ headers: req.headers(), body: req.postDataJSON() });
        remaining--;
        jobs = [
          {
            id,
            status: 'QUEUED',
            createTime: '2026-10-25 12:00:00',
            rowCount: 0,
            artifactStatus: 'NONE',
          },
        ];
        data = jobs[0];
      } else data = { items: jobs, total: jobs.length };
    }
    if (path.endsWith('/cancel')) {
      jobs[0].status = 'CANCELLED';
      remaining++;
      data = null;
    }
    if (path.endsWith('/download')) {
      assert.equal(req.headers()['x-export-grant'], 'single-use-grant');
      assert.equal(url.search, '');
      return route.fulfill({
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: Buffer.from('synthetic-download-fixture'),
      });
    }
    return route.fulfill({ json: { code: 0, data } });
  });
  await page.goto(origin + '/auth/login');
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page
    .locator('button')
    .filter({ hasText: /^登录$/ })
    .click();
  await page.waitForURL('**/profile?tab=data-export');
  const panel = page.getByRole('region', { name: '个人数据导出' });
  await expect(
    panel.getByText('本月剩余 5 / 5 次', { exact: false }),
  ).toBeVisible();
  for (const width of [390, 768, 1440])
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 900 });
      const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
      await page.evaluate(
        async ({ module, theme }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: theme } });
        },
        { module: preferencesModule, theme },
      );
      await panel.locator('details').evaluate((node) => {
        node.open = true;
      });
      await expect(panel.getByText('人物关系', { exact: true })).toBeVisible();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: `${output}/${width}-${theme}.png`,
        fullPage: true,
      });
    }
  await panel.getByRole('button', { name: '生成 Excel' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('input').fill('wrong');
  await dialog.getByRole('button', { name: '确认验证' }).click();
  await expect(page.getByText('登录密码错误', { exact: true })).toBeVisible();
  assert.equal(jobs.length, 0);
  await dialog.locator('input').fill('correct');
  await dialog.getByRole('button', { name: '确认验证' }).click();
  await expect(panel.getByText('排队中', { exact: true })).toBeVisible();
  const write = writes.find((item) => item.headers);
  assert.equal(write.headers['x-export-grant'], 'single-use-grant');
  assert.match(write.headers['idempotency-key'], /^[a-z0-9-]{36}$/);
  assert.deepEqual(write.body, {
    datasetKeys: ['tasks', 'cards'],
    catalogVersion: 'v1',
  });
  await panel.getByRole('button', { name: '取消导出', exact: true }).click();
  await page.locator('.ant-popconfirm-buttons button').last().click();
  await expect(panel.getByText('已取消', { exact: true })).toBeVisible();
  jobs = [
    {
      id,
      status: 'SUCCEEDED',
      createTime: '2026-10-25 12:00:00',
      rowCount: 1,
      artifactStatus: 'AVAILABLE',
      fileName: 'fixture.xlsx',
      expiresAt: '2026-10-26 12:00:00',
    },
  ];
  await panel.getByRole('button', { name: '刷新导出任务' }).click();
  await panel.getByRole('button', { name: '下载导出文件' }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('input').fill('correct');
  const downloaded = page.waitForEvent('download');
  await dialog.getByRole('button', { name: '确认验证' }).click();
  assert.equal((await downloaded).suggestedFilename(), 'fixture.xlsx');
  remaining = 0;
  await panel.getByRole('button', { name: '刷新导出任务' }).click();
  await expect(
    panel.getByRole('button', { name: '生成 Excel' }),
  ).toBeDisabled();
  await page.goto(origin + '/system/operation-log');
  await page.getByRole('button', { name: '数据导出审计', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('预占额度', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByText(id, { exact: true })).toBeVisible();
  await page.screenshot({ path: `${output}/audit.png`, fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    'Web export: six viewport/theme cases, verification, idempotency headers, cancel, download, quota passed',
  );
} finally {
  await browser.close();
}

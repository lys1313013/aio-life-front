import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const origin = process.env.SCHEDULED_JOBS_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/scheduled-jobs';
await mkdir(output, { recursive: true });
const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
const id = '9223372036854775806';
const secondId = '9223372036854775805';
const seed = [
  { id, jobCode: 'leetcode.check', name: 'LeetCode 打卡检查', cron: '0 30 23 * * ?', zoneId: 'Asia/Shanghai', enabled: true, revision: 0, schedulerEnabled: true, nextExecutionTime: '2026-10-26 23:30:00' },
  { id: secondId, jobCode: 'leetcode.daily-question', name: 'LeetCode 每日一题通知', cron: '0 0 7 * * ?', zoneId: 'Asia/Shanghai', enabled: true, revision: 0, schedulerEnabled: true, nextExecutionTime: '2026-10-26 07:00:00' },
];
let jobs = structuredClone(seed);
let delay = 0;
let listGate;
let releaseList;
let failList = false;
let failSave = false;
let failLogs = false;
let logRows = [];
let logTotal = 0;
let logReads = [];
const writes = [];
const runs = [];
const errors = [];
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);
  page.on('pageerror', (error) => errors.push(error.message));
  const fixtures = {
    '/auth/login': { accessToken: 'synthetic-scheduler-token' },
    '/user/info': { userId: '7', id: '7', username: 'fixture', realName: '模拟管理员', nickname: '模拟管理员', roles: ['admin'], homePath: '/system/scheduled-jobs' },
    '/auth/codes': ['admin'],
    '/menu/all': [{ name: 'System', path: '/system', component: 'BasicLayout', meta: { title: '系统管理', icon: 'mdi:cog' }, children: [{ name: 'ScheduledJobAdmin', path: '/system/scheduled-jobs', component: 'system/scheduled-jobs/index', meta: { title: '定时任务', icon: 'mdi:calendar-clock', menuId: '1908', authority: ['admin'] } }] }],
    '/auth/secondary-lock/menus': [], '/message/unread-count': { count: 0 }, '/message/list': [], '/message/page': { items: [], total: 0 },
    '/menu/visuals': { menus: [], cards: {} }, '/menu/preferences': { menus: [], hiddenMenuIds: [] }, '/auth/wechat/web/capabilities': { enabled: false },
  };
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.fallback();
    const path = url.pathname.replace(/^\/api/, '');
    let data = [];
    let failure = false;
    if (path === '/system/scheduled-jobs') { data = structuredClone(jobs); failure = failList; if (listGate) await listGate; }
    else if (path.endsWith('/logs')) { logReads.push(Object.fromEntries(url.searchParams)); data = { items: structuredClone(logRows), total: logTotal }; failure = failLogs; }
    else if (path.endsWith('/run')) { runs.push(path); data = null; }
    else if (route.request().method() === 'PUT' && path.startsWith('/system/scheduled-jobs/')) {
      const body = route.request().postDataJSON(); writes.push({ path, body }); failure = failSave;
      const job = jobs.find((item) => path.endsWith('/' + item.id));
      if (!failure) Object.assign(job, body, { revision: job.revision + 1, nextExecutionTime: body.enabled ? '2026-10-26 22:15:00' : null });
      data = structuredClone(job);
    } else if (Object.hasOwn(fixtures, path)) data = fixtures[path];
    if (delay && path.startsWith('/system/scheduled-jobs')) await new Promise((resolve) => setTimeout(resolve, delay));
    await route.fulfill({ json: failure ? { code: 1, message: '模拟请求失败' } : { code: 0, data } });
  });
  await page.goto(origin + '/auth/login');
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  delay = 800;
  await page.locator('button').filter({ hasText: /^登录$/ }).click();
  await page.waitForURL('**/system/scheduled-jobs');
  await expect(page.getByLabel('加载任务')).toBeVisible();
  await expect(page.getByRole('region', { name: seed[0].name })).toBeVisible();
  delay = 0;
  const main = page.getByRole('region', { name: seed[0].name });
  const toggle = main.getByRole('switch');
  await toggle.click(); await expect(toggle).toHaveAttribute('aria-checked', 'false');
  assert.equal(writes.at(-1).path, `/system/scheduled-jobs/${id}`);
  assert.deepEqual(writes.at(-1).body, { cron: '0 30 23 * * ?', enabled: false, revision: 0 });
  failSave = true; await toggle.click(); await expect(page.getByText('模拟请求失败').first()).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-checked', 'false'); failSave = false;
  await main.getByRole('button', { name: `编辑${seed[0].name}` }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('执行时间', { exact: true }).fill('22:15');
  await dialog.getByRole('button', { name: /保\s*存/ }).click();
  await expect(dialog).not.toBeVisible();
  assert.equal(writes.at(-1).body.cron, '0 15 22 * * ?');
  assert.equal(writes.at(-1).body.enabled, false);
  await main.getByRole('button', { name: `立即执行${seed[0].name}` }).click();
  await page.locator('.ant-popconfirm').getByRole('button', { name: /^执\s*行$/ }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('暂无执行日志')).toBeVisible();
  assert.deepEqual(runs, [`/system/scheduled-jobs/${id}/run`]);
  logRows = [{ id, jobId: id, triggerType: 'MANUAL', status: 'SUCCESS', scheduledTime: null, startTime: '2026-10-25 12:00:00', endTime: '2026-10-25 12:00:00', durationMs: '0', message: '业务方法执行完成', createUser: secondId }]; logTotal = 21;
  await dialog.getByRole('button', { name: '刷新日志' }).click();
  await expect(dialog.getByText('0 ms', { exact: true })).toBeVisible();
  await expect(dialog.getByText(`日志 ID：${id}`, { exact: false })).toBeVisible();
  await dialog.getByTitle('2', { exact: true }).click();
  await expect.poll(() => logReads.at(-1).page).toBe('2');
  failLogs = true; await dialog.getByRole('button', { name: '刷新日志' }).click();
  await expect(dialog.getByText('日志加载失败，请刷新重试')).toBeVisible();
  await expect(dialog.getByText('0 ms', { exact: true })).toBeVisible();
  failLogs = false; await dialog.getByRole('button', { name: '刷新日志' }).click();
  await expect(dialog.getByText('日志加载失败，请刷新重试')).not.toBeVisible();
  await dialog.getByRole('button', { name: /关\s*闭/ }).click();
  failList = true; await page.getByRole('button', { name: '刷新任务' }).click();
  await expect(page.getByText('任务加载失败，请刷新重试')).toBeVisible();
  await expect(main).toBeVisible(); failList = false;
  await page.getByRole('button', { name: '刷新任务' }).click();
  await expect(page.getByText('任务加载失败，请刷新重试')).not.toBeVisible();
  const heights = [];
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(async ({ module, theme }) => { const { updatePreferences } = await import(module); updatePreferences({ theme: { mode: theme } }); }, { module: preferencesModule, theme });
      jobs = structuredClone(seed);
      listGate = new Promise((resolve) => { releaseList = resolve; });
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await expect(page.getByLabel('加载任务')).toBeVisible({ timeout: 20000 });
      const skeletonBox = await page.getByLabel('加载任务').locator(':scope > div').first().boundingBox();
      releaseList(); listGate = undefined;
      await expect(page.getByRole('region')).toHaveCount(2);
      await page.evaluate(async ({ module, theme }) => { const { updatePreferences } = await import(module); updatePreferences({ theme: { mode: theme } }); }, { module: preferencesModule, theme });
      await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(theme === 'dark');
      const loadedBox = await main.boundingBox();
      assert(Math.abs(skeletonBox.height - loadedBox.height) <= 35, 'initial loading height mismatch');
      delay = 0;
      await page.getByRole('button', { name: '刷新任务' }).click();
      await expect(page.getByRole('region')).toHaveCount(2);
      const before = await main.boundingBox();
      delay = 700;
      await page.getByRole('button', { name: '刷新任务' }).click();
      const during = await main.boundingBox();
      assert.equal(Math.round(before.height), Math.round(during.height));
      heights.push({ width, theme, height: before.height });
      await expect(page.getByRole('button', { name: '刷新任务' })).not.toHaveClass(/ant-btn-loading/); delay = 0;
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${width}/${theme} overflow`);
      await page.screenshot({ path: `${output}/${width}-${theme}.png`, fullPage: true });
      await main.getByRole('button', { name: `编辑${seed[0].name}` }).click();
      const editDialog = page.getByRole('dialog');
      await page.screenshot({ path: `${output}/${width}-${theme}-edit.png`, fullPage: true, animations: 'disabled' });
      const box = await page.locator('.app-modal .ant-modal-content').boundingBox();
      assert(box.x >= 0 && box.x + box.width <= width + 1, 'dialog exceeds viewport');
      await editDialog.getByRole('button', { name: /取\s*消/ }).click();
      jobs = [{ ...seed[0], name: '超长任务名称'.repeat(12) }];
      await page.getByRole('button', { name: '刷新任务' }).click();
      await expect(page.getByRole('region')).toHaveCount(1);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      jobs = []; await page.getByRole('button', { name: '刷新任务' }).click();
      await expect(page.getByText('暂无任务', { exact: true })).toBeVisible();
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'passed', writes: writes.length, runs: runs.length, heights }, null, 2));
} finally { await browser.close(); }

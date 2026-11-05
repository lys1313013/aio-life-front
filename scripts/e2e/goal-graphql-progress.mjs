import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const origin = process.env.GOAL_WEB_ORIGIN || 'http://127.0.0.1:5669';
const output = 'node_modules/.cache/goal-graphql-progress';
const preferencesModule =
  '/@fs' +
  new URL('../../packages/@core/preferences/src/index.ts', import.meta.url)
    .pathname;
await mkdir(output, { recursive: true });
const configs = JSON.parse(
  await readFile(
    new URL('./fixtures/goal-queries.json', import.meta.url),
    'utf8',
  ),
);
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
try {
  for (const width of [390, 768, 1440])
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      const rows = configs.map((row, i) => ({
        ...row,
        id: String(9007199254740991n + BigInt(i + 1)),
        isPinned: 0,
      }));
      const unhandled = [],
        errors = [],
        writes = [],
        previews = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const fixtures = {
        '/auth/login': { accessToken: 'fixture-web-goal' },
        '/user/info': {
          id: '101',
          userId: '101',
          username: 'fixture',
          roles: ['user'],
          homePath: '/task-center/goal',
        },
        '/auth/codes': [],
        '/menu/visuals': { menus: [], cards: {} },
        '/menu/all': [
          {
            name: 'FixtureLayout',
            path: '/fixture',
            component: 'BasicLayout',
            meta: { title: '生活' },
            children: [
              {
                name: 'Goals',
                path: '/task-center/goal',
                component: '/task-center/goal/index',
                meta: { title: '目标', keepAlive: true },
              },
            ],
          },
        ],
        '/auth/secondary-lock/menus': [],
        '/message/unread-count': { count: 0 },
        '/message/list': [],
        '/message/page': { items: [], total: 0 },
        '/menu/preferences': { menus: [], hiddenMenuIds: [] },
        '/auth/wechat/web/capabilities': { enabled: false },
      };
      await page.route(
        (url) => url.pathname.startsWith('/api/'),
        async (route) => {
          const req = route.request(),
            url = new URL(req.url()),
            path = url.pathname.replace(/^\/api/, '');
          let data;
          if (path === '/goals' && req.method() === 'GET') data = rows;
          else if (path === '/goals' && req.method() === 'PUT') {
            const body = req.postDataJSON();
            writes.push(body);
            const row = rows.find((row) => row.id === body.id);
            Object.assign(row, body);
            data = row;
          } else if (path === '/goals/progress/refresh') {
            data = rows
              .filter((row) => req.postDataJSON().ids.includes(row.id))
              .map((row) => ({
                ...row,
                currentValue: [26, 25, 15000][rows.indexOf(row)],
                progressCheckedAt: '2026-11-03 10:00:00',
              }));
          } else if (path === '/goals/progress/preview') {
            previews.push(req.postDataJSON());
            data = {
              currentValue: 25,
              achieved: false,
              progressPercent: 31,
              variables: {
                start: '2026-01-01',
                end: '2027-01-01',
                category: '1',
              },
            };
          } else if (Object.hasOwn(fixtures, path)) data = fixtures[path];
          else {
            unhandled.push(req.method() + ' ' + path);
            return route.fulfill({
              status: 400,
              json: { code: 1, message: 'fixture 未声明' },
            });
          }
          return route.fulfill({ json: { code: 0, message: null, data } });
        },
      );
      await page.goto(origin + '/auth/login');
      await page
        .locator('input:not([type="password"])')
        .first()
        .fill('fixture')
        .catch(async (error) => {
          await page.screenshot({
            path: output + '/failure.png',
            fullPage: true,
          });
          console.error({
            url: page.url(),
            body: await page.locator('body').innerText(),
            errors,
            unhandled,
          });
          throw error;
        });
      await page.locator('input[type="password"]').fill('fixture-password');
      await page
        .locator('button')
        .filter({ hasText: /^登录$/ })
        .click()
        .catch(async (error) => {
          console.error({
            body: await page.locator('body').innerText(),
            buttons: await page.locator('button').allTextContents(),
            errors,
            unhandled,
          });
          throw error;
        });
      const cards = page.locator('.apple-card');
      await cards
        .first()
        .waitFor()
        .catch(async (error) => {
          await page.screenshot({
            path: output + '/failure-cards.png',
            fullPage: true,
          });
          console.error({
            url: page.url(),
            body: await page.locator('body').innerText(),
            errors,
            unhandled,
          });
          throw error;
        });
      assert.equal(await cards.count(), 3);
      assert.match(await cards.nth(0).innerText(), /65%/);
      assert.match(await cards.nth(1).innerText(), /31%/);
      assert.match(await cards.nth(2).innerText(), /100%/);
      assert.match(await cards.nth(2).innerText(), /已完成/);
      await page.evaluate(
        async ({ url, mode }) => {
          const { updatePreferences } = await import(url);
          updatePreferences({ theme: { mode } });
        },
        { url: preferencesModule, mode: theme },
      );
      await page.screenshot({
        path: `${output}/${width}-${theme}-goals.png`,
        fullPage: true,
      });
      await cards.nth(1).click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await page
        .getByRole('textbox', { name: 'GraphQL 查询', exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole('textbox', { name: '结果路径', exact: true })
          .inputValue(),
        'progress.date.countDistinct',
      );
      await page.getByRole('button', { name: '执行预览', exact: true }).click();
      await page.getByRole('status').filter({ hasText: '当前值 25' }).waitFor();
      assert.equal(previews[0].progressMode, 'graphql');
      await page.screenshot({
        path: `${output}/${width}-${theme}-query-editor.png`,
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await dialog.getByRole('button', { name: /保\s*存/ }).click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(writes[0].id, rows[1].id);
      assert.equal(writes[0].targetOperator, 'gt');
      assert.equal(writes[0].currentValue, undefined);
      // 自动达标按计算状态筛选；保存已达标目标后仍留在“已完成”列表。
      await page.locator('.ant-select').nth(1).click();
      await page
        .locator('.ant-select-dropdown:visible')
        .getByText('已完成', { exact: true })
        .click();
      await cards.first().waitFor();
      await page.waitForFunction(
        () => document.querySelectorAll('.apple-card').length === 1,
      );
      await cards.first().click();
      await dialog.waitFor();
      await dialog.getByRole('button', { name: /保\s*存/ }).click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await cards.count(), 1);
      assert.match(await cards.first().innerText(), /15000/);
      assert.deepEqual(unhandled, []);
      assert.deepEqual(errors, []);
      console.log('PASS: Web GraphQL goals ' + width + ' ' + theme);
      await context.close();
    }
} finally {
  await browser.close();
}

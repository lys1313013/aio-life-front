import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

// 仅使用虚构业务数据和公开模型快照；不连接业务 API、不写入真实账号。
const origin = process.env.QUERY_WEB_ORIGIN || 'http://127.0.0.1:5671';
const output = 'node_modules/.cache/data-query';
const models = JSON.parse(
  await readFile(
    new URL('./fixtures/data-query-models.json', import.meta.url),
    'utf8',
  ),
);
const preferencesModule =
  '/@fs' +
  new URL('../../packages/@core/preferences/src/index.ts', import.meta.url)
    .pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ timeout: 20_000 });
try {
  for (const width of (process.env.QUERY_WIDTHS || '1440,768,390')
    .split(',')
    .map(Number)) {
    for (const theme of (process.env.QUERY_THEMES || 'light,dark').split(',')) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      const errors = [],
        unhandled = [],
        requests = [];
      let describeCount = 0;
      let resultMode = 'rows',
        delay = 80,
        catalogFail = false;
      page.on('pageerror', (error) => errors.push(error.message));
      const fixtures = {
        '/auth/login': { accessToken: 'fixture-data-query' },
        '/user/info': {
          id: '101',
          userId: '101',
          username: 'fixture',
          roles: ['user'],
          homePath: '/query/workbench',
        },
        '/auth/codes': [],
        '/menu/visuals': { menus: [], cards: {} },
        '/menu/all': [
          {
            name: 'MCP',
            path: '/ai',
            component: 'BasicLayout',
            meta: { title: 'AI 接入' },
            children: [
              {
                name: 'QueryWorkbench',
                path: '/query/workbench',
                component: '/data-query/workbench/index',
                meta: {
                  title: '查询工作台',
                  fullPathKey: false,
                  keepAlive: false,
                },
              },
              {
                name: 'QueryModels',
                path: '/query/models',
                component: '/data-query/models/index',
                meta: {
                  title: '数据模型',
                  fullPathKey: false,
                  keepAlive: false,
                },
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
          const path = new URL(route.request().url()).pathname.replace(
            /^\/api/,
            '',
          );
          if (!Object.hasOwn(fixtures, path)) {
            unhandled.push(route.request().method() + ' ' + path);
            return route.fulfill({
              status: 400,
              json: { code: 1, message: 'fixture 未声明' },
            });
          }
          return route.fulfill({
            json: { code: 0, message: null, data: fixtures[path] },
          });
        },
      );
      await page.route(
        (url) => url.pathname.startsWith('/query-api/'),
        async (route) => {
          const request = route.request();
          const path = new URL(request.url()).pathname.replace(
            /^\/query-api/,
            '',
          );
          if (path.startsWith('/api/v1/datasets/')) describeCount++;
          assert.equal(
            request.headers().authorization,
            'Bearer fixture-data-query',
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          const success = (data) =>
            route.fulfill({ json: { rscode: '0', result: null, data } });
          if (path === '/api/v1/datasets') {
            if (catalogFail)
              return route.fulfill({
                status: 400,
                json: {
                  rscode: 'DEPENDENCY_FAILURE',
                  result: '模拟目录暂不可用',
                },
              });
            return success(
              models.map(({ name, title, description }) => ({
                name,
                title,
                description,
                capabilities: ['details', 'aggregate'],
              })),
            );
          }
          if (path.startsWith('/api/v1/datasets/'))
            return success(
              models.find((model) => model.name === path.split('/').pop()),
            );
          const input = request.postDataJSON();
          requests.push({ path, input });
          assert.equal(input.expectedRelease, 'time-record-v4');
          assert.equal(typeof input.variables.start, 'string');
          if (path === '/api/v1/queries/validate')
            return success({
              allowed: true,
              dataset: 'time_record',
              releaseId: 'time-record-v4',
            });
          if (path !== '/api/v1/queries/execute') {
            unhandled.push(path);
            return route.abort();
          }
          if (resultMode === 'error')
            return route.fulfill({
              status: 400,
              json: { rscode: 'QUERY_INVALID', result: '模拟查询失败' },
            });
          const rows =
            resultMode === 'empty'
              ? []
              : resultMode === 'single'
                ? [
                    {
                      date: '2026-11-10',
                      title: '单条记录',
                      durationMinutes: 0,
                      category: null,
                    },
                  ]
                : [
                    {
                      date: '2026-11-10',
                      title: '阅读',
                      durationMinutes: 45,
                      category: { name: '学习' },
                    },
                    {
                      date: '2026-11-10',
                      title: '散步',
                      durationMinutes: 30,
                      category: { name: '休闲' },
                    },
                    {
                      date: '2026-11-09',
                      title: '编程练习',
                      durationMinutes: 60,
                      category: { name: '学习' },
                    },
                  ];
          return success({
            queryId: 'fixture-query',
            dataset: 'time_record',
            releaseId: 'time-record-v4',
            rowCount: rows.length,
            executedAt: '2026-11-11T06:00:00Z',
            result: { timeRecords: rows },
          });
        },
      );
      try {
        await page.goto(origin + '/auth/login');
        await page
          .locator('input:not([type="password"])')
          .first()
          .fill('fixture');
        await page.locator('input[type="password"]').fill('fixture-password');
        await page.getByRole('button', { name: 'login', exact: true }).click();
        await page
          .getByRole('textbox', { name: 'GraphQL 查询', exact: true })
          .waitFor();
        await page
          .getByRole('button', { name: '运行查询', exact: true })
          .waitFor({ state: 'visible' });
        await page.waitForFunction(
          () =>
            !document.querySelector('.query-toolbar .ant-btn-primary')
              ?.disabled,
        );
        await page.evaluate(
          async ({ url, mode }) => {
            const { updatePreferences } = await import(url);
            updatePreferences({ theme: { mode } });
          },
          { url: preferencesModule, mode: theme },
        );
        const run = page.getByRole('button', { name: '运行查询', exact: true });
        const result = page.locator('.result-body');
        await page.getByRole('button', { name: '验证', exact: true }).click();
        await page.getByText('验证通过', { exact: true }).waitFor();
        await run.click();
        await result.getByText('阅读', { exact: true }).waitFor();
        assert.equal(await result.locator('tbody .ant-table-row').count(), 3);
        await page.waitForFunction(
          () => !document.querySelector('.ant-spin-spinning'),
        );
        await page.evaluate(() =>
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' }),
        );
        await page.waitForTimeout(300);
        await page.screenshot({
          path: `${output}/${width}-${theme}-workbench.png`,
          fullPage: true,
          animations: 'disabled',
        });
        await page.getByRole('button', { name: 'JSON', exact: true }).click();
        assert.match(await result.innerText(), /"durationMinutes": 45/);
        await page.getByRole('button', { name: '表格', exact: true }).click();
        // 变量错误只阻止本地提交，后端错误展示 rscode 协议中的 result 文案。
        await page.getByRole('button', { name: '变量', exact: true }).click();
        const variables = page.getByRole('textbox', {
          name: '查询变量 JSON',
          exact: true,
        });
        const original = await variables.inputValue();
        await variables.fill('[]');
        const before = requests.length;
        await run.click();
        await page.getByText('变量必须是 JSON 对象', { exact: true }).waitFor();
        assert.equal(requests.length, before);
        await variables.fill(original);
        await page.getByRole('button', { name: '查询', exact: true }).click();
        for (const mode of ['error', 'empty', 'single', 'rows']) {
          resultMode = mode;
          delay = 550;
          const height = await page
            .locator('.result-panel')
            .evaluate((el) => el.getBoundingClientRect().height);
          await run.click();
          // 刷新中保留既有内容，loading 不增加布局高度。
          const loadingHeight = await page
            .locator('.result-panel')
            .evaluate((el) => el.getBoundingClientRect().height);
          assert.ok(
            Math.abs(height - loadingHeight) <= 2,
            'loading 改变了结果区域高度',
          );
          await page.waitForFunction(
            () =>
              !document.querySelector('.query-toolbar .ant-btn-primary')
                ?.disabled,
          );
          if (mode === 'error')
            await page.getByText('模拟查询失败', { exact: true }).waitFor();
          else if (mode === 'empty')
            assert.equal(
              await result.locator('tbody .ant-table-row').count(),
              0,
            );
          else
            assert.equal(
              await result.locator('tbody .ant-table-row').count(),
              mode === 'single' ? 1 : 3,
            );
        }
        delay = 80;
        // 加入 ID 并确认勾选更新编辑器；服务端仍保留最终校验权。
        await page
          .getByRole('checkbox', { name: '选取 id', exact: true })
          .check();
        assert.match(
          await page
            .getByRole('textbox', { name: 'GraphQL 查询', exact: true })
            .inputValue(),
          /\n\s+id\n/,
        );
        await page
          .getByRole('button', { name: '查看数据模型', exact: true })
          .click();
        await page
          .getByRole('button', { name: '返回模型总览', exact: true })
          .waitFor();
        await page
          .getByRole('button', { name: 'durationMinutes', exact: true })
          .click();
        await page
          .getByRole('heading', { name: 'durationMinutes', exact: true })
          .waitFor();
        await page.waitForFunction(
          () => !document.querySelector('.ant-spin-spinning'),
        );
        await page.evaluate(() =>
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' }),
        );
        await page.waitForTimeout(300);
        await page.screenshot({
          path: `${output}/${width}-${theme}-model-detail.png`,
          fullPage: true,
          animations: 'disabled',
        });
        await page.getByRole('button', { name: '关联', exact: true }).click();
        await page
          .getByText('category → TimeCategory', { exact: true })
          .waitFor();
        await page.getByRole('button', { name: 'SDL', exact: true }).click();
        assert.match(
          await page.locator('.query-json').innerText(),
          /type TimeRecord/,
        );
        await page
          .getByRole('button', { name: '查询能力', exact: true })
          .click();
        assert.match(await page.locator('.capability-list').innerText(), /366/);
        await page
          .getByRole('button', { name: '返回模型总览', exact: true })
          .click();
        await page.locator('.graph-node').first().waitFor();
        await page.waitForFunction(
          () => !document.querySelector('.ant-spin-spinning'),
        );
        await page.waitForTimeout(300);
        assert.equal(await page.locator('.graph-node').count(), 10);
        await page.waitForFunction(
          () => !document.querySelector('.ant-spin-spinning'),
        );
        await page.evaluate(() =>
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' }),
        );
        await page.waitForTimeout(300);
        await page.screenshot({
          path: `${output}/${width}-${theme}-model-graph.png`,
          fullPage: true,
          animations: 'disabled',
        });
        await page
          .getByRole('textbox', { name: '搜索模型', exact: true })
          .fill('演出');
        assert.equal(await page.locator('.graph-node').count(), 1);
        await page
          .getByRole('textbox', { name: '搜索模型', exact: true })
          .fill('');
        await page.getByRole('button', { name: '列表', exact: true }).click();
        assert.equal(
          await page.locator('.models-overview tbody .ant-table-row').count(),
          7,
        );
        assert.equal(describeCount, 8, '模型详情切换重复加载模型');
        catalogFail = true;
        await page
          .getByRole('button', { name: '刷新模型', exact: true })
          .click();
        await page.getByText('模拟目录暂不可用', { exact: true }).waitFor();
        // 请求失败后保留已有模型，成功重试恢复；模拟长文本不撑破视口。
        assert.equal(
          await page.locator('.models-overview tbody .ant-table-row').count(),
          7,
        );
        catalogFail = false;
        models[0].description =
          '长文本模型说明，用于验证换行和布局稳定。'.repeat(12);
        await page.getByRole('button', { name: '重试', exact: true }).click();
        await page.waitForFunction(
          () => !document.querySelector('.ant-spin-spinning'),
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          '页面发生水平溢出',
        );
        assert.deepEqual(errors, []);
        assert.deepEqual(unhandled, []);
        console.log(`PASS: data query ${width} ${theme}`);
      } catch (error) {
        await page.waitForFunction(
          () => !document.querySelector('.ant-spin-spinning'),
        );
        await page.evaluate(() =>
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' }),
        );
        await page.waitForTimeout(300);
        await page.screenshot({
          path: `${output}/failure-${width}-${theme}.png`,
          fullPage: true,
          animations: 'disabled',
        });
        console.error({
          url: page.url(),
          errors,
          unhandled,
          body: (await page.locator('body').innerText()).slice(-5000),
        });
        throw error;
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

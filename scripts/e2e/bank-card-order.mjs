import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Real Web pages with scoped synthetic API fixtures; never writes live user data.
import { chromium } from '@playwright/test';

const origin = process.env.BANK_ORDER_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/bank-card-order';
const preferencesModule = `/@fs${
  new URL('../../packages/@core/preferences/src/index.ts', import.meta.url)
    .pathname
}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const bank = { id: '20', name: '测试银行', code: 'TEST', enabled: true };
  const cards = Array.from({ length: 6 }, (_, i) => ({
    id: String(9_007_199_254_740_993n + BigInt(i)),
    bankId: bank.id,
    bankName: bank.name,
    bankCode: bank.code,
    cardName: `测试银行卡 ${i + 1}`,
    cardType: i % 2 ? 'credit' : 'debit',
    alias: null,
    cardNoFirst4: '6222',
    cardNoLast4: `000${i}`,
    customBankName: null,
    status: 'normal',
    tags: [],
    coverFileIds: [],
    sortOrder: i,
    coverColor: '#334766',
    creditLimit: null,
  }));
  const covers = Array.from({ length: 60 }, (_, i) => ({
    id: String(9_007_199_254_750_000n + BigInt(i)),
    name: `测试卡面 ${i + 1}`,
    bankId: bank.id,
    bankName: bank.name,
    cardType: i % 2 ? 'credit' : 'debit',
    fileId: '',
    sourceUrl: null,
    isEnabled: 1,
    sortOrder: i,
    usageCount: '0',
  }));
  const fixtures = {
    '/auth/login': { accessToken: 'bank-order-fixture' },
    '/user/info': {
      userId: '1',
      id: '1',
      username: 'fixture',
      realName: '测试用户',
      roles: ['admin'],
      homePath: '/finance/bank-cards',
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
            name: 'BankCards',
            path: '/finance/bank-cards',
            component: '/bank-card/index',
            meta: { title: '银行卡', keepAlive: true },
          },
          {
            name: 'BankCardCoverAdmin',
            path: '/system/bank-card-covers',
            component: '/system/bank-card-covers/index',
            meta: { title: '银行卡卡面', keepAlive: true },
          },
        ],
      },
    ],
    '/auth/secondary-lock/menus': [],
    '/message/unread-count': { count: 0 },
    '/message/list': [],
    '/menu/preferences': { menus: [], hiddenMenuIds: [] },
    '/auth/wechat/web/capabilities': { enabled: false },
    '/bank-cards/banks': [bank],
    '/bank-cards/tags': [],
    '/system/bank-card-covers/banks': [bank],
  };
  for (const [path, data] of Object.entries(fixtures)) {
    for (const suffix of ['', '?*'])
      await page.route(`**/api${path}${suffix}`, (route) =>
        route.fulfill({ json: { rscode: '0', data } }),
      );
  }
  await page.route('**/api/bank-cards', (route) =>
    route.fulfill({ json: { rscode: '0', data: cards } }),
  );
  await page.route('**/api/system/bank-card-covers/page?*', (route) => {
    const query = new URL(route.request().url()).searchParams;
    const list = covers.filter(
      (item) =>
        !query.get('cardType') || item.cardType === query.get('cardType'),
    );
    const start = (Number(query.get('page')) - 1) * Number(query.get('size'));
    return route.fulfill({
      json: {
        rscode: '0',
        data: {
          items: list.slice(start, start + Number(query.get('size'))),
          total: String(list.length),
        },
      },
    });
  });
  const moves = [];
  let fail = false;
  for (const path of ['/bank-cards/order', '/system/bank-card-covers/order'])
    await page.route(`**/api${path}`, async (route) => {
      const move = route.request().postDataJSON();
      moves.push({ path, ...move });
      await new Promise((resolve) => setTimeout(resolve, 180));
      if (fail)
        return route.fulfill({ json: { rscode: '1', result: '模拟排序失败' } });
      const list = path.startsWith('/bank-cards') ? cards : covers;
      const moving = list.splice(
        list.findIndex((item) => item.id === move.id),
        1,
      )[0];
      list.splice(
        list.findIndex((item) => item.id === move.targetId) +
          (move.after ? 1 : 0),
        0,
        moving,
      );
      list.forEach((item, index) => {
        item.sortOrder = index;
      });
      return route.fulfill({
        json: {
          rscode: '0',
          data: list.map(({ id, sortOrder }) => ({ id, sortOrder })),
        },
      });
    });
  await page.goto(`${origin}/auth/login`);
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page
    .locator('button')
    .filter({ hasText: /^登录$/ })
    .click();
  await page.locator('.bank-item').first().waitFor({ timeout: 30_000 });
  await page
    .getByText('登录成功', { exact: true })
    .waitFor({ state: 'hidden' });

  async function ids(selector) {
    return page
      .locator(selector)
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.cardId));
  }
  async function drag(selector) {
    const before = await ids(selector);
    const first = page
      .locator(selector)
      .nth(0)
      .locator('[role="button"]')
      .first();
    const third = page.locator(selector).nth(2);
    const a = await first.boundingBox();
    const b = await third.boundingBox();
    const previous = moves.length;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, {
      steps: 4,
    });
    await page.waitForTimeout(120);
    await page.mouse.move(b.x + b.width - 10, b.y + b.height / 2, {
      steps: 18,
    });
    await page.waitForTimeout(250);
    await page.mouse.up();
    await page.waitForFunction(
      () => !document.querySelector('[data-card-id][aria-busy="true"]'),
    );
    assert.equal(moves.length, previous + 1, 'drag must save once');
    assert.notDeepEqual(await ids(selector), before, 'drag must reorder');
    assert.equal(
      await page.locator('.ant-modal:visible').count(),
      0,
      'drag must not open editor',
    );
    const changed = await ids(selector);
    await page.reload();
    await page.locator(selector).first().waitFor();
    const reloaded = await ids(selector);
    assert.deepEqual(
      reloaded.slice(0, changed.length),
      changed,
      'order survives reload',
    );
  }

  async function touchDrag(selector) {
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.locator(selector).first().scrollIntoViewIfNeeded();
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const a = await page
      .locator(selector)
      .nth(0)
      .locator('[role="button"]')
      .first()
      .boundingBox();
    const b = await page.locator(selector).nth(1).boundingBox();
    const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
    const finish = {
      x: b.x + b.width / 2,
      y: Math.min(900, b.y + b.height - 20),
    };
    const previous = moves.length;
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [start],
    });
    await page.waitForTimeout(350);
    for (let step = 1; step <= 12; step++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x: start.x + ((finish.x - start.x) * step) / 12,
            y: start.y + ((finish.y - start.y) * step) / 12,
          },
        ],
      });
      await page.waitForTimeout(25);
    }
    await page.waitForTimeout(200);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await page.waitForTimeout(350);
    assert.equal(moves.length, previous + 1, 'touch drag saves once');
    assert.equal(
      await page.locator('.ant-modal:visible').count(),
      0,
      'touch drag does not edit',
    );
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await client.detach();
  }

  for (const [path, selector] of [
    ['/finance/bank-cards', '.bank-item'],
    ['/system/bank-card-covers', '.cover-item'],
  ]) {
    await page.goto(origin + path);
    await page.locator(selector).first().waitFor();
    await page.waitForTimeout(1100);
    await drag(selector);
    const before = await ids(selector);
    fail = true;
    await page
      .locator(selector)
      .first()
      .locator('[role="button"]')
      .first()
      .press('ArrowDown');
    await page.getByText('模拟排序失败', { exact: true }).waitFor();
    await page.waitForFunction(
      () => !document.querySelector('[data-card-id][aria-busy="true"]'),
    );
    assert.deepEqual(await ids(selector), before, 'failure rolls back');
    fail = false;
    await page
      .getByText('模拟排序失败', { exact: true })
      .waitFor({ state: 'hidden' });
    await touchDrag(selector);
    for (const width of [390, 820, 1440])
      for (const dark of [false, true]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          async ({ dark, module }) => {
            const { updatePreferences } = await import(module);
            updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
          },
          { dark, module: preferencesModule },
        );
        await page.waitForTimeout(200);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${path} ${width}: overflow`,
        );
        await page.screenshot({
          path: `${output}/${selector.slice(1)}-${width}-${dark ? 'dark' : 'light'}.png`,
          fullPage: false,
        });
      }
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: both pages mouse/touch drag, reload persistence, keyboard failure rollback, 12 responsive/theme layouts',
  );
} finally {
  await browser.close();
}

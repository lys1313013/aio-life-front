import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Real Web pages with scoped synthetic API fixtures; never writes live user data.
import { chromium } from '@playwright/test';

const origin = process.env.BANK_ORDER_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/bank-card-balance';
const preferencesModule = `/@fs${
  new URL('../../packages/@core/preferences/src/index.ts', import.meta.url)
    .pathname
}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
let page;
try {
  page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.fallback();
    console.error('Unmocked API:', path);
    return route.abort();
  });
  page.setDefaultTimeout(10_000);
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
    creditLimit: i % 2 ? '50000.00' : null,
    balance: i % 2 ? null : '0.00',
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
    '/message/page': { items: [], total: 0 },
    '/menu/visuals': { menus: [], cards: {} },
    '/menu/preferences': { menus: [], hiddenMenuIds: [] },
    '/auth/wechat/web/capabilities': { enabled: false },
    '/bank-cards/banks': [bank],
    '/bank-cards/tags': [],
    '/system/bank-card-covers/banks': [bank],
  };
  for (const [path, data] of Object.entries(fixtures)) {
    for (const suffix of ['', '?*'])
      await page.route(`**/api${path}${suffix}`, (route) =>
        route.fulfill({ json: { code: 0, data } }),
      );
  }
  await page.route('**/api/bank-cards', (route) =>
    route.fulfill({ json: { code: 0, data: cards } }),
  );
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

  const requests = [];
  let failSave = false;
  await page.route('**/api/bank-cards/*', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    const payload = route.request().postDataJSON();
    requests.push(payload);
    if (failSave)
      return route.fulfill({ json: { code: 1, message: '模拟保存失败' } });
    const index = cards.findIndex(
      (card) =>
        card.id === new URL(route.request().url()).pathname.split('/').at(-1),
    );
    cards[index] = { ...cards[index], ...payload };
    return route.fulfill({ json: { code: 0, data: cards[index] } });
  });
  const debitId = cards[0].id;
  const debit = () => page.locator(`[data-card-id="${debitId}"]`);
  async function editor() {
    await debit()
      .getByRole('button', { name: /^编辑银行卡：/ })
      .click();
    return page.locator('.ant-modal:visible');
  }
  async function save(dialog) {
    await dialog.getByRole('button', { name: /保\s*存/ }).click();
    await dialog.waitFor({ state: 'hidden' });
  }
  for (const width of [390, 768, 1440])
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        async ({ url, dark }) => {
          const { updatePreferences } = await import(url);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { url: preferencesModule, dark: theme === 'dark' },
      );
      assert.match(await debit().innerText(), /余额：0 元/);
      await page.screenshot({
        path: `${output}/${width}-${theme}-list.png`,
        fullPage: true,
      });
      const dialog = await editor();
      const input = dialog
        .locator('.ant-form-item')
        .filter({ hasText: '余额（元）' })
        .locator('input');
      await input.fill('9999999999999999.99');
      await page.waitForTimeout(250);
      await page.screenshot({
        path: `${output}/${width}-${theme}-editor.png`,
        fullPage: true,
      });
      await save(dialog);
      assert.equal(requests.at(-1).balance, '9999999999999999.99');
      assert.match(await debit().innerText(), /9,999,999,999,999,999.99/);
      await editor();
      await input.fill('');
      await save(dialog);
      assert.equal(requests.at(-1).balance, null);
      assert.match(await debit().innerText(), /余额：未记录/);
      await editor();
      await input.fill('0');
      failSave = true;
      await dialog.getByRole('button', { name: /保\s*存/ }).click();
      await page.getByText('模拟保存失败', { exact: true }).waitFor();
      assert.match(await input.inputValue(), /^0(?:\.0+)?$/);
      failSave = false;
      await save(dialog);
      assert.match(requests.at(-1).balance, /^0(?:\.0+)?$/);
    }
  const dialog = await editor();
  const type = dialog
    .locator('.ant-form-item')
    .filter({ hasText: '类型' })
    .locator('.ant-select');
  await type.click();
  await page
    .locator('.ant-select-dropdown:visible')
    .getByText('信用卡', { exact: true })
    .click();
  const credit = dialog
    .locator('.ant-form-item')
    .filter({ hasText: '信用额度（元）' })
    .locator('input');
  await credit.fill('50000.50');
  await save(dialog);
  assert.equal(requests.at(-1).balance, null);
  assert.equal(requests.at(-1).creditLimit, '50000.5');
  assert.match(await debit().innerText(), /信用额度：50,000.5 元/);
  assert.deepEqual(errors, []);
  console.log(
    'Web bank card balance: six viewport/theme checks, precision, zero, clear, failure retry and type switch passed.',
  );
} catch (error) {
  console.error(error);
  await page.screenshot({
    path: `${output}/failure.png`,
    fullPage: true,
    timeout: 5000,
  });
  throw error;
} finally {
  await browser.close();
}

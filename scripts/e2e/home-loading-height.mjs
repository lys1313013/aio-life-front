import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Real Web settings/home with synthetic accounts and narrowly scoped API fixtures.
import { chromium } from '@playwright/test';

const origin = process.env.HOME_CARDS_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/home-loading-height';
const preferencesModule = `/@fs${
  new URL('../../packages/@core/preferences/src/index.ts', import.meta.url)
    .pathname
}`;
await mkdir(output, { recursive: true });
const definitions = [
  ['overview.leetcode', '每日一题', 'lucide:code'],
  ['overview.github', 'GitHub', 'mdi:github'],
  ['overview.exercise', '今日运动', 'mdi:run'],
  ['overview.shanbay', '扇贝单词', 'lucide:leaf'],
  ['overview.read', '今日阅读', 'lucide:book-open'],
  ['section.time', '时迹', 'lucide:clock'],
  ['section.links', '快捷导航', 'lucide:layout-grid'],
  ['section.watched', '待办', 'lucide:list-checks'],
  ['section.thoughts', '闪念', 'lucide:lightbulb'],
  ['section.goal', '目标', 'lucide:crosshair'],
  ['section.anniversary', '纪念日', 'mdi:calendar-heart'],
  ['section.reading', '阅读', 'lucide:book-open'],
  ['section.membership', '会员', 'lucide:crown'],
  ['section.movie', '观影', 'lucide:clapperboard'],
  ['section.exercise', '运动', 'mdi:run'],
  ['section.github', 'GitHub 最近提交', 'mdi:github'],
];
const defaults = () =>
  definitions.map(([cardKey, title, icon], sortOrder) => ({
    cardKey,
    title,
    icon,
    sortOrder,
    group: cardKey.split('.')[0],
    enabled: true,
  }));
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : 'chrome',
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();
  let cards = defaults();
  const calls = [];
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400)
      console.error(
        'HTTP',
        response.status(),
        new URL(response.url()).pathname,
      );
  });

  const fixtures = {
    '/auth/login': { accessToken: 'home-card-fixture' },
    '/user/info': {
      userId: '9007199254740993',
      id: '9007199254740993',
      username: 'fixture',
      realName: '测试用户',
      roles: ['user'],
      homePath: '/',
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
            name: 'Profile',
            path: '/profile',
            component: '/_core/profile/index',
            meta: { title: '个人中心', keepAlive: true },
          },
          {
            name: 'Home',
            path: '/',
            component: '/dashboard/home/index',
            meta: { title: '首页', keepAlive: true },
          },
        ],
      },
    ],
    '/auth/secondary-lock/menus': [],
    '/message/unread-count': { count: 0 },
    '/message/list': [],
    '/menu/preferences': { menus: [], hiddenMenuIds: [] },
    '/auth/wechat/web/capabilities': { enabled: false },
    '/dashboard/tasks': [
      { type: 'GITHUB', title: 'GitHub', icon: 'mdi:github' },
      { type: 'EXERCISE', title: '今日运动', icon: 'mdi:run' },
    ],
    '/dashboard/card/GITHUB': {
      type: 'GITHUB',
      title: 'GitHub',
      value: '2',
      refreshInterval: 60,
    },
    '/dashboard/card/EXERCISE': {
      type: 'EXERCISE',
      title: '今日运动',
      value: '3',
      refreshInterval: 60,
    },
    '/userbinds/list': [{ platform: 'github', platformUsername: 'fixture' }],
    '/github/recent-commits': [
      {
        id: '1',
        repo: 'fixture',
        message: '模拟提交',
        date: '2026-10-05T00:00:00Z',
      },
    ],
    '/taskDetails/watched': [
      { id: '1', content: '模拟待办', taskName: '模拟任务', isCompleted: 0 },
    ],
    '/thought/dashboard': [
      { id: '1', content: '模拟闪念', createTime: '2026-10-05T00:00:00Z' },
    ],
    '/quick-nav/my': [],
    '/exerciseRecord/dashboardSummary': {
      days: [
        {
          date: '2026-10-05',
          items: [
            { exerciseTypeId: '1', typeLabel: '跑步', count: 1, trend: [] },
          ],
        },
      ],
      hasMore: false,
    },
    '/timeRecord/query': [],
    '/timeTrackerCategory/all': [],
  };
  const businessMenus = [
    ['/task-center/goal', 'Goal'],
    ['/my-hub/anniversary', 'Anniversary'],
    ['/my-hub/read-record', 'Reading'],
    ['/membership', 'Membership'],
    ['/my-hub/movie', 'Movie'],
  ];
  fixtures['/menu/all'][0].children.push(
    ...businessMenus.map(([path, name], index) => ({
      path,
      name,
      component: '/dashboard/home/index',
      meta: { title: name, menuId: String(index + 1) },
    })),
  );
  fixtures['/menu/visuals'] = {
    menus: [],
    cards: Object.fromEntries(
      ['goal', 'anniversary', 'reading', 'membership', 'movie'].map(
        (key, index) => [`section.${key}`, { menuId: String(index + 1) }],
      ),
    ),
  };
  Object.assign(fixtures, {
    '/goals': [
      {
        id: '1',
        title: '模拟目标',
        status: 'in_progress',
        isPinned: 1,
        targetValue: 10,
        currentValue: 2,
      },
    ],
    '/anniversaryRecords': [
      { id: '1', title: '模拟纪念日', targetDate: '2026-12-01', isPinned: 1 },
    ],
    '/membership/list': [
      { id: '1', name: '模拟会员', status: 'active', expiryDate: '2099-01-01' },
    ],
    '/movie/page': {
      items: [{ id: '1', title: '模拟观影', status: 'not_started' }],
      total: '1',
    },
    '/read-record/page': {
      items: [{ id: '1', title: '模拟阅读', status: 'in_progress' }],
      total: '1',
    },
    '/home/cards': cards,
  });
  let recordCount = 1;
  let failBusiness = false;
  const failedSections = new Set();
  const businessPaths = new Set([
    '/anniversaryRecords',
    '/goals',
    '/membership/list',
    '/movie/page',
    '/read-record/page',
  ]);
  let release;
  let pending = new Promise((resolve) => {
    release = resolve;
  });
  const delayed = new Set([
    '/anniversaryRecords',
    '/exerciseRecord/dashboardSummary',
    '/goals',
    '/membership/list',
    '/movie/page',
    '/read-record/page',
    '/taskDetails/watched',
    '/thought/dashboard',
  ]);
  for (const [path, data] of Object.entries(fixtures)) {
    const handler = async (route) => {
      if (delayed.has(path)) await pending;
      calls.push(new URL(route.request().url()).pathname);
      if ((businessPaths.has(path) && failBusiness) || failedSections.has(path))
        return route.fulfill({ json: { rscode: '1', result: '模拟刷新失败' } });
      let result = data;
      if (path === '/home/cards') result = cards;
      if (path === '/dashboard/tasks') result = fixtures[path];
      if (
        path === '/read-record/page' &&
        new URL(route.request().url()).searchParams.get('status') ===
          'not_started'
      )
        return route.fulfill({
          json: { rscode: '0', data: { items: [], total: '0' } },
        });
      if (businessPaths.has(path) && recordCount !== 1) {
        const rows = Array.isArray(data) ? data : data.items;
        const items = Array.from({ length: recordCount }, (_, index) => ({
          ...rows[0],
          id: String(index + 1),
          title: `模拟长标题用于检查多条内容换行和高度 ${index}`,
          name: `模拟长名称用于检查换行和高度 ${index}`,
        }));
        result = Array.isArray(data)
          ? items
          : { items, total: String(items.length) };
      }
      return route.fulfill({ json: { rscode: '0', data: result } });
    };
    await page.route(`**/api${path}`, handler);
    await page.route(`**/api${path}?*`, handler);
  }
  await page.goto(`${origin}/auth/login`);
  await page.locator('input:not([type="password"])').first().fill('fixture');
  await page.locator('input[type="password"]').fill('fixture-password');
  await page
    .locator('button')
    .filter({ hasText: /^登录$/ })
    .click();
  await page
    .locator('.business-list-card')
    .first()
    .waitFor({ timeout: 15_000 })
    .catch(async (error) => {
      console.error({
        url: page.url(),
        calls,
        errors,
        body: await page.locator('body').innerText(),
      });
      throw error;
    });
  function geometry() {
    return page
      .locator('.business-list-card, .dashboard-section')
      .evaluateAll((elements) =>
        elements.map((el) => ({
          title:
            el.getAttribute('aria-label') ||
            el
              .querySelector('button[aria-label^="刷新"]')
              ?.getAttribute('aria-label'),
          height: el.getBoundingClientRect().height,
          top: (() => {
            let top = el.getBoundingClientRect().top + window.scrollY;
            for (
              let parent = el.parentElement;
              parent && parent !== document.documentElement;
              parent = parent.parentElement
            )
              top += parent.scrollTop;
            return top;
          })(),
        })),
      );
  }
  const results = [];
  for (const width of [390, 820, 1440])
    for (const dark of [false, true]) {
      recordCount = 1;
      failBusiness = false;
      await page.setViewportSize({ width, height: 1100 });
      await page.evaluate(
        async ({ dark, module }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { dark, module: preferencesModule },
      );
      // Remount the real homepage for each initial-loading measurement.
      if (results.length > 0) {
        pending = new Promise((resolve) => {
          release = resolve;
        });
        await page.reload();
        await page.locator('.business-list-card').first().waitFor();
      }
      // Reload initializes preferences again; apply and verify the requested theme afterwards.
      await page.evaluate(
        async ({ dark, module }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { dark, module: preferencesModule },
      );
      await page.waitForFunction(
        (expected) =>
          document.documentElement.classList.contains('dark') === expected,
        dark,
      );
      await page.locator('[aria-label="观影"] [role="status"]').waitFor();
      await page.waitForTimeout(250);
      const before = await geometry();
      await page.screenshot({
        path: `${output}/${width}-${dark ? 'dark' : 'light'}-loading.png`,
        fullPage: true,
      });
      release();
      await page
        .locator('[aria-label="观影"]')
        .getByRole('button', { name: '编辑模拟观影', exact: true })
        .waitFor({ timeout: 10_000 })
        .catch(async (error) => {
          console.error({
            calls,
            errors,
            body: await page.locator('.dashboard-home').innerText(),
          });
          throw error;
        });
      await page.waitForTimeout(300);
      const after = await geometry();
      results.push({ width, dark, before, after });
      for (const title of ['目标', '纪念日', '阅读', '会员', '观影']) {
        assert.equal(
          after.find((row) => row.title === title)?.height,
          before.find((row) => row.title === title)?.height,
          `${width} ${title}: initial height`,
        );
      }
      await page.screenshot({
        path: `${output}/${width}-${dark ? 'dark' : 'light'}-loaded.png`,
        fullPage: true,
      });
      pending = new Promise((resolve) => {
        release = resolve;
      });
      const loaded = await geometry();
      for (const title of [
        '目标',
        '纪念日',
        '阅读',
        '会员',
        '观影',
        '待办',
        '闪念',
        '运动',
      ])
        await page
          .getByRole('button', { name: `刷新${title}`, exact: true })
          .click();
      await page.waitForTimeout(250);
      assert.deepEqual(await geometry(), loaded, `${width}: refresh geometry`);
      assert.equal(
        await page
          .locator('.business-list-card [role="status"][aria-label="加载中"]')
          .count(),
        0,
      );
      release();
      await page.waitForTimeout(300);
      recordCount = 8;
      for (const title of ['目标', '纪念日', '阅读', '会员', '观影'])
        await page
          .getByRole('button', { name: `刷新${title}`, exact: true })
          .click();
      await page.waitForFunction(
        () =>
          document.querySelectorAll('[aria-label="目标"] [data-goal-id]')
            .length === 8,
      );
      await page.waitForFunction(() =>
        ['目标', '纪念日', '阅读', '会员', '观影'].every(
          (title) =>
            document
              .querySelector(`[aria-label="${title}"]`)
              ?.querySelectorAll('button[aria-label^="编辑模拟长"]').length ===
            8,
        ),
      );
      const many = await geometry();
      for (const title of ['目标', '纪念日', '阅读', '会员', '观影'])
        assert.ok(many.find((row) => row.title === title).height <= 280);
      await page.screenshot({
        path: `${output}/${width}-${dark ? 'dark' : 'light'}-many.png`,
        fullPage: true,
      });
      failBusiness = true;
      for (const title of ['目标', '纪念日', '阅读', '会员', '观影'])
        await page
          .getByRole('button', { name: `刷新${title}`, exact: true })
          .click();
      await page
        .getByRole('button', { name: '观影加载失败，重试', exact: true })
        .waitFor();
      await page.waitForFunction(
        () =>
          document.querySelectorAll('button[aria-label$="加载失败，重试"]')
            .length === 5,
      );
      assert.deepEqual(
        await geometry(),
        many,
        'refresh failure keeps heights and positions',
      );
      failBusiness = false;
      recordCount = 0;
      for (const title of ['目标', '纪念日', '阅读', '会员', '观影'])
        await page
          .getByRole('button', { name: `刷新${title}`, exact: true })
          .click();
      await page.waitForFunction(
        () => document.querySelectorAll('.business-list-card').length === 0,
      );
    }
  delayed.add('/dashboard/tasks');
  for (const count of [1, 2]) {
    const enabledTypes = ['github', 'exercise'].slice(0, count);
    cards = defaults().map((item) => ({
      ...item,
      enabled: enabledTypes.some((type) => item.cardKey === `overview.${type}`),
    }));
    fixtures['/dashboard/tasks'] = fixtures['/dashboard/tasks'].slice(0, count);
    if (count === 2)
      fixtures['/dashboard/tasks'].push({
        type: 'EXERCISE',
        title: '今日运动',
        icon: 'mdi:run',
      });
    pending = new Promise((resolve) => {
      release = resolve;
    });
    await page.setViewportSize({ width: 390, height: 1100 });
    await page.reload();
    await page.waitForFunction(
      (expected) =>
        document.querySelectorAll('.analysis-card').length === expected,
      count,
    );
    const before = await page
      .locator('.analysis-card')
      .first()
      .locator('..')
      .evaluate((el) => el.getBoundingClientRect().height);
    release();
    await page.waitForFunction(
      () => document.querySelectorAll('.analysis-card-progress').length === 0,
    );
    assert.equal(await page.locator('.analysis-card').count(), count);
    assert.equal(
      await page
        .locator('.analysis-card')
        .first()
        .locator('..')
        .evaluate((el) => el.getBoundingClientRect().height),
      before,
    );
  }
  cards = defaults();
  for (const width of [390, 820, 1440])
    for (const dark of [false, true]) {
      await page.setViewportSize({ width, height: 1100 });
      failedSections.clear();
      for (const path of [
        '/thought/dashboard',
        '/taskDetails/watched',
        '/timeRecord/query',
        '/github/recent-commits',
      ])
        failedSections.add(path);
      await page.reload();
      await page.evaluate(
        async ({ dark, module }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { dark, module: preferencesModule },
      );
      for (const title of ['闪念', '待办', '时迹', '最近提交'])
        await page
          .getByRole('button', { name: `${title}加载失败，重试`, exact: true })
          .waitFor();
      assert.equal(
        await page.getByText('暂无固定的闪念', { exact: true }).count(),
        0,
      );
      assert.equal(
        await page.getByText('暂无关注的待办', { exact: true }).count(),
        0,
      );
      assert.equal(
        await page.getByText('暂无最近提交', { exact: true }).count(),
        0,
      );
      failedSections.clear();
      for (const title of ['闪念', '待办', '时迹', '最近提交'])
        await page
          .getByRole('button', { name: `${title}加载失败，重试`, exact: true })
          .click();
      await page.waitForFunction(
        () =>
          document.querySelectorAll('button[aria-label$="加载失败，重试"]')
            .length === 0,
      );
      const retained = await geometry();
      for (const path of [
        '/thought/dashboard',
        '/taskDetails/watched',
        '/timeRecord/query',
        '/github/recent-commits',
      ])
        failedSections.add(path);
      for (const title of ['闪念', '待办', '时迹', '最近提交'])
        await page
          .getByRole('button', { name: `刷新${title}`, exact: true })
          .click();
      for (const title of ['闪念', '待办', '时迹', '最近提交'])
        await page
          .getByRole('button', { name: `${title}加载失败，重试`, exact: true })
          .waitFor();
      assert.deepEqual(
        await geometry(),
        retained,
        `${width} ${dark}: section refresh failure retains geometry`,
      );
      await page.screenshot({
        path: `${output}/${width}-${dark ? 'dark' : 'light'}-section-failure.png`,
        fullPage: true,
      });
      failedSections.clear();
    }
  await import('node:fs/promises').then((fs) =>
    fs.writeFile(`${output}/geometry.json`, JSON.stringify(results, null, 2)),
  );
  assert.deepEqual(errors, []);
  console.log(
    'Web all home cards: 6 viewport/theme combinations passed; refresh positions retained.',
  );
} finally {
  await browser.close();
}

import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

import { chromium, expect } from '@playwright/test';

const origin = process.env.TIME_WEB_ORIGIN || 'http://127.0.0.1:5666';
const output = 'node_modules/.cache/time-exercise-groups';
const preferencesModule = `/@fs${new URL('../../packages/@core/preferences/src/index.ts', import.meta.url).pathname}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const widths = process.env.TIME_TEST_WIDTH
    ? [Number(process.env.TIME_TEST_WIDTH)]
    : [390, 820, 1440];
  for (const width of widths) {
    for (const dark of [false, true]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      await context.addInitScript(() =>
        localStorage.setItem('time-tracker-view-mode', 'card'),
      );
      const page = await context.newPage();
      const errors = [];
      const unexpected = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const recordId = '9007199254740993';
      const pushupId = '9007199254741001';
      const squatId = '9007199254741002';
      const longId = '9007199254741003';
      const longName = '很长的运动项目名称用于检查横向滚动和弹窗排版';
      const initialExercises = [
        {
          id: '9007199254741011',
          exerciseTypeId: pushupId,
          exerciseCount: 12,
          description: '保留组备注',
        },
        { id: '9007199254741012', exerciseTypeId: squatId, exerciseCount: 20 },
        { id: '9007199254741013', exerciseTypeId: pushupId, exerciseCount: 12 },
        { id: '9007199254741014', exerciseTypeId: pushupId, exerciseCount: 12 },
        { id: '9007199254741015', exerciseTypeId: longId, exerciseCount: 0 },
      ];
      const detail = {
        id: recordId,
        categoryId: 'sports',
        date: '2026-11-12',
        startMinute: 1143,
        endMinute: 1151,
        title: '模拟运动记录',
        description: '保留记录备注',
        durationMinutes: 9,
        isManual: 1,
        exercises: structuredClone(initialExercises),
      };
      let saved;
      const fixtures = {
        '/auth/login': { accessToken: 'fixture-time-exercises' },
        '/user/info': {
          id: '7',
          userId: '7',
          username: 'fixture',
          realName: '模拟用户',
          roles: ['admin'],
          homePath: '/time/time-tracker',
        },
        '/auth/codes': ['admin'],
        '/menu/all': [
          {
            name: 'TimeManagement',
            path: '/time-management',
            component: 'BasicLayout',
            meta: { title: '时间' },
            children: [
              {
                name: 'TimeTracker',
                path: '/time/time-tracker',
                component: '/time/time-tracker/index',
                meta: { title: '时迹', menuId: 'time-menu' },
              },
            ],
          },
        ],
        '/auth/secondary-lock/menus': [],
        '/message/unread-count': { count: 0 },
        '/message/page': { items: [], total: 0 },
        '/menu/visuals': { menus: [], cards: {} },
        '/menu/preferences': { menus: [], hiddenMenuIds: [] },
        '/auth/wechat/web/capabilities': { enabled: false },
        '/timeTrackerCategory/all': [
          {
            id: 'sports',
            name: '运动',
            icon: 'lucide:dumbbell',
            color: '#ff681f',
            parentId: '0',
            isEnabled: 1,
            isTrackTime: 1,
            timeType: 2,
          },
        ],
        '/timeRecord/relateTypes': [],
        '/userDictType/getByDictType': {
          dictDetailList: [
            {
              id: pushupId,
              dictLabel: '俯卧撑',
              icon: 'lucide:dumbbell',
              color: '#1890ff',
            },
            {
              id: squatId,
              dictLabel: '深蹲',
              icon: 'lucide:dumbbell',
              color: '#18a058',
            },
            {
              id: longId,
              dictLabel: longName,
              icon: 'lucide:dumbbell',
              color: '#9856d9',
            },
          ],
        },
      };
      await page.route('**/api/**', async (route) => {
        const request = route.request();
        const pathname = new URL(request.url()).pathname;
        if (!pathname.startsWith('/api/')) return route.fallback();
        const path = pathname.replace(/^\/api/, '');
        const ok = (data) =>
          route.fulfill({ json: { code: 0, message: null, data } });
        if (path === `/timeRecord/${recordId}`) {
          if (request.method() === 'PUT') {
            saved = request.postDataJSON();
            return ok(null);
          }
          return ok(detail);
        }
        if (
          path === '/timeRecord/query' ||
          path === '/timeRecord/queryByDateRange'
        )
          return ok([detail]);
        if (path in fixtures) return ok(fixtures[path]);
        unexpected.push(`${request.method()} ${path}`);
        return route.fulfill({
          status: 500,
          json: { code: 1, message: `未声明模拟接口 ${path}` },
        });
      });
      await page.goto(`${origin}/auth/login`);
      await page
        .locator('input:not([type="password"])')
        .first()
        .fill('fixture');
      await page.locator('input[type="password"]').fill('fixture-password');
      await page
        .locator('button')
        .filter({ hasText: /^登录$/ })
        .click();
      await page.waitForURL('**/time/time-tracker');
      await page.evaluate(
        async ({ module, dark }) => {
          const { updatePreferences } = await import(module);
          updatePreferences({ theme: { mode: dark ? 'dark' : 'light' } });
        },
        { module: preferencesModule, dark },
      );
      await page
        .locator('.time-card')
        .filter({ hasText: '模拟运动记录' })
        .click();
      const main = page.getByRole('dialog', { name: '时迹录入', exact: true });
      const editor = page.getByRole('dialog', {
        name: '编辑运动组',
        exact: true,
      });
      const selector = page.getByRole('dialog', {
        name: '选择运动',
        exact: true,
      });
      const tab = (name) => main.getByRole('button', { name, exact: true });
      const saveGroup = () =>
        editor.getByRole('button', { name: /^保\s*存$/ }).click();
      const cancelGroup = () =>
        editor.getByRole('button', { name: /^取\s*消$/ }).click();
      const snapshot = async (name) => {
        const section = main.locator('.exercise-section');
        assert.ok(
          await section.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          '运动区不应横向溢出',
        );
        await expect(main.locator('.ant-modal')).not.toHaveClass(
          /ant-zoom-(enter|appear)/,
        );
        await main.locator('.ant-modal-content').screenshot({
          animations: 'disabled',
          path: `${output}/${width}-${dark ? 'dark' : 'light'}-${name}.png`,
        });
      };
      await expect(main.locator('.app-modal-body')).toHaveAttribute(
        'aria-busy',
        'false',
      );
      await expect(tab('俯卧撑，3组，共36次')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(main.locator('.exercise-set-value')).toHaveText([
        '12',
        '12',
        '12',
      ]);
      await snapshot('groups');
      await tab('深蹲，1组，共20次').click();
      await expect(main.locator('.exercise-set-value')).toHaveText(['20']);
      await snapshot('single');
      await tab(`${longName}，1组，共0次`).click();
      await snapshot('long');
      await tab('俯卧撑，3组，共36次').click();
      await main
        .getByRole('button', { name: '俯卧撑第1组，12次，编辑', exact: true })
        .click();
      await editor.getByRole('spinbutton', { name: '运动次数' }).fill('18');
      await expect(
        editor.getByRole('button', { name: '修改运动类型', exact: true }),
      ).toHaveCSS('border-top-width', '1px');
      await expect(editor.locator('.ant-modal')).not.toHaveClass(
        /ant-zoom-(enter|appear)/,
      );
      await editor.locator('.ant-modal-content').screenshot({
        animations: 'disabled',
        path: `${output}/${width}-${dark ? 'dark' : 'light'}-set-editor.png`,
      });
      await cancelGroup();
      await expect(tab('俯卧撑，3组，共36次')).toBeVisible();
      await main
        .getByRole('button', { name: '俯卧撑第1组，12次，编辑', exact: true })
        .click();
      await editor.getByRole('spinbutton', { name: '运动次数' }).fill('18');
      await editor.getByRole('spinbutton', { name: '运动次数' }).press('Enter');
      await expect(editor).toHaveCount(0);
      await expect(tab('俯卧撑，3组，共42次')).toBeVisible();
      assert.equal(saved, undefined, '子弹窗回车不应保存整条时迹');
      await main
        .getByRole('button', { name: '为俯卧撑加一组', exact: true })
        .click();
      await expect(
        editor.getByRole('spinbutton', { name: '运动次数' }),
      ).toHaveValue('12');
      await editor.getByRole('spinbutton', { name: '运动次数' }).fill('');
      await saveGroup();
      await expect(editor.getByRole('alert')).toBeVisible();
      await editor.getByRole('spinbutton', { name: '运动次数' }).fill('8');
      await saveGroup();
      await expect(tab('俯卧撑，4组，共50次')).toBeVisible();
      await main
        .getByRole('button', { name: '删除俯卧撑第4组', exact: true })
        .click();
      await main
        .getByRole('button', { name: '俯卧撑第2组，12次，编辑', exact: true })
        .click();
      await editor
        .getByRole('button', { name: '修改运动类型', exact: true })
        .click();
      await selector.getByRole('button', { name: '深蹲', exact: true }).click();
      await saveGroup();
      await expect(tab('深蹲，2组，共32次')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await main.getByRole('button', { name: '添加运动', exact: true }).click();
      await selector
        .getByRole('button', { name: '俯卧撑', exact: true })
        .click();
      await saveGroup();
      await expect(tab('俯卧撑，3组，共42次')).toBeVisible();
      await main.getByRole('button', { name: /^保\s*存$/ }).click();
      await expect.poll(() => saved).toBeTruthy();
      assert.equal(saved.description, '保留记录备注');
      assert.equal(saved.exercises[0].id, initialExercises[0].id);
      assert.equal(saved.exercises[0].description, '保留组备注');
      assert.equal(saved.exercises[0].exerciseCount, 18);
      assert.equal(saved.exercises[2].exerciseTypeId, squatId);
      assert.equal(saved.exercises[4].exerciseCount, 0);
      assert.deepEqual(
        detail.exercises,
        initialExercises,
        '编辑草稿不能修改输入数据',
      );
      // 删除当前类型最后一组后应回到剩余类型；删空后仍可添加。
      await page
        .locator('.time-card')
        .filter({ hasText: '模拟运动记录' })
        .click();
      await expect(main.locator('.app-modal-body')).toHaveAttribute(
        'aria-busy',
        'false',
      );
      while (await main.locator('.exercise-set-remove').count()) {
        await main.locator('.exercise-set-remove').first().click();
      }
      await expect(main.locator('.exercise-set-tile')).toHaveCount(0);
      await snapshot('empty');
      await main.getByRole('button', { name: '添加运动', exact: true }).click();
      await selector
        .getByRole('button', { name: '俯卧撑', exact: true })
        .click();
      await editor.getByRole('spinbutton', { name: '运动次数' }).fill('0');
      await saveGroup();
      await expect(tab('俯卧撑，1组，共0次')).toBeVisible();
      assert.deepEqual(unexpected, []);
      assert.deepEqual(errors, []);
      console.log(
        `PASS exercise groups ${width} ${dark ? 'dark' : 'light'}: tabs, edit, cancel, Enter, add, change type, remove, metadata, zero, empty`,
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}

import type { HomeSectionKind } from '#/api/core/home-sections';

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, KeepAlive, reactive, ref } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { HOME_SECTION_CHANGED } from '#/utils/home-section-change';

import { useHomeSection } from './useHomeSection';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), unlock: vi.fn() }));
const access = reactive({
  accessMenus: [
    { menuId: 'memo', path: '/my-hub/memo' },
    { menuId: 'finance', path: '/finance/dashboard' },
    { menuId: 'income', path: '/finance/income' },
    { menuId: 'expense', path: '/finance/expense' },
  ],
  loginExpired: false,
});
const user = reactive({ userInfo: { id: 'first' } });
const locks = reactive({
  loaded: true,
  lockedIds: new Set<string>(),
  unlockedPaths: new Set<string>(),
  showModal: false,
  pendingTargetPath: '',
});
vi.mock('@vben/stores', () => ({
  useAccessStore: () => access,
  useUserStore: () => user,
}));
vi.mock('#/api/core/home-sections', () => ({
  getHomeSection: mocks.fetch,
  isFinancialSection: (kind: string) =>
    ['expense', 'finance', 'income'].includes(kind),
}));
vi.mock('#/store/menu-visuals', () => ({
  useMenuVisualsStore: () => ({
    load: vi.fn(),
    cardMenu: (key: string) => ({ menuId: key.slice(8) }),
  }),
}));
vi.mock('#/store/secondary-lock', () => ({
  useSecondaryLockStore: () => ({
    get loaded() {
      return locks.loaded;
    },
    get showModal() {
      return locks.showModal;
    },
    get pendingTargetPath() {
      return locks.pendingTargetPath;
    },
    unlockedPaths: locks.unlockedPaths,
    isMenuLocked: (id: string) => locks.lockedIds.has(id),
    isUnlocked: (path: string) => locks.unlockedPaths.has(path),
    loadLockedMenus: vi.fn(),
    triggerUnlock: mocks.unlock,
  }),
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-22T04:00:00Z'));
  mocks.fetch.mockReset().mockResolvedValue({
    items: [{ id: '9007199254740993', title: 'First' }],
    refreshInterval: 300,
  });
  mocks.unlock.mockReset();
  locks.lockedIds.clear();
  locks.unlockedPaths.clear();
  locks.loaded = true;
  user.userInfo.id = 'first';
  access.loginExpired = false;
});
afterEach(() => vi.useRealTimers());
function fixture(kind: HomeSectionKind = 'memo') {
  let card!: ReturnType<typeof useHomeSection>;
  const visible = ref(true);
  const child = defineComponent({
    setup() {
      card = useHomeSection(kind);
      return () => h('div');
    },
  });
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(KeepAlive, {}, () => (visible.value ? h(child) : null)),
    }),
  );
  return {
    wrapper,
    visible,
    get card() {
      return card;
    },
  };
}
it('财务检测别名菜单链的收入锁，解锁前不请求；缺少业务权限不显示', async () => {
  locks.lockedIds.add('income');
  const f = fixture('finance');
  await flushPromises();
  expect(f.card.locked.value).toBe(true);
  expect(mocks.fetch).not.toHaveBeenCalled();
  f.card.unlock();
  expect(mocks.unlock).toHaveBeenCalledWith('/finance/income', false);
  locks.unlockedPaths.add('/finance/income');
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  const income = access.accessMenus.splice(2, 1)[0]!;
  await flushPromises();
  expect(f.card.available.value).toBe(false);
  expect(f.card.data.value).toBeNull();
  access.accessMenus.splice(2, 0, income);
});
it('账号变更清空旧数据并拒绝旧响应，刷新失败保留成功数据', async () => {
  let resolve!: (value: unknown) => void;
  mocks.fetch.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const f = fixture();
  await flushPromises();
  user.userInfo.id = 'next';
  await flushPromises();
  expect(f.card.data.value).toMatchObject({ items: [{ title: 'First' }] });
  resolve({ items: [{ title: 'Private old data' }], refreshInterval: 300 });
  await flushPromises();
  expect(JSON.stringify(f.card.data.value)).not.toContain('Private');
  mocks.fetch.mockRejectedValueOnce(new Error('offline'));
  await f.card.load();
  expect(f.card.failed.value).toBe(true);
  expect(f.card.data.value).toMatchObject({ items: [{ title: 'First' }] });
});
it('离页停刷，未过期返回不请求，业务成功写入后返回立即刷新', async () => {
  const f = fixture();
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  f.visible.value = false;
  await flushPromises();
  await vi.advanceTimersByTimeAsync(100_000);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  f.visible.value = true;
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  f.visible.value = false;
  await flushPromises();
  window.dispatchEvent(
    new CustomEvent(HOME_SECTION_CHANGED, { detail: 'memo' }),
  );
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  f.visible.value = true;
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});
it('非正刷新周期不启动定时器，手动刷新仍可用', async () => {
  mocks.fetch.mockResolvedValue({ items: [], refreshInterval: 0 });
  const f = fixture();
  await flushPromises();
  await vi.advanceTimersByTimeAsync(3_600_000);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  await f.card.load();
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});
it('北京时间跨月返回立即刷新，不等待五分钟', async () => {
  vi.setSystemTime(new Date('2026-10-31T15:59:59Z'));
  mocks.fetch.mockResolvedValue({
    month: '2026-10',
    period: 'month',
    startDate: '2026-10-01',
    income: 1,
    expense: 0,
    balance: 1,
    refreshInterval: 300,
  });
  const f = fixture('finance');
  await flushPromises();
  f.visible.value = false;
  await flushPromises();
  vi.setSystemTime(new Date('2026-10-31T16:00:01Z'));
  mocks.fetch.mockResolvedValue({
    month: '2026-11',
    period: 'month',
    startDate: '2026-11-01',
    income: 0,
    expense: 0,
    balance: 0,
    refreshInterval: 300,
  });
  f.visible.value = true;
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});

it('首次加载按正周期自动刷新，服务端改为零后停止定时刷新', async () => {
  const f = fixture();
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  mocks.fetch.mockResolvedValue({ items: [], refreshInterval: 0 });
  await vi.advanceTimersByTimeAsync(300_000);
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  expect(f.card.data.value).toMatchObject({ refreshInterval: 0 });
  await vi.advanceTimersByTimeAsync(600_000);
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});

function financialData(period: 'all' | 'month' | 'year', amount = 100) {
  return {
    period,
    label:
      period === 'month' ? '2026年10月' : period === 'year' ? '2026年' : '全部',
    startDate:
      period === 'all' ? null : period === 'year' ? '2026-01-01' : '2026-10-01',
    endDate: null,
    month: period === 'month' ? '2026-10' : null,
    income: amount,
    expense: 0,
    balance: amount,
    amount,
    refreshInterval: 300,
  };
}
it('范围切换保留原数据及其范围，拒绝旧范围响应，失败保留原范围可重试', async () => {
  user.userInfo.id = 'period-race';
  mocks.fetch.mockResolvedValueOnce(financialData('month'));
  const f = fixture('finance');
  await flushPromises();
  let year!: (value: unknown) => void;
  let all!: (value: unknown) => void;
  mocks.fetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        year = resolve;
      }),
  );
  f.card.selectPeriod('year');
  await flushPromises();
  expect(f.card.loading.value).toBe(true);
  expect(f.card.displayedPeriod.value).toBe('month');
  expect(f.card.data.value).toMatchObject({ income: 100, period: 'month' });
  mocks.fetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        all = resolve;
      }),
  );
  f.card.selectPeriod('all');
  await flushPromises();
  all(financialData('all', 1000));
  await flushPromises();
  year(financialData('year', 500));
  await flushPromises();
  expect(f.card.data.value).toMatchObject({ income: 1000, period: 'all' });
  expect(f.card.displayedPeriod.value).toBe('all');
  mocks.fetch.mockRejectedValueOnce(new Error('offline'));
  f.card.selectPeriod('month');
  await flushPromises();
  expect(f.card.failed.value).toBe(true);
  expect(f.card.displayedPeriod.value).toBe('all');
  mocks.fetch.mockResolvedValueOnce(financialData('month', 150));
  f.card.selectPeriod('month');
  await flushPromises();
  expect(f.card.data.value).toMatchObject({ income: 150, period: 'month' });
});
it('独立收入卡不需要支出权限；仅对应写入和概览变更刷新', async () => {
  user.userInfo.id = 'only-income';
  const expense = access.accessMenus.splice(3, 1)[0]!;
  mocks.fetch.mockResolvedValue(financialData('month'));
  const f = fixture('income');
  await flushPromises();
  expect(f.card.available.value).toBe(true);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  window.dispatchEvent(
    new CustomEvent(HOME_SECTION_CHANGED, { detail: 'expense' }),
  );
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  window.dispatchEvent(
    new CustomEvent(HOME_SECTION_CHANGED, { detail: 'income' }),
  );
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  window.dispatchEvent(
    new CustomEvent(HOME_SECTION_CHANGED, { detail: 'finance' }),
  );
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(3);
  access.accessMenus.splice(3, 0, expense);
});
it('年范围跨月不失效，跨年立即刷新；全部范围忽略年月边界', async () => {
  user.userInfo.id = 'period-boundaries';
  vi.setSystemTime(new Date('2026-10-31T15:59:59Z'));
  mocks.fetch
    .mockResolvedValueOnce(financialData('month'))
    .mockResolvedValue(financialData('year'));
  const f = fixture('finance');
  await flushPromises();
  f.card.selectPeriod('year');
  await flushPromises();
  f.visible.value = false;
  await flushPromises();
  vi.setSystemTime(new Date('2026-10-31T16:00:01Z'));
  f.visible.value = true;
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  vi.setSystemTime(new Date('2026-12-31T15:59:59Z'));
  await f.card.load();
  f.visible.value = false;
  await flushPromises();
  vi.setSystemTime(new Date('2026-12-31T16:00:01Z'));
  mocks.fetch.mockResolvedValue({
    ...financialData('year'),
    startDate: '2027-01-01',
    label: '2027年',
  });
  f.visible.value = true;
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(4);
  mocks.fetch.mockResolvedValue(financialData('all'));
  f.card.selectPeriod('all');
  await flushPromises();
  f.visible.value = false;
  await flushPromises();
  vi.setSystemTime(new Date('2026-12-31T16:00:03Z'));
  f.visible.value = true;
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(5);
});

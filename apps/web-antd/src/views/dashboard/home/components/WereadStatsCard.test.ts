import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { KeepAlive, reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import WereadStatsCard from './WereadStatsCard.vue';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  stats: vi.fn(),
  chart: vi.fn(),
}));
const access = reactive({
  accessMenus: [{ menuId: '1', path: '/record/weread' }],
  loginExpired: false,
});
const user = reactive({ userInfo: { id: 'user1' } });
const locks = reactive({
  loaded: true,
  locked: false,
  pendingTargetPath: null,
  showModal: false,
  unlockedPaths: new Set<string>(),
});
const visual = reactive({ icon: 'svg:weread', iconColor: '#3FB27F' });

vi.mock('@vben/stores', () => ({
  useAccessStore: () => access,
  useUserStore: () => user,
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('#/api/core/home-sections', () => ({
  getWereadStats: mocks.stats,
}));
vi.mock('#/store/menu-visuals', () => ({
  useMenuVisualsStore: () => ({
    cardMenu: () => ({ menuId: '1' }),
    load: vi.fn(),
    visual: () => visual,
  }),
}));
vi.mock('#/store/secondary-lock', () => ({
  useSecondaryLockStore: () => ({
    get loaded() {
      return locks.loaded;
    },
    get pendingTargetPath() {
      return locks.pendingTargetPath;
    },
    get showModal() {
      return locks.showModal;
    },
    isMenuLocked: () => locks.locked,
    isUnlocked: () => false,
    loadLockedMenus: vi.fn(),
    unlockedPaths: locks.unlockedPaths,
  }),
}));
vi.mock('@vben/plugins/echarts', () => ({
  EchartsUI: { template: '<div class="chart" />' },
  useEcharts: () => ({
    renderEcharts: (options: () => unknown) => mocks.chart(options()),
  }),
}));
vi.mock('#/components/BusinessIcon.vue', () => ({
  default: { template: '<i />' },
}));
vi.mock('./CardRefreshIndicator.vue', () => ({
  default: { template: '<span />' },
}));

function payload(overrides: Record<string, unknown> = {}) {
  const buckets = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(
    (label, index) => ({
      key: `2026-11-0${index + 2}`,
      label,
      seconds: index === 0 ? 2100 : index === 1 ? 1800 : 0,
    }),
  );
  return {
    buckets,
    connected: true,
    dailyAverageSeconds: 780,
    elapsedDays: 5,
    granularity: 'week',
    periodEnd: '2026-11-08',
    periodStart: '2026-11-02',
    previousPeriodEnd: '2026-10-30',
    previousPeriodStart: '2026-10-26',
    previousTotalSeconds: 3000,
    refreshInterval: 600,
    totalSeconds: 3900,
    ...overrides,
  };
}

const storage = { getItem: vi.fn(), setItem: vi.fn() };

beforeEach(() => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  mocks.push.mockReset();
  mocks.stats.mockReset();
  mocks.chart.mockReset();
  locks.loaded = true;
  locks.locked = false;
  access.loginExpired = false;
  storage.getItem.mockReset().mockReturnValue(null);
  storage.setItem.mockReset();
  vi.stubGlobal('localStorage', storage);
  mocks.stats.mockImplementation((granularity: string) =>
    Promise.resolve(payload({ granularity })),
  );
});
enableAutoUnmount(afterEach);
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('按周加载汇总并显示日均和同期变化', async () => {
  const wrapper = mount(WereadStatsCard);
  await flushPromises();

  expect(mocks.stats).toHaveBeenCalledWith('week');
  expect(wrapper.find('[aria-label="本周 1 小时 5 分"]').exists()).toBe(true);
  expect(wrapper.text()).toContain('日均 13 分钟');
  expect(wrapper.text()).toContain('比上周');
  expect(wrapper.text()).toContain('+30%');
  const chart = mocks.chart.mock.calls.at(-1)?.[0];
  expect(chart.xAxis.data).toEqual(['一', '二', '三', '四', '五', '六', '日']);
  expect(
    chart.series[0].data.map((item: { value: null | number }) => item.value),
  ).toEqual([35, 30, null, null, null, null, null]);
  expect(wrapper.find('[title]').attributes('title')).toBe(
    '较上周同期（2026-10-26 至 2026-10-30），上期 50 分钟，本期 1 小时 5 分',
  );
  expect(wrapper.find('.chart').exists()).toBe(true);
});

it('切换月粒度按账号保存并重新请求', async () => {
  const wrapper = mount(WereadStatsCard);
  await flushPromises();
  const month = wrapper
    .findAll('button')
    .find((button) => button.text() === '月');
  await month?.trigger('click');
  await flushPromises();

  expect(mocks.stats).toHaveBeenLastCalledWith('month');
  expect(storage.setItem).toHaveBeenCalledWith(
    'home:weread-stats:granularity:user1',
    'month',
  );
});

it('未连接时隐藏卡片', async () => {
  mocks.stats.mockResolvedValue(payload({ connected: false }));
  const wrapper = mount(WereadStatsCard);
  await flushPromises();

  expect(wrapper.find('[aria-label="微信读书阅读统计"]').exists()).toBe(false);
});

it('无阅读时保留日期与空态且不绘制零值柱体', async () => {
  mocks.stats.mockResolvedValue(
    payload({
      buckets: payload().buckets.map((bucket) => ({ ...bucket, seconds: 0 })),
      dailyAverageSeconds: 0,
      previousTotalSeconds: 0,
      totalSeconds: 0,
    }),
  );
  const wrapper = mount(WereadStatsCard);
  await flushPromises();

  expect(wrapper.find('[aria-label="本周 0 分钟"]').exists()).toBe(true);
  expect(wrapper.text()).toContain('本周还没有阅读记录');
  expect(
    mocks.chart.mock.calls
      .at(-1)?.[0]
      .series[0].data.every(
        (item: { value: null | number }) => item.value === null,
      ),
  ).toBe(true);
});

it('首次有阅读数据时逐柱入场，刷新和切换粒度直接更新', async () => {
  const empty = payload({
    buckets: payload().buckets.map((bucket) => ({ ...bucket, seconds: 0 })),
    totalSeconds: 0,
  });
  const populated = payload({
    buckets: empty.buckets.map((bucket, index) => ({
      ...bucket,
      seconds: [0, 1800, 0, 2100][index] ?? 0,
    })),
  });
  mocks.stats.mockResolvedValueOnce(empty).mockResolvedValueOnce(populated);
  const wrapper = mount(WereadStatsCard);
  const chart = () => mocks.chart.mock.calls.at(-1)?.[0];
  const refresh = wrapper.find('[aria-label="刷新阅读统计"]');
  await flushPromises();
  expect(chart().animation).toBe(false);

  await refresh.trigger('click');
  await flushPromises();
  expect(chart().animation).toBe(true);
  expect(chart().animationDelay(1)).toBe(0);
  expect(chart().animationDelay(3)).toBe(150);

  await refresh.trigger('click');
  await flushPromises();
  expect(chart().animation).toBe(false);

  await wrapper.find('[aria-label="按月统计"]').trigger('click');
  await flushPromises();
  expect(chart().animation).toBe(false);
});

it('首次失败显示卡内重试并可恢复', async () => {
  mocks.stats.mockRejectedValueOnce(new Error('fail'));
  const wrapper = mount(WereadStatsCard);
  await flushPromises();

  expect(wrapper.text()).toContain('阅读统计加载失败');
  const retry = wrapper
    .findAll('button')
    .find((button) => button.text() === '重试');
  await retry?.trigger('click');
  await flushPromises();

  expect(mocks.stats).toHaveBeenCalledTimes(2);
  expect(wrapper.find('[aria-label="本周 1 小时 5 分"]').exists()).toBe(true);
});

it('锁未解锁时不请求并显示解锁入口', async () => {
  locks.locked = true;
  const wrapper = mount(WereadStatsCard);
  await flushPromises();

  expect(mocks.stats).not.toHaveBeenCalled();
  expect(wrapper.text()).toContain('点击解锁');
});

it('首次加载后按返回周期持续刷新并在卸载后停止', async () => {
  vi.useFakeTimers();
  const wrapper = mount(WereadStatsCard);
  await flushPromises();

  await vi.advanceTimersByTimeAsync(599_999);
  expect(mocks.stats).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(mocks.stats).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(600_000);
  expect(mocks.stats).toHaveBeenCalledTimes(3);

  wrapper.unmount();
  await vi.advanceTimersByTimeAsync(600_000);
  expect(mocks.stats).toHaveBeenCalledTimes(3);
});

it('首次失败不循环请求且重试成功后恢复周期刷新', async () => {
  vi.useFakeTimers();
  mocks.stats.mockRejectedValueOnce(new Error('fail'));
  const wrapper = mount(WereadStatsCard);
  await flushPromises();
  await vi.advanceTimersByTimeAsync(600_000);
  expect(mocks.stats).toHaveBeenCalledTimes(1);

  await wrapper
    .findAll('button')
    .find((button) => button.text() === '重试')
    ?.trigger('click');
  await flushPromises();
  expect(mocks.stats).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(600_000);
  expect(mocks.stats).toHaveBeenCalledTimes(3);
});

it('切换粒度后使用新响应的刷新周期', async () => {
  vi.useFakeTimers();
  mocks.stats.mockImplementation((granularity: string) =>
    Promise.resolve(
      payload({
        granularity,
        refreshInterval: granularity === 'month' ? 120 : 600,
      }),
    ),
  );
  const wrapper = mount(WereadStatsCard);
  await flushPromises();
  await vi.advanceTimersByTimeAsync(90_000);
  await wrapper.find('[aria-label="按月统计"]').trigger('click');
  await flushPromises();
  expect(mocks.stats).toHaveBeenCalledTimes(2);

  await vi.advanceTimersByTimeAsync(119_999);
  expect(mocks.stats).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(mocks.stats).toHaveBeenCalledTimes(3);
  expect(mocks.stats).toHaveBeenLastCalledWith('month');
});

it('后台和锁定时暂停请求并在恢复后继续刷新', async () => {
  vi.useFakeTimers();
  const visibility = vi.spyOn(document, 'visibilityState', 'get');
  mount(WereadStatsCard);
  await flushPromises();
  visibility.mockReturnValue('hidden');
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(610_000);
  expect(mocks.stats).toHaveBeenCalledTimes(1);

  visibility.mockReturnValue('visible');
  document.dispatchEvent(new Event('visibilitychange'));
  await flushPromises();
  expect(mocks.stats).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(600_000);
  expect(mocks.stats).toHaveBeenCalledTimes(3);

  locks.locked = true;
  await flushPromises();
  await vi.advanceTimersByTimeAsync(600_000);
  expect(mocks.stats).toHaveBeenCalledTimes(3);
  locks.locked = false;
  await flushPromises();
  await vi.advanceTimersByTimeAsync(600_000);
  expect(mocks.stats).toHaveBeenCalledTimes(5);
});

it('缓存页面离页暂停且返回后恢复周期刷新', async () => {
  vi.useFakeTimers();
  const state = reactive({ shown: true });
  mount({
    components: { KeepAlive, WereadStatsCard },
    setup: () => ({ state }),
    template: '<KeepAlive><WereadStatsCard v-if="state.shown" /></KeepAlive>',
  });
  await flushPromises();
  state.shown = false;
  await flushPromises();
  await vi.advanceTimersByTimeAsync(610_000);
  expect(mocks.stats).toHaveBeenCalledTimes(1);

  state.shown = true;
  await flushPromises();
  expect(mocks.stats).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(600_000);
  expect(mocks.stats).toHaveBeenCalledTimes(3);
});

it('刷新耗时超过周期时合并请求且未连接时停止调度', async () => {
  vi.useFakeTimers();
  let finish: (result: ReturnType<typeof payload>) => void = () => {};
  mocks.stats.mockResolvedValueOnce(payload()).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  mount(WereadStatsCard);
  await flushPromises();
  await vi.advanceTimersByTimeAsync(1_200_000);
  expect(mocks.stats).toHaveBeenCalledTimes(2);

  finish(payload({ connected: false }));
  await flushPromises();
  await vi.advanceTimersByTimeAsync(600_000);
  expect(mocks.stats).toHaveBeenCalledTimes(2);
});

it('年横轴只显示月份数字，秒级阅读仍有柱体', async () => {
  storage.getItem.mockReturnValue('year');
  mocks.stats.mockResolvedValue(
    payload({
      granularity: 'year',
      buckets: Array.from({ length: 12 }, (_, index) => ({
        key: `2026-${String(index + 1).padStart(2, '0')}`,
        label: `${index + 1}月`,
        seconds: index === 0 ? 10 : 0,
      })),
    }),
  );
  const wrapper = mount(WereadStatsCard);
  await flushPromises();
  expect(wrapper.text()).toContain('比上年');
  const chart = mocks.chart.mock.calls.at(-1)?.[0];
  expect(chart.xAxis.data).toEqual(
    Array.from({ length: 12 }, (_, i) => String(i + 1)),
  );
  expect(chart.series[0].data[0].value).toBeGreaterThan(0);
  expect(chart.series[0].data[1].value).toBeNull();
});

it('切换加载期间汇总文案沿用旧数据粒度', async () => {
  const wrapper = mount(WereadStatsCard);
  await flushPromises();
  mocks.stats.mockReturnValueOnce(new Promise(() => {}));
  await wrapper.find('[aria-label="按年统计"]').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('比上周');
  expect(wrapper.text()).not.toContain('比上年');
});

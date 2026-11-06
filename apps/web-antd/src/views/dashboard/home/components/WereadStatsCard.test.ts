import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import WereadStatsCard from './WereadStatsCard.vue';

const mocks = vi.hoisted(() => ({ push: vi.fn(), stats: vi.fn() }));
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
  useEcharts: () => ({ renderEcharts: vi.fn() }),
}));
vi.mock('ant-design-vue', () => ({
  Segmented: {
    emits: ['change'],
    props: ['disabled', 'options', 'value'],
    template:
      '<div><button v-for="o in options" :key="o.value" :disabled="disabled" @click="$emit(\'change\', o.value)">{{ o.label }}</button></div>',
  },
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
  mocks.push.mockReset();
  mocks.stats.mockReset();
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
  vi.unstubAllGlobals();
});

it('按周加载汇总并显示日均和同期变化', async () => {
  const wrapper = mount(WereadStatsCard);
  await flushPromises();

  expect(mocks.stats).toHaveBeenCalledWith('week');
  expect(wrapper.text()).toContain('本周 1 小时 5 分');
  expect(wrapper.text()).toContain('日均 13 分钟');
  expect(wrapper.text()).toContain('+30%');
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

it('无阅读时保留零值柱图与空态文案', async () => {
  mocks.stats.mockResolvedValue(
    payload({
      dailyAverageSeconds: 0,
      previousTotalSeconds: 0,
      totalSeconds: 0,
    }),
  );
  const wrapper = mount(WereadStatsCard);
  await flushPromises();

  expect(wrapper.text()).toContain('0 分钟');
  expect(wrapper.text()).toContain('本周还没有阅读记录');
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
  expect(wrapper.text()).toContain('本周 1 小时 5 分');
});

it('锁未解锁时不请求并显示解锁入口', async () => {
  locks.locked = true;
  const wrapper = mount(WereadStatsCard);
  await flushPromises();

  expect(mocks.stats).not.toHaveBeenCalled();
  expect(wrapper.text()).toContain('点击解锁');
});

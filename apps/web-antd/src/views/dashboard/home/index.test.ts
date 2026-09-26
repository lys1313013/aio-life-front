import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AnalysisCard from './components/analysis-card.vue';
import Home from './index.vue';

const mocks = vi.hoisted(() => ({
  detail: vi.fn(),
  tasks: vi.fn(),
}));

vi.mock('#/api/core/dashboard', () => ({
  getDashboardCardDetail: mocks.detail,
  getDashboardTasks: mocks.tasks,
  getWatchedTaskDetails: async () => [],
}));
vi.mock('#/api/core/think', () => ({ getPinnedThoughts: async () => [] }));
vi.mock('#/api/core/todo', () => ({ updateTaskDetail: vi.fn() }));
vi.mock('#/api/core/user-bind', () => ({ getUserBindListApi: async () => [] }));
vi.mock('#/store/quick-nav', () => ({
  useQuickNavStore: () => ({ load: vi.fn() }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@vben/common-ui', () => ({ VbenIcon: { template: '<i />' } }));
vi.mock('@vben/utils', () => ({ openWindow: vi.fn() }));
vi.mock('ant-design-vue', () => ({
  Card: { template: '<div><slot /></div>' },
  Skeleton: { template: '<div />' },
}));
vi.mock('../../my-hub/exercise/components/ExerciseAddModal.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('../../my-hub/think/ThinkModal.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('../../time/time-tracker/components/TimeTrackerModal.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('./analytics-time-tracker.vue', () => ({
  default: { template: '<div />', methods: { loadData: vi.fn() } },
}));
vi.mock('./components/ExerciseSummaryCard.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('./components/GithubRecentCommits.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('./components/QuickNavSection.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('./components/WatchedTaskEditModal.vue', () => ({
  default: { template: '<div />' },
}));

const task = { type: 'EXERCISE', title: '运动', icon: '', totalTitle: '累计' };
const detail = {
  ...task,
  value: '30 分钟',
  totalValue: '3 小时',
  refreshInterval: 60,
};

function retryButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('button[aria-label="运动加载失败，重试"]');
}

enableAutoUnmount(afterEach);

describe('首页卡片失败恢复', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
    mocks.tasks.mockResolvedValue([task]);
    mocks.detail.mockReset().mockResolvedValue(detail);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('首次失败结束加载，重试期间去重，成功后显示数据并清除错误', async () => {
    mocks.detail.mockRejectedValueOnce(new Error('network'));
    const wrapper = mount(Home);
    await flushPromises();
    const card = wrapper.getComponent(AnalysisCard);
    expect(card.props()).toMatchObject({
      loading: false,
      refreshing: false,
      error: true,
    });
    expect(wrapper.find('.analysis-card-progress').exists()).toBe(false);

    let resolve!: (value: typeof detail) => void;
    mocks.detail.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    await retryButton(wrapper).trigger('click');
    expect(card.props('refreshing')).toBe(true);
    expect(retryButton(wrapper).attributes('disabled')).toBeDefined();
    await card.trigger('click');
    expect(mocks.detail).toHaveBeenCalledTimes(2);

    resolve(detail);
    await flushPromises();
    expect(card.props()).toMatchObject({
      loading: false,
      refreshing: false,
      error: false,
      value: '30 分钟',
    });
    expect(
      wrapper.find('button[aria-label="运动加载失败，重试"]').exists(),
    ).toBe(false);
    expect(wrapper.find('.analysis-card-progress').exists()).toBe(false);
  });

  it('重复失败仍可再次重试，不影响其他卡片', async () => {
    mocks.tasks.mockResolvedValue([
      task,
      { ...task, type: 'READ', title: '阅读' },
    ]);
    mocks.detail.mockImplementation(async (type: string) => {
      if (type === 'EXERCISE') throw new Error('network');
      return { ...detail, title: '阅读', value: '10 页' };
    });
    const wrapper = mount(Home);
    await flushPromises();
    await retryButton(wrapper).trigger('click');
    await flushPromises();
    expect(wrapper.findAllComponents(AnalysisCard)).toHaveLength(2);
    expect(wrapper.text()).toContain('10 页');
    expect(wrapper.find('.analysis-card-progress').exists()).toBe(false);

    mocks.detail.mockResolvedValue(detail);
    await retryButton(wrapper).trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('30 分钟');
    expect(mocks.detail).toHaveBeenCalledTimes(4);
  });

  it('刷新失败保留旧数据，相同数值重试成功也清除错误并更新元数据', async () => {
    const wrapper = mount(Home);
    await flushPromises();
    const card = wrapper.getComponent(AnalysisCard);
    mocks.detail.mockRejectedValueOnce(new Error('network'));
    await card.trigger('click');
    await flushPromises();
    expect(card.props()).toMatchObject({
      error: true,
      loading: false,
      refreshing: false,
      value: '30 分钟',
      totalValue: '3 小时',
    });

    mocks.detail.mockResolvedValue({ ...detail, valueColor: 'green' });
    await retryButton(wrapper).trigger('click');
    await flushPromises();
    expect(card.props()).toMatchObject({ error: false, valueColor: 'green' });
  });

  it('首次失败尚无刷新间隔，切回前台仍会重试', async () => {
    mocks.detail.mockRejectedValueOnce(new Error('network'));
    const wrapper = mount(Home);
    await flushPromises();
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(mocks.detail).toHaveBeenCalledTimes(2);
    expect(wrapper.getComponent(AnalysisCard).props()).toMatchObject({
      error: false,
      value: '30 分钟',
    });
  });

  it('空响应结束加载并允许重试', async () => {
    mocks.detail.mockResolvedValueOnce(null);
    const wrapper = mount(Home);
    await flushPromises();
    expect(wrapper.getComponent(AnalysisCard).props()).toMatchObject({
      loading: false,
      error: true,
    });
    await retryButton(wrapper).trigger('click');
    await flushPromises();
    expect(wrapper.getComponent(AnalysisCard).props('error')).toBe(false);
  });
});

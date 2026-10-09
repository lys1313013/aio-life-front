import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ExerciseAddModal from '../../my-hub/exercise/components/ExerciseAddModal.vue';
import AnalysisCard from './components/analysis-card.vue';
import ExerciseSummaryCard from './components/ExerciseSummaryCard.vue';
import Home from './home-content.vue';

const mocks = vi.hoisted(() => ({
  detail: vi.fn(),
  exerciseReload: vi.fn(),
  thoughts: vi.fn(),
  watched: vi.fn(),
  sections: [] as { cardKey: string }[],
  tasks: vi.fn(),
}));

vi.mock('#/api/core/dashboard', () => ({
  getDashboardCardDetail: mocks.detail,
  getDashboardTasks: mocks.tasks,
  getWatchedTaskDetails: mocks.watched,
}));
vi.mock('#/api/core/think', () => ({ getPinnedThoughts: mocks.thoughts }));
vi.mock('#/api/core/todo', () => ({ updateTaskDetail: vi.fn() }));
vi.mock('#/api/core/user-bind', () => ({ getUserBindListApi: async () => [] }));
vi.mock('#/store/home-cards', () => ({
  useHomeCardsStore: () => ({
    enabled: () => true,
    order: () => 0,
    items: [],
    sections: mocks.sections,
  }),
}));
vi.mock('#/store/quick-nav', () => ({
  useQuickNavStore: () => ({ load: vi.fn() }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('#/store/menu-visuals', () => ({
  useMenuVisualsStore: () => ({
    load: vi.fn(),
    loading: false,
    visual: () => ({ icon: 'lucide:layout-dashboard' }),
  }),
}));
vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { id: 'fixture' } }),
}));
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
vi.mock('./components/BusinessCards.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('./components/ExerciseSummaryCard.vue', () => ({
  default: {
    template: '<div data-exercise />',
    methods: { reload: mocks.exerciseReload },
  },
}));
vi.mock('./components/GithubRecentCommits.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('./components/QuickNavSection.vue', () => ({
  default: { template: '<div />' },
}));
// 微信读书独立卡片的路由与二级锁在其专用测试覆盖，首页这里只验证调度。
vi.mock('./components/WereadRecentCard.vue', () => ({
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
    mocks.sections.splice(0);
    mocks.thoughts.mockReset().mockResolvedValue([]);
    mocks.watched.mockReset().mockResolvedValue([]);
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

  function section(wrapper: ReturnType<typeof mount>, name: string) {
    return wrapper
      .findAll('.dashboard-section')
      .find((card) => card.text().includes(name))!;
  }
  it.each(['thoughts', 'watched'] as const)(
    '%s 首次失败可重试，成功空态遵循原显隐规则',
    async (key) => {
      mocks.sections.push({ cardKey: `section.${key}` });
      const api = mocks[key];
      const title = key === 'thoughts' ? '闪念' : '待办';
      api.mockRejectedValueOnce(new Error('offline'));
      const wrapper = mount(Home);
      await flushPromises();
      expect(
        section(wrapper, title)
          .find(`button[aria-label="${title}加载失败，重试"]`)
          .exists(),
      ).toBe(true);
      expect(wrapper.text()).not.toContain(
        key === 'thoughts' ? '暂无固定的闪念' : '暂无关注的待办',
      );
      await wrapper
        .get(`button[aria-label="${title}加载失败，重试"]`)
        .trigger('click');
      await flushPromises();
      expect(
        wrapper.find(`button[aria-label="${title}加载失败，重试"]`).exists(),
      ).toBe(false);
      if (key === 'watched')
        expect(wrapper.find('.dashboard-section').exists()).toBe(false);
      else expect(wrapper.text()).toContain('暂无固定的闪念');
    },
  );
  it('闪念保存使旧查询失效，旧响应不覆盖新内容', async () => {
    mocks.sections.push({ cardKey: 'section.thoughts' });
    let finish!: (value: unknown[]) => void;
    mocks.thoughts.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const wrapper = mount(Home);
    await flushPromises();
    mocks.thoughts.mockResolvedValueOnce([
      { id: 'new', content: '保存后的新内容' },
    ]);
    (wrapper.vm as unknown as { onThoughtSaved: () => void }).onThoughtSaved();
    await flushPromises();
    expect(wrapper.text()).toContain('保存后的新内容');
    finish([{ id: 'old', content: '旧查询内容' }]);
    await flushPromises();
    expect(wrapper.text()).toContain('保存后的新内容');
    expect(wrapper.text()).not.toContain('旧查询内容');
  });
  it('运动成功空态隐藏展示但保留加载器，新增后能重新显示', async () => {
    mocks.sections.push({ cardKey: 'section.exercise' });
    const wrapper = mount(Home);
    await flushPromises();
    const exercise = wrapper.getComponent(ExerciseSummaryCard);
    exercise.vm.$emit('loaded', true);
    await flushPromises();
    expect(wrapper.findComponent(ExerciseSummaryCard).exists()).toBe(true);
    expect((exercise.element.parentElement as HTMLElement).style.display).toBe(
      'none',
    );
    mocks.exerciseReload.mockImplementationOnce(() =>
      exercise.vm.$emit('loaded', false),
    );
    wrapper.getComponent(ExerciseAddModal).vm.$emit('success');
    await flushPromises();
    expect(mocks.exerciseReload).toHaveBeenCalledWith(true);
    expect((exercise.element.parentElement as HTMLElement).style.display).toBe(
      '',
    );
  });
});

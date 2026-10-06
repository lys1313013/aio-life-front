import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ExerciseSummaryCard from './ExerciseSummaryCard.vue';
import ExerciseTrend from './ExerciseTrend.vue';

const mocks = vi.hoisted(() => ({ summary: vi.fn() }));
vi.mock('#/api/core/exerciseRecord', () => ({
  getDashboardSummaryApi: mocks.summary,
}));
vi.mock('@vben/common-ui', () => ({ VbenIcon: { template: '<i />' } }));
vi.mock('ant-design-vue', () => ({
  Popover: { template: '<div><slot /></div>' },
  Skeleton: { template: '<div />' },
}));

const trend = [20, 40, 60, 70, 50].map((count, index) => ({
  count,
  date: `2026-09-${22 + index}`,
}));
const item = {
  count: 50,
  deltaCount: -20,
  exerciseTypeId: '100000000000000001',
  prevCount: 70,
  prevDate: '2026-09-25',
  trend,
  typeLabel: '深蹲',
};

enableAutoUnmount(afterEach);

beforeEach(() => {
  mocks.summary.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      disconnect() {}
      observe() {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('首页运动细项和趋势', () => {
  it('同日两个细项独立成行，日期周几仅显示一次，数量和增减完整保留', async () => {
    mocks.summary.mockResolvedValue({
      days: [
        {
          date: '2026-09-26',
          items: [
            item,
            {
              ...item,
              exerciseTypeId: '2',
              typeLabel: '正握引体向上',
              count: 11,
              prevCount: 10,
              deltaCount: 1,
            },
          ],
        },
      ],
      hasMore: false,
    });
    const wrapper = mount(ExerciseSummaryCard);
    await flushPromises();
    const rows = wrapper.findAll('.exercise-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain('周六');
    expect(rows[1]!.find('.exercise-date').text()).toBe('');
    expect(rows[0]!.find('.exercise-values').text()).toContain('50');
    expect(rows[0]!.text()).toContain('↓ -20');
    expect(rows[1]!.text()).toContain('↑ +1');
    expect(wrapper.findAll('polyline')).toHaveLength(2);
    expect(
      wrapper.find('polyline').attributes('points')?.split(' '),
    ).toHaveLength(5);
    expect(wrapper.find('button').attributes('aria-label')).toContain(
      '最近 5 次',
    );
  });

  it('分页直接使用接口提供的历史趋势，不依赖已经加载的日期', async () => {
    mocks.summary.mockResolvedValueOnce({
      days: [{ date: '2026-09-26', items: [item] }],
      hasMore: true,
      lastDate: '2026-09-25',
    });
    const wrapper = mount(ExerciseSummaryCard);
    await flushPromises();
    mocks.summary.mockResolvedValueOnce({
      days: [{ date: '2026-09-25', items: [{ ...item, count: 70 }] }],
      hasMore: false,
    });
    await wrapper.get('.exercise-scroll').trigger('scroll');
    await flushPromises();
    expect(mocks.summary).toHaveBeenLastCalledWith({
      lastDate: '2026-09-25',
      limit: 7,
    });
    expect(wrapper.findAll('.exercise-row')).toHaveLength(2);
    expect(
      wrapper.findAllComponents(ExerciseTrend)[1]!.props('trend'),
    ).toHaveLength(5);
  });

  it('首次失败不通知父页面隐藏卡片，可重试并避免重复请求', async () => {
    mocks.summary.mockRejectedValueOnce({
      code: 113000,
      message: '系统异常，请稍后重试',
    });
    const wrapper = mount(ExerciseSummaryCard);
    await flushPromises();
    expect(wrapper.emitted('loaded')).toEqual([[false]]);
    expect(wrapper.text()).toContain('加载失败');
    let resolve!: (value: unknown) => void;
    mocks.summary.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await wrapper.get('button[aria-label="重新加载运动记录"]').trigger('click');
    void wrapper.vm.reload();
    expect(mocks.summary).toHaveBeenCalledTimes(2);
    resolve({ days: [{ date: '2026-09-26', items: [item] }], hasMore: false });
    await flushPromises();
    expect(wrapper.findAll('.exercise-row')).toHaveLength(1);
    expect(wrapper.text()).not.toContain('加载失败');
  });

  it('刷新失败保留已显示记录，再次刷新成功后清除错误', async () => {
    mocks.summary.mockResolvedValueOnce({
      days: [{ date: '2026-09-26', items: [item] }],
      hasMore: false,
    });
    const wrapper = mount(ExerciseSummaryCard);
    await flushPromises();
    mocks.summary.mockRejectedValueOnce(new Error('network'));
    await wrapper.vm.reload();
    await flushPromises();
    expect(wrapper.findAll('.exercise-row')).toHaveLength(1);
    expect(wrapper.emitted('loaded')).toEqual([[false], [false]]);
    mocks.summary.mockResolvedValueOnce({
      days: [{ date: '2026-09-26', items: [item] }],
      hasMore: false,
    });
    await wrapper
      .get('button[aria-label="刷新运动记录失败，重试"]')
      .trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('刷新失败');
    expect(wrapper.findAll('.exercise-row')).toHaveLength(1);
  });

  it('加载更多失败保留记录和游标，停止自动重试并支持手动恢复', async () => {
    mocks.summary.mockResolvedValueOnce({
      days: [{ date: '2026-09-26', items: [item] }],
      hasMore: true,
      lastDate: '2026-09-25',
    });
    const wrapper = mount(ExerciseSummaryCard);
    await flushPromises();
    mocks.summary.mockRejectedValueOnce(new Error('network'));
    await wrapper.get('.exercise-scroll').trigger('scroll');
    await flushPromises();
    await wrapper.get('.exercise-scroll').trigger('scroll');
    expect(mocks.summary).toHaveBeenCalledTimes(2);
    expect(wrapper.findAll('.exercise-row')).toHaveLength(1);
    mocks.summary.mockResolvedValueOnce({
      days: [{ date: '2026-09-25', items: [item] }],
      hasMore: false,
    });
    await wrapper
      .get('button[aria-label="加载更多运动记录失败，重试"]')
      .trigger('click');
    await flushPromises();
    expect(mocks.summary).toHaveBeenLastCalledWith({
      lastDate: '2026-09-25',
      limit: 7,
    });
    expect(wrapper.findAll('.exercise-row')).toHaveLength(2);
  });

  it('刷新使正在返回的旧分页失效，旧 finally 不解除刷新状态', async () => {
    let finishPage!: (value: unknown) => void;
    let finishRefresh!: (value: unknown) => void;
    mocks.summary
      .mockResolvedValueOnce({
        days: [{ date: '2026-09-26', items: [item] }],
        lastDate: '2026-09-26',
        hasMore: true,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishPage = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishRefresh = resolve;
          }),
      );
    const wrapper = mount(ExerciseSummaryCard);
    await flushPromises();
    await wrapper.get('.exercise-scroll').trigger('scroll');
    await flushPromises();
    const refreshing = wrapper.vm.reload(true);
    await flushPromises();
    finishPage({
      days: [{ date: '2026-09-25', items: [item] }],
      hasMore: false,
    });
    await flushPromises();
    expect(wrapper.vm.loading).toBe(true);
    expect(wrapper.findAll('.exercise-row')).toHaveLength(1);
    finishRefresh({
      days: [{ date: '2026-09-27', items: [{ ...item, count: 99 }] }],
      hasMore: false,
    });
    await refreshing;
    await flushPromises();
    expect(wrapper.vm.loading).toBe(false);
    expect(wrapper.findAll('.exercise-row')).toHaveLength(1);
    expect(wrapper.text()).toContain('99');
  });
  it('重复日期页去重并终止自动分页', async () => {
    const response = {
      days: [{ date: '2026-09-26', items: [item] }],
      lastDate: '2026-09-26',
      hasMore: true,
    };
    mocks.summary.mockResolvedValue(response);
    const wrapper = mount(ExerciseSummaryCard);
    await flushPromises();
    await wrapper.get('.exercise-scroll').trigger('scroll');
    await flushPromises();
    await wrapper.get('.exercise-scroll').trigger('scroll');
    await flushPromises();
    expect(wrapper.findAll('.exercise-row')).toHaveLength(1);
    expect(mocks.summary).toHaveBeenCalledTimes(2);
  });

  it.each([[0], [12, 12, 12, 12, 12], []])(
    '单点、持平和空历史不生成虚假点或无效坐标：%j',
    (...counts) => {
      const values = counts as number[];
      const wrapper = mount(ExerciseTrend, {
        props: {
          color: '#10b981',
          label: '深蹲',
          trend: values.map((count, index) => ({
            count,
            date: `2026-09-${index + 1}`,
          })),
        },
      });
      expect(wrapper.html()).not.toMatch(/NaN|Infinity/);
      expect(wrapper.findAll('circle')).toHaveLength(values.length > 0 ? 1 : 0);
      expect(wrapper.findAll('polyline')).toHaveLength(
        values.length > 1 ? 1 : 0,
      );
    },
  );
});

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import TimeTracker from './analytics-time-tracker.vue';

const mocks = vi.hoisted(() => ({
  records: vi.fn(),
  categories: vi.fn(),
  render: vi.fn(),
}));
vi.mock('#/api/core/time-tracker', () => ({ query: mocks.records }));
vi.mock('#/api/core/time-tracker-category', () => ({
  listCategories: mocks.categories,
}));
vi.mock('@vben/plugins/echarts', () => ({
  EchartsUI: { template: '<div />' },
  useEcharts: () => ({ renderEcharts: mocks.render }),
}));
vi.mock('#/views/time/time-tracker/components/TimeTrackerModal.vue', () => ({
  default: { template: '<div />' },
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.categories.mockResolvedValue([
    { id: 'category', name: '工作', color: '#5879ce', isTrackTime: 1 },
  ]);
  mocks.records.mockResolvedValue([
    {
      id: '9223372036854775807',
      categoryId: 'category',
      startTime: 60,
      endTime: 90,
    },
  ]);
});
it('刷新失败保留时迹、图表和上次记录边界，重试成功才更新', async () => {
  const wrapper = mount(TimeTracker, {
    global: { directives: { loading: {} } },
  });
  await flushPromises();
  expect(wrapper.emitted('update:last-end')?.at(-1)).toEqual([91]);
  const renders = mocks.render.mock.calls.length;
  mocks.records.mockRejectedValueOnce(new Error('offline'));
  await wrapper.vm.loadData();
  expect(wrapper.emitted('update:last-end')?.at(-1)).toEqual([91]);
  expect(mocks.render).toHaveBeenCalledTimes(renders);
  expect(wrapper.text()).toContain('工作');
  expect(wrapper.vm.failed).toBe(true);
  await wrapper.vm.loadData();
  await flushPromises();
  expect(wrapper.vm.failed).toBe(false);
});
it('保存后查询使旧响应失效，明细和边界一起使用最新结果', async () => {
  let finish!: (data: unknown[]) => void;
  mocks.records.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const wrapper = mount(TimeTracker, {
    global: { directives: { loading: {} } },
  });
  await flushPromises();
  mocks.records.mockResolvedValueOnce([
    { id: 'new', categoryId: 'category', startTime: 100, endTime: 120 },
  ]);
  await wrapper.vm.loadData(true);
  finish([{ id: 'old', categoryId: 'category', startTime: 60, endTime: 90 }]);
  await flushPromises();
  expect(wrapper.emitted('update:last-end')?.at(-1)).toEqual([121]);
  expect(mocks.render).toHaveBeenCalledTimes(1);
});

it('首次加载失败提供重试，不显示成功空态', async () => {
  mocks.records.mockRejectedValueOnce(new Error('offline'));
  const wrapper = mount(TimeTracker, {
    global: { directives: { loading: {} } },
  });
  await flushPromises();
  expect(wrapper.text()).not.toContain('今日暂无记录');
  await wrapper.get('button[aria-label="时迹加载失败，重试"]').trigger('click');
  await flushPromises();
  expect(wrapper.vm.failed).toBe(false);
  expect(wrapper.text()).toContain('工作');
});

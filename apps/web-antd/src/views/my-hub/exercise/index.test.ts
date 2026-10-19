import { flushPromises, mount } from '@vue/test-utils';

import dayjs from 'dayjs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import Exercise from './index.vue';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  summary: vi.fn(),
  dictionary: vi.fn(),
  render: vi.fn(),
  gridOptions: undefined as any,
}));
vi.mock('#/api/core/exerciseRecord', () => ({
  query: mocks.query,
  getStatisticsSummary: mocks.summary,
  deleteBatch: vi.fn(),
}));
vi.mock('#/api/core/userDictType', () => ({ getByDictType: mocks.dictionary }));
vi.mock('@vben/preferences', async () => {
  const { ref } = await import('vue');
  return { usePreferences: () => ({ isMobile: ref(false) }) };
});
vi.mock('@vben/plugins/echarts', () => ({
  EchartsUI: { template: '<div />' },
  useEcharts: () => ({ renderEcharts: mocks.render }),
}));
vi.mock('#/adapter/vxe-table', () => ({
  useVbenVxeGrid: (options: any) => {
    mocks.gridOptions = options.gridOptions;
    return [{ template: '<div />' }, { reload: vi.fn() }];
  },
}));
vi.mock('#/adapter/modal-dialog', () => ({ appDialog: { confirm: vi.fn() } }));
vi.mock('#/components/app-modal', () => ({
  AppModal: { template: '<div />' },
}));
vi.mock('#/components/global-float-btn/index.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('./form-drawer.vue', () => ({ default: { template: '<div />' } }));
vi.mock('ant-design-vue', () => {
  const container = { template: '<div><slot /></div>' };
  return {
    Button: { template: '<button><slot /></button>' },
    Card: container,
    Popconfirm: container,
    RangePicker: { name: 'RangePicker', template: '<div />' },
    Select: container,
    Spin: container,
    Tag: container,
  };
});

const typeId = '9223372036854775000';
let wrapper: ReturnType<typeof mount>;
const queryPage = (page = 1, form = {}) =>
  mocks.gridOptions.proxyConfig.ajax.query(
    { page: { currentPage: page, pageSize: 20 } },
    form,
  );

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.dictionary.mockResolvedValue({
    dictDetailList: [{ id: typeId, dictLabel: '跑步' }],
  });
  mocks.query.mockResolvedValue({
    items: [
      {
        id: '9223372036854775100',
        exerciseTypeId: typeId,
        exerciseDate: '2026-10-19',
        exerciseCount: 1,
      },
    ],
    total: 1005,
  });
  mocks.summary.mockResolvedValue([
    {
      exerciseTypeId: typeId,
      exerciseDate: '2026-10-19',
      exerciseCount: 2008,
      recordCount: 1004,
    },
    {
      exerciseTypeId: typeId,
      exerciseDate: '2023-01-01',
      exerciseCount: 2,
      recordCount: 1,
    },
  ]);
  wrapper = mount(Exercise);
});
afterEach(() => {
  wrapper.unmount();
  vi.useRealTimers();
});

it('统计独立于明细分页，跨年数据完整且大整数类型ID不失真', async () => {
  await queryPage();
  await flushPromises();
  expect(wrapper.get('.total-amount').text()).toBe('2次');
  expect(mocks.query).toHaveBeenCalledTimes(1);
  expect(mocks.summary).toHaveBeenCalledTimes(1);
  await queryPage(2);
  expect(mocks.summary).toHaveBeenCalledTimes(1);
  expect(mocks.query).toHaveBeenCalledTimes(2);
  expect(mocks.gridOptions.columns).toBeDefined();
  await vi.advanceTimersByTimeAsync(100);
  expect(
    mocks.render.mock.calls.some(([chart]) =>
      chart.series?.[0]?.data?.includes(2008),
    ),
  ).toBe(true);
});

it('日期筛选同时提交给分页和统计，空结果清除旧图表', async () => {
  await queryPage();
  await vi.advanceTimersByTimeAsync(100);
  await wrapper
    .findComponent({ name: 'RangePicker' })
    .vm.$emit('update:value', [dayjs('2023-01-01'), dayjs('2023-02-01')]);
  mocks.summary.mockResolvedValue([]);
  await queryPage(1, { exerciseTypeId: typeId, description: '测试' });
  expect(mocks.summary).toHaveBeenLastCalledWith({
    exerciseTypeId: typeId,
    description: '测试',
    startDate: '2023-01-01',
    endDate: '2023-02-28',
  });
  expect(mocks.query.mock.calls.at(-1)?.[0].condition).toEqual(
    mocks.summary.mock.calls.at(-1)?.[0],
  );
  await vi.advanceTimersByTimeAsync(100);
  expect(wrapper.get('.total-amount').text()).toBe('0次');
  expect(mocks.render.mock.calls.at(-1)?.[0].series[0].data).toEqual([]);
});

it('迟到的统计不能覆盖新筛选，失败保留内容并允许重试', async () => {
  let resolve!: (value: unknown) => void;
  mocks.summary.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const older = queryPage();
  await flushPromises();
  mocks.summary.mockResolvedValueOnce([]);
  await queryPage(1, { exerciseTypeId: typeId });
  resolve([
    {
      exerciseTypeId: typeId,
      exerciseDate: '2020-01-01',
      exerciseCount: 1,
      recordCount: 1,
    },
  ]);
  await older;
  await flushPromises();
  expect(wrapper.get('.total-amount').text()).toBe('0次');
  mocks.summary.mockRejectedValueOnce(new Error('模拟失败'));
  await queryPage(1, { exerciseTypeId: typeId });
  expect(wrapper.get('.total-amount').text()).toBe('0次');
  await wrapper.get('button[aria-label="重试运动统计"]').trigger('click');
  await flushPromises();
  expect(wrapper.find('button[aria-label="重试运动统计"]').exists()).toBe(
    false,
  );
  expect(wrapper.get('.total-amount').text()).toBe('2次');
});

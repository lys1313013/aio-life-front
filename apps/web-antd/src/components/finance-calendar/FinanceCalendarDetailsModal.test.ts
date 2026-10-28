import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import FinanceCalendarDetailsModal from '#/components/finance-calendar/FinanceCalendarDetailsModal.vue';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  dictionary: vi.fn(),
  apis: [] as any[],
}));
vi.mock('#/components/finance-entry/ExpenseFormModal.vue', () => ({
  default: { name: 'ExpenseEditor' },
}));
vi.mock('#/components/finance-entry/IncomeFormModal.vue', () => ({
  default: { name: 'IncomeEditor' },
}));
vi.mock('#/adapter/modal', () => ({
  useVbenModal: ({ connectedComponent }: any) => {
    const api: any = { open: vi.fn(), setData: vi.fn() };
    api.setData.mockReturnValue(api);
    mocks.apis.push(api);
    return [
      {
        name: connectedComponent.name,
        emits: ['saved', 'deleted'],
        template: '<div />',
      },
      api,
    ];
  },
}));
vi.mock('#/api/core/finance-calendar', () => ({
  getFinanceCalendarDetails: mocks.query,
}));
vi.mock('#/api/core/userDictType', () => ({ getByDictType: mocks.dictionary }));
vi.mock('#/components/app-modal', () => ({
  AppModal: { template: '<div><slot /></div>' },
}));
vi.mock('ant-design-vue', () => ({
  Button: { template: '<button><slot /></button>' },
  Spin: { template: '<div><slot /></div>' },
  Pagination: {
    emits: ['change'],
    template: '<button data-next @click="$emit(\'change\', 2)">下一页</button>',
  },
}));
const bucket = {
  key: '2026-08-12',
  label: '12',
  startDate: '2026-08-12',
  endDate: '2026-08-13',
  amount: 608.02,
  future: false,
};
const row = {
  id: '9007199254740993123',
  amt: 608.02,
  expTime: '2026-08-12 12:30:00',
  expDesc: '午餐',
  counterparty: '测试餐厅',
  remark: '备注',
  expTypeId: 'type',
  payTypeId: 'pay',
};
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.apis.length = 0;
  mocks.dictionary.mockImplementation((type: string) =>
    Promise.resolve({
      dictDetailList: [
        {
          id: type === 'exp_type' ? 'type' : 'pay',
          dictLabel: type === 'exp_type' ? '餐饮美食' : '支付宝',
        },
      ],
    }),
  );
  mocks.query.mockResolvedValue({ items: [row], total: 1 });
});
it.each(['expense', 'income'] as const)(
  '点击 %s 明细复用编辑器，保存后重新查询当前范围',
  async (kind) => {
    const wrapper = mount(FinanceCalendarDetailsModal, {
      props: { bucket, kind },
    });
    await flushPromises();
    await wrapper.get('.finance-detail-edit').trigger('click');
    const api = mocks.apis[kind === 'expense' ? 0 : 1];
    expect(api.setData).toHaveBeenCalledWith({ values: row });
    expect(api.open).toHaveBeenCalledOnce();
    mocks.query.mockResolvedValueOnce({
      items: [{ ...row, remark: '已修改' }],
      total: 1,
    });
    wrapper
      .getComponent({
        name: kind === 'expense' ? 'ExpenseEditor' : 'IncomeEditor',
      })
      .vm.$emit('saved');
    await flushPromises();
    expect(mocks.query).toHaveBeenLastCalledWith(kind, bucket, 1, 20);
    expect(wrapper.text()).toContain('已修改');
  },
);
it('展开交易信息不会打开编辑器；修改后末页变空回到上一页', async () => {
  mocks.query.mockResolvedValue({
    items: [{ ...row, transactionId: 'order' }],
    total: 21,
  });
  const wrapper = mount(FinanceCalendarDetailsModal, {
    props: { bucket, kind: 'expense' },
  });
  await flushPromises();
  await wrapper.get('summary').trigger('click');
  expect(mocks.apis[0].open).not.toHaveBeenCalled();
  await wrapper.get('[data-next]').trigger('click');
  await flushPromises();
  mocks.query
    .mockResolvedValueOnce({ items: [], total: 20 })
    .mockResolvedValueOnce({ items: [row], total: 20 });
  wrapper.getComponent({ name: 'ExpenseEditor' }).vm.$emit('deleted');
  await flushPromises();
  expect(mocks.query.mock.calls.map((call) => call[2])).toEqual([1, 2, 2, 1]);
});
it('加载所选范围真实明细，保留字符串 ID 并解析分类与支付方式', async () => {
  const wrapper = mount(FinanceCalendarDetailsModal, {
    props: { bucket, kind: 'expense' },
  });
  await flushPromises();
  expect(mocks.query).toHaveBeenCalledWith('expense', bucket, 1, 20);
  expect(wrapper.get('[data-finance-id]').attributes('data-finance-id')).toBe(
    row.id,
  );
  expect(wrapper.text()).toContain('2026年8月12日');
  expect(wrapper.text()).toContain('午餐');
  expect(wrapper.text()).toContain('餐饮美食 · 支付宝');
  expect(wrapper.text()).toContain('608.02');
});
it('翻页失败保留已有明细并重试失败页，不跳回第一页', async () => {
  mocks.query
    .mockResolvedValueOnce({ items: [row], total: 21 })
    .mockRejectedValueOnce(new Error('failed'))
    .mockResolvedValueOnce({
      items: [{ ...row, id: 'next', expDesc: '第二页' }],
      total: 21,
    });
  const wrapper = mount(FinanceCalendarDetailsModal, {
    props: { bucket, kind: 'expense' },
  });
  await flushPromises();
  await wrapper.get('[data-next]').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('午餐');
  expect(wrapper.text()).toContain('加载失败，重试');
  await wrapper.get('[role="alert"] button').trigger('click');
  await flushPromises();
  expect(mocks.query.mock.calls.map((call) => call[2])).toEqual([1, 2, 2]);
  expect(wrapper.text()).toContain('第二页');
  expect(wrapper.text()).not.toContain('午餐');
});
it('初次失败不显示空态；重试返回空数据后才显示暂无记录', async () => {
  mocks.query
    .mockRejectedValueOnce(new Error('failed'))
    .mockResolvedValueOnce({ items: [], total: 0 });
  const wrapper = mount(FinanceCalendarDetailsModal, {
    props: { bucket, kind: 'expense' },
  });
  await flushPromises();
  expect(wrapper.text()).not.toContain('暂无支出记录');
  await wrapper.get('[role="alert"] button').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('暂无支出记录');
});
it('关闭后旧请求不影响重新打开的范围', async () => {
  let resolveOld!: (value: unknown) => void;
  mocks.query.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  const old = mount(FinanceCalendarDetailsModal, {
    props: { bucket, kind: 'expense' },
  });
  old.unmount();
  mocks.query.mockResolvedValue({ items: [], total: 0 });
  const current = mount(FinanceCalendarDetailsModal, {
    props: {
      kind: 'expense',
      bucket: { ...bucket, startDate: '2026-08-13', endDate: '2026-08-14' },
    },
  });
  await flushPromises();
  resolveOld({ items: [row], total: 1 });
  await flushPromises();
  expect(current.text()).toContain('暂无支出记录');
  expect(current.text()).not.toContain('午餐');
});

it('收入明细沿用共享弹窗，显示日期、分类、备注和税额且不加载支付字典', async () => {
  mocks.query.mockResolvedValue({
    items: [
      {
        id: '9007199254740993124',
        amt: 8000,
        incDate: '2026-08-12',
        incTypeId: 'salary',
        remark: '八月工资',
        tax: 120,
      },
    ],
    total: 1,
  });
  mocks.dictionary.mockResolvedValue({
    dictDetailList: [{ id: 'salary', dictLabel: '工资收入' }],
  });
  const wrapper = mount(FinanceCalendarDetailsModal, {
    props: { bucket, kind: 'income' },
  });
  await flushPromises();
  expect(mocks.query).toHaveBeenCalledWith('income', bucket, 1, 20);
  expect(mocks.dictionary).toHaveBeenCalledExactlyOnceWith('income_type');
  expect(wrapper.text()).toContain('八月工资');
  expect(wrapper.text()).toContain('2026-08-12 · 工资收入');
  expect(wrapper.text()).toContain('税额：120.00');
});

it('概览切换明细类型重置页码，合计使用对应收入支出且忽略旧响应', async () => {
  const wrapper = mount(FinanceCalendarDetailsModal, {
    props: {
      bucket: { ...bucket, amount: 0, income: 608.02, expense: 608.02 },
      kind: 'finance',
      initialKind: 'expense',
    },
  });
  await flushPromises();
  expect(wrapper.get('[aria-label="范围合计"]').text()).toBe('608.02');
  let resolveIncome!: (value: unknown) => void;
  mocks.query.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveIncome = resolve;
      }),
  );
  await wrapper.findAll('[aria-label="明细类型"] button')[0]!.trigger('click');
  expect(mocks.query).toHaveBeenLastCalledWith(
    'income',
    expect.anything(),
    1,
    20,
  );
  mocks.query.mockResolvedValueOnce({
    items: [{ ...row, expDesc: '最新支出' }],
    total: 1,
  });
  await wrapper.findAll('[aria-label="明细类型"] button')[1]!.trigger('click');
  await flushPromises();
  expect(mocks.query).toHaveBeenLastCalledWith(
    'expense',
    expect.anything(),
    1,
    20,
  );
  resolveIncome({
    items: [
      { id: 'old', amt: 608.02, incDate: '2026-08-12', remark: '旧收入' },
    ],
    total: 1,
  });
  await flushPromises();
  expect(wrapper.text()).toContain('最新支出');
  expect(wrapper.text()).not.toContain('旧收入');
});

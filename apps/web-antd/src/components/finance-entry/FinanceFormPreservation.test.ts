import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import ExpenseForm from '#/components/finance-entry/ExpenseFormModal.vue';
import IncomeForm from '#/components/finance-entry/IncomeFormModal.vue';

const mocks = vi.hoisted(() => ({
  options: undefined as any,
  data: {} as any,
  values: {} as any,
  expenseUpdate: vi.fn(),
  incomeUpdate: vi.fn(),
  close: vi.fn(),
  expenseDelete: vi.fn(),
  incomeDelete: vi.fn(),
  error: vi.fn(),
}));
vi.mock('#/adapter/form', () => ({
  useAppForm: () => [
    { template: '<div />' },
    {
      setValues: vi.fn(),
      resetForm: vi.fn(),
      validate: async () => ({ valid: true }),
      submitForm: async () => mocks.values,
    },
  ],
}));
vi.mock('#/adapter/modal', () => ({
  useVbenModal: (options: any) => {
    mocks.options = options;
    return [
      { template: '<div><slot /><slot name="prepend-footer" /></div>' },
      {
        getData: () => mocks.data,
        close: mocks.close,
        lock: vi.fn(),
        unlock: vi.fn(),
      },
    ];
  },
}));
vi.mock('#/api/core/expense', () => ({
  updateData: mocks.expenseUpdate,
  deleteData: mocks.expenseDelete,
  insertData: vi.fn(),
}));
vi.mock('#/api/core/income', () => ({
  update: mocks.incomeUpdate,
  deleteData: mocks.incomeDelete,
  add: vi.fn(),
}));
vi.mock('#/api/core/userDictType', () => ({
  getByDictType: async () => ({ dictDetailList: [] }),
}));
vi.mock('#/components/app-modal', () => ({
  AppModalDelete: {
    name: 'AppModalDelete',
    props: ['action', 'title', 'loading', 'disabled'],
    template:
      '<button data-delete :disabled="disabled || loading" @click="action">删除</button>',
  },
}));
vi.mock('ant-design-vue', () => ({
  message: { error: mocks.error },
  Radio: { Group: { template: '<div />' }, Button: { template: '<div />' } },
}));
enableAutoUnmount(afterEach);
beforeEach(() => vi.clearAllMocks());

it.each(['income', 'expense'] as const)(
  '%s 保存表单字段时保留未显示的税额与交易信息',
  async (kind) => {
    const original = {
      id: '9223372036854775807',
      amt: 26,
      tax: 120,
      transactionId: 'original-order',
      counterpartyAcct: 'original-account',
      transactionAmt: 99,
      expTime: '2026-09-28 18:32:49',
      incDate: '2026-09-28',
    };
    mocks.data = { values: original };
    mocks.values = { id: original.id, amt: '100', remark: '已修改' };
    mount(kind === 'income' ? IncomeForm : ExpenseForm);
    mocks.options.onOpenChange(true);
    await flushPromises();
    await mocks.options.onConfirm();
    const update = kind === 'income' ? mocks.incomeUpdate : mocks.expenseUpdate;
    const payload =
      kind === 'income' ? update.mock.calls[0]![1] : update.mock.calls[0]![0];
    expect(payload).toMatchObject({
      ...original,
      amt: '100',
      remark: '已修改',
    });
    expect(mocks.close).toHaveBeenCalledOnce();
  },
);

it.each(['expense', 'income'] as const)(
  '%s 删除失败保留编辑器，重试成功关闭并通知明细与列表刷新',
  async (kind) => {
    const id = '9223372036854775807';
    mocks.data = { values: { id, amt: 26, remark: '原始备注' } };
    const wrapper = mount(kind === 'income' ? IncomeForm : ExpenseForm);
    mocks.options.onOpenChange(true);
    await flushPromises();
    const button = wrapper.getComponent({ name: 'AppModalDelete' });
    expect(button.props('title')).toBe('确认删除？');
    const remove = kind === 'income' ? mocks.incomeDelete : mocks.expenseDelete;
    remove
      .mockRejectedValueOnce(new Error('模拟删除失败'))
      .mockResolvedValueOnce(true);
    await wrapper.get('[data-delete]').trigger('click');
    await flushPromises();
    expect(remove).toHaveBeenCalledWith(kind === 'income' ? id : { id });
    expect(mocks.close).not.toHaveBeenCalled();
    expect(wrapper.emitted('deleted')).toBeUndefined();
    expect(wrapper.emitted('tableReload')).toBeUndefined();
    await wrapper.get('[data-delete]').trigger('click');
    await flushPromises();
    expect(mocks.close).toHaveBeenCalledOnce();
    expect(wrapper.emitted('deleted')).toEqual([[id]]);
    expect(wrapper.emitted('tableReload')).toHaveLength(1);
  },
);
it.each(['expense', 'income'] as const)(
  '%s 删除进行中阻止重复删除、保存与关闭，false 不算成功',
  async (kind) => {
    mocks.data = { values: { id: '9223372036854775807' } };
    const wrapper = mount(kind === 'income' ? IncomeForm : ExpenseForm);
    mocks.options.onOpenChange(true);
    await flushPromises();
    const remove = kind === 'income' ? mocks.incomeDelete : mocks.expenseDelete;
    let release!: (value: boolean) => void;
    remove.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const action = wrapper
      .getComponent({ name: 'AppModalDelete' })
      .props('action');
    const pending = action();
    await action();
    await mocks.options.onConfirm();
    mocks.options.onCancel();
    expect(remove).toHaveBeenCalledOnce();
    expect(mocks.close).not.toHaveBeenCalled();
    expect(mocks.expenseUpdate).not.toHaveBeenCalled();
    expect(mocks.incomeUpdate).not.toHaveBeenCalled();
    release(false);
    await pending;
    expect(mocks.error).toHaveBeenCalledWith('记录未删除，请重试');
    expect(mocks.close).not.toHaveBeenCalled();
  },
);
it.each(['expense', 'income'] as const)(
  '%s 新增弹窗不显示删除',
  async (kind) => {
    mocks.data = { values: {} };
    const wrapper = mount(kind === 'income' ? IncomeForm : ExpenseForm);
    mocks.options.onOpenChange(true);
    await flushPromises();
    expect(wrapper.find('[data-delete]').exists()).toBe(false);
  },
);

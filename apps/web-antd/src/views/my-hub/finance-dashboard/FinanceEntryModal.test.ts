import { enableAutoUnmount, mount } from '@vue/test-utils';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import FinanceEntryModal from './FinanceEntryModal.vue';

const mocks = vi.hoisted(() => ({ apis: [] as any[] }));
vi.mock('#/views/my-hub/expense/form-modal.vue', () => ({
  default: { name: 'ExpenseEntry' },
}));
vi.mock('#/views/my-hub/income/form-modal.vue', () => ({
  default: { name: 'IncomeEntry' },
}));
vi.mock('#/adapter/modal', () => ({
  useVbenModal: ({ connectedComponent }: any) => {
    const api: any = { open: vi.fn(), close: vi.fn(), setData: vi.fn() };
    api.setData.mockReturnValue(api);
    mocks.apis.push(api);
    return [
      {
        name: connectedComponent.name,
        props: ['showKindSwitch'],
        emits: ['kindChange', 'saved'],
        template: '<div />',
      },
      api,
    ];
  },
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  mocks.apis.length = 0;
});

it.each(['income', 'expense'] as const)(
  '独立 %s 入口只打开对应表单，禁止切换',
  async (kind) => {
    const wrapper = mount(FinanceEntryModal, { props: { kind } });
    const activeIndex = kind === 'expense' ? 0 : 1;
    const otherIndex = 1 - activeIndex;
    // 未挂载的 connected component 尚未注入 close 方法。
    delete mocks.apis[otherIndex].close;
    expect(() => wrapper.vm.open()).not.toThrow();
    expect(mocks.apis[activeIndex].open).toHaveBeenCalledOnce();
    expect(mocks.apis[otherIndex].open).not.toHaveBeenCalled();
    expect(
      wrapper
        .getComponent({
          name: kind === 'expense' ? 'ExpenseEntry' : 'IncomeEntry',
        })
        .props('showKindSwitch'),
    ).toBe(false);
    expect(
      wrapper
        .findComponent({
          name: kind === 'expense' ? 'IncomeEntry' : 'ExpenseEntry',
        })
        .exists(),
    ).toBe(false);
    wrapper.vm.open(kind === 'expense' ? 'income' : 'expense');
    expect(mocks.apis[otherIndex].open).not.toHaveBeenCalled();
    await wrapper
      .getComponent({
        name: kind === 'expense' ? 'ExpenseEntry' : 'IncomeEntry',
      })
      .vm.$emit('saved');
    expect(wrapper.emitted('saved')).toHaveLength(1);
  },
);

it('收支概览保留收入支出切换', async () => {
  const wrapper = mount(FinanceEntryModal);
  wrapper.vm.open();
  expect(mocks.apis[0].open).toHaveBeenCalledOnce();
  expect(
    wrapper.getComponent({ name: 'ExpenseEntry' }).props('showKindSwitch'),
  ).toBe(true);
  wrapper
    .getComponent({ name: 'ExpenseEntry' })
    .vm.$emit('kindChange', 'income');
  expect(mocks.apis[1].open).toHaveBeenCalledOnce();
  expect(mocks.apis[0].close).toHaveBeenCalledOnce();
});

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FormModal from '#/components/finance-entry/IncomeFormModal.vue';

import IncomePage from './index.vue';

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  reload: vi.fn(),
  formOptions: null as any,
  modalOptions: null as any,
  values: {} as Record<string, any>,
  row: {
    id: '9007199254740993',
    amt: 100,
    incTypeId: '9007199254740995',
    incDate: '2026-10-11',
    remark: '',
  },
}));

vi.mock('#/api/request', () => ({
  requestClient: {
    delete: mocks.delete,
    post: mocks.post,
    put: mocks.put,
  },
}));
vi.mock('#/api/core/userDictType', () => ({
  getByDictType: async () => ({ dictDetailList: [] }),
}));
vi.mock('@vben/preferences', () => ({
  usePreferences: () => ({ isMobile: { value: false } }),
}));
vi.mock('#/adapter/vxe-table', () => ({
  useVbenVxeGrid: () => [
    {
      setup: () => ({ row: mocks.row }),
      template: '<div><slot name="action" :row="row" /></div>',
    },
    { reload: mocks.reload },
  ],
}));
vi.mock('#/adapter/form', () => ({
  useAppForm: (options: any) => {
    mocks.formOptions = options;
    return [
      { template: '<div />' },
      {
        validate: async () => ({ valid: true }),
        submitForm: async () => mocks.values,
      },
    ];
  },
}));
vi.mock('#/adapter/modal', () => ({
  useVbenModal: (options: any) => {
    mocks.modalOptions = options;
    return [
      { template: '<div><slot /></div>' },
      { lock: vi.fn(), unlock: vi.fn(), close: vi.fn() },
    ];
  },
}));
vi.mock('../components/TransactionDashboard.vue', () => ({
  default: {
    template: '<div />',
    methods: { refreshData: vi.fn() },
  },
}));
vi.mock('#/components/global-float-btn/index.vue', () => ({
  default: { template: '<div />' },
}));

enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.values = {};
});

describe('收入记录 ID 契约', () => {
  it('确认删除使用响应中的字符串 id 构造请求地址', async () => {
    const wrapper = mount(IncomePage, {
      global: { stubs: { Popconfirm: true } },
    });
    await flushPromises();
    wrapper.getComponent({ name: 'APopconfirm' }).vm.$emit('confirm');
    await flushPromises();

    expect(mocks.delete).toHaveBeenCalledExactlyOnceWith(
      '/income/9007199254740993',
    );
    expect(mocks.reload).toHaveBeenCalledOnce();
  });

  it('编辑保留 id 并调用更新接口，不误新增记录', async () => {
    mount(FormModal);
    await flushPromises();
    expect(mocks.formOptions.schema).toEqual(
      expect.arrayContaining([expect.objectContaining({ fieldName: 'id' })]),
    );
    mocks.values = { ...mocks.row, amt: 200 };
    await mocks.modalOptions.onConfirm();

    expect(mocks.put).toHaveBeenCalledExactlyOnceWith(
      '/income/9007199254740993',
      {
        amt: 200,
        incTypeId: '9007199254740995',
        incDate: '2026-10-11',
        remark: '',
      },
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('没有 id 的新记录仍调用新增接口', async () => {
    mount(FormModal);
    await flushPromises();
    mocks.values = { amt: 100, incDate: '2026-10-11' };
    await mocks.modalOptions.onConfirm();

    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/income', {
      amt: 100,
      incDate: '2026-10-11',
    });
    expect(mocks.put).not.toHaveBeenCalled();
  });
});

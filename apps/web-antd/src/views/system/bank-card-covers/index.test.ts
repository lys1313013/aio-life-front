import type { CoverTemplate, CoverTemplatePage } from '#/api/bank-card/covers';

import { flushPromises, shallowMount } from '@vue/test-utils';

import { Form, Popconfirm, Select, Switch } from 'ant-design-vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModal } from '#/components/app-modal';
import CoverPicker from '#/views/bank-card/cover-picker.vue';

import CoverPage from './index.vue';

const api = vi.hoisted(() => ({
  listCoverTemplates: vi.fn(),
  listCoverBanks: vi.fn(),
  deleteCoverTemplate: vi.fn(),
  setCoverEnabled: vi.fn(),
  saveCoverTemplate: vi.fn(),
  uploadTemplateCover: vi.fn(),
}));
vi.mock('#/api/bank-card/covers', () => api);
vi.mock('./cover-preview.vue', () => ({ default: { template: '<div />' } }));
vi.mock('#/views/bank-card/cover-picker.vue', () => ({
  default: { template: '<div />' },
}));

const original: CoverTemplate = {
  id: '1',
  name: '原卡面',
  bankId: '2',
  bankName: '银行',
  cardType: 'debit',
  fileId: '3',
  sourceUrl: null,
  isEnabled: 1,
  sortOrder: 0,
  usageCount: 0,
};
const wrappers: ReturnType<typeof shallowMount>[] = [];
function pageResult(
  items: CoverTemplate[],
  total = items.length,
): CoverTemplatePage {
  return { items, total: String(total) };
}
let reachBottom: () => void;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
async function render() {
  const wrapper = shallowMount(CoverPage, {
    global: {
      renderStubDefaultSlot: true,
      stubs: {
        AForm: {
          props: ['disabled', 'model'],
          methods: {
            clearValidate: vi.fn(),
            validate: vi.fn().mockResolvedValue(undefined),
          },
          template: '<form><slot /></form>',
        },
        APopconfirm: {
          props: ['disabled'],
          inheritAttrs: false,
          emits: ['confirm'],
          template: '<div><slot /></div>',
        },
        AInput: { inheritAttrs: false, template: '<input />' },
        AInputNumber: { inheritAttrs: false, template: '<input />' },
        ASelect: {
          props: ['disabled', 'value', 'options'],
          emits: ['update:value'],
          inheritAttrs: false,
          template: '<div />',
        },
        AButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        reachBottom = () => callback([{ isIntersecting: true }]);
      }
      disconnect() {}
      observe() {}
    },
  );
  api.listCoverTemplates.mockImplementation(async () =>
    pageResult([{ ...original }]),
  );
  api.listCoverBanks.mockResolvedValue([]);
  api.deleteCoverTemplate.mockResolvedValue(undefined);
  api.setCoverEnabled.mockImplementation(async (_id, isEnabled) => ({
    ...original,
    isEnabled,
  }));
});
afterEach(() => wrappers.splice(0).forEach((w) => w.unmount()));
describe('公共卡面查询与修改交错', () => {
  it('删除期间刷新得到的旧列表不能复活删除项', async () => {
    const wrapper = await render();
    const deletion = deferred<void>();
    const list = deferred<CoverTemplatePage>();
    api.deleteCoverTemplate.mockReturnValueOnce(deletion.promise);
    wrapper.findComponent(Popconfirm).vm.$emit('confirm');
    api.listCoverTemplates.mockReturnValueOnce(list.promise);
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    deletion.resolve();
    await flushPromises();
    expect(wrapper.find('.cover-item').exists()).toBe(false);
    list.resolve(pageResult([{ ...original }]));
    await flushPromises();
    expect(wrapper.find('.cover-item').exists()).toBe(false);
  });
  it('启停结果不被旧列表回滚', async () => {
    const wrapper = await render();
    const update = deferred<CoverTemplate>();
    const list = deferred<CoverTemplatePage>();
    api.setCoverEnabled.mockReturnValueOnce(update.promise);
    wrapper.findComponent(Switch).vm.$emit('change', false);
    api.listCoverTemplates.mockReturnValueOnce(list.promise);
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    update.resolve({ ...original, isEnabled: 0 });
    await flushPromises();
    list.resolve(pageResult([{ ...original }]));
    await flushPromises();
    expect(wrapper.findComponent(Switch).props('checked')).toBe(false);
  });
  it('后发查询优先，过期错误不覆盖成功状态', async () => {
    const wrapper = await render();
    const old = deferred<CoverTemplatePage>();
    api.listCoverTemplates.mockReturnValueOnce(old.promise);
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    api.listCoverTemplates.mockResolvedValueOnce(
      pageResult([{ ...original, name: '新卡面' }]),
    );
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    await flushPromises();
    old.reject(new Error('offline'));
    await flushPromises();
    expect(wrapper.text()).toContain('新卡面');
    expect(wrapper.text()).not.toContain('加载失败');
  });
  it('失败保留现有卡片，删除进行中不重复提交', async () => {
    const wrapper = await render();
    const deletion = deferred<void>();
    api.deleteCoverTemplate.mockReturnValueOnce(deletion.promise);
    const confirm = wrapper.findComponent(Popconfirm);
    confirm.vm.$emit('confirm');
    confirm.vm.$emit('confirm');
    expect(api.deleteCoverTemplate).toHaveBeenCalledTimes(1);
    // 页面 mutation 的失败仍由请求层提示；列表失败在页面可重试。
    api.listCoverTemplates.mockRejectedValueOnce(new Error('offline'));
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('原卡面');
    expect(wrapper.text()).toContain('加载失败');
    deletion.resolve();
    await flushPromises();
  });
});

describe('公共卡面上传期间的表单', () => {
  it('允许继续填写和取消，仅阻止最终保存', async () => {
    const wrapper = await render();
    await wrapper.get('[aria-label="新增公共卡面"]').trigger('click');
    wrapper.findComponent(CoverPicker).vm.$emit('pending', true);
    await flushPromises();
    const modal = wrapper.findComponent(AppModal);
    expect(wrapper.findComponent(Form).props('disabled')).toBe(false);
    expect(modal.props('okButtonProps')).toEqual({ disabled: true });
    expect(modal.props('cancelButtonProps')).toEqual({ disabled: false });
    modal.vm.$emit('ok');
    await flushPromises();
    expect(api.saveCoverTemplate).not.toHaveBeenCalled();
    modal.vm.$emit('update:open', false);
    await flushPromises();
    expect(wrapper.findComponent(CoverPicker).attributes('active')).toBe(
      'false',
    );
  });
});

describe('公共卡面使用次数与编辑限制', () => {
  it.each([0, '0'])(
    '使用次数为 %j 时允许修改银行和类型并保存',
    async (usageCount) => {
      api.listCoverTemplates.mockResolvedValueOnce(
        pageResult([{ ...original, usageCount }]),
      );
      api.saveCoverTemplate.mockResolvedValueOnce({
        ...original,
        bankId: '4',
        cardType: 'credit',
        usageCount,
      });
      const wrapper = await render();
      await wrapper.get('[aria-label="编辑原卡面"]').trigger('click');
      const selects = wrapper.findComponent(Form).findAllComponents(Select);
      expect(selects).toHaveLength(2);
      expect(selects.map((select) => select.props('disabled'))).toEqual([
        false,
        false,
      ]);
      expect(wrapper.findComponent(Popconfirm).props('disabled')).toBeFalsy();
      selects[0]!.vm.$emit('update:value', '4');
      selects[1]!.vm.$emit('update:value', 'credit');
      wrapper.findComponent(AppModal).vm.$emit('ok');
      await flushPromises();
      expect(api.saveCoverTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ bankId: '4', cardType: 'credit' }),
        original.id,
      );
      expect(wrapper.findComponent(AppModal).props('open')).toBe(false);
    },
  );
  it.each([1, '1', '9223372036854775807'])(
    '使用次数为 %j 时锁定银行、类型和删除',
    async (usageCount) => {
      api.listCoverTemplates.mockResolvedValueOnce(
        pageResult([{ ...original, usageCount }]),
      );
      const wrapper = await render();
      await wrapper.get('[aria-label="编辑原卡面"]').trigger('click');
      const selects = wrapper.findComponent(Form).findAllComponents(Select);
      expect(selects.map((select) => select.props('disabled'))).toEqual([
        true,
        true,
      ]);
      expect(wrapper.findComponent(Popconfirm).props('disabled')).toBe(true);
      expect(wrapper.findComponent(Form).props('disabled')).toBe(false);
    },
  );
});

describe('公共卡面滚动分页', () => {
  const firstPage = Array.from({ length: 24 }, (_, index) => ({
    ...original,
    id: String(index + 1),
    name: `卡面${index + 1}`,
  }));
  it('首屏只请求一页，触底去重并停止在末页', async () => {
    api.listCoverTemplates.mockResolvedValueOnce(pageResult(firstPage, 25));
    const wrapper = await render();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(1);
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, size: 24 }),
    );
    const next = deferred<CoverTemplatePage>();
    api.listCoverTemplates.mockReturnValueOnce(next.promise);
    reachBottom();
    reachBottom();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(2);
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect(wrapper.findAll('.cover-item')).toHaveLength(24);
    next.resolve(pageResult([firstPage[23]!, { ...original, id: '25' }], 25));
    await flushPromises();
    expect(wrapper.findAll('.cover-item')).toHaveLength(25);
    reachBottom();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(2);
  });
  it('分页失败保留已有卡面，仅在底部重试失败页', async () => {
    api.listCoverTemplates.mockResolvedValueOnce(pageResult(firstPage, 48));
    const wrapper = await render();
    api.listCoverTemplates.mockRejectedValueOnce(new Error('offline'));
    reachBottom();
    await flushPromises();
    expect(wrapper.findAll('.cover-item')).toHaveLength(24);
    reachBottom();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(2);
    api.listCoverTemplates.mockResolvedValueOnce(pageResult([], 24));
    await wrapper.get('[aria-label="重试加载卡面"]').trigger('click');
    await flushPromises();
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect(wrapper.findAll('.cover-item')).toHaveLength(24);
    reachBottom();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(3);
  });
  it('筛选重置页码，旧分页响应不能混入新列表', async () => {
    api.listCoverTemplates.mockResolvedValueOnce(pageResult(firstPage, 48));
    const wrapper = await render();
    const old = deferred<CoverTemplatePage>();
    api.listCoverTemplates.mockReturnValueOnce(old.promise);
    reachBottom();
    api.listCoverTemplates.mockResolvedValueOnce(
      pageResult([
        { ...original, id: '99', cardType: 'credit', name: '信用卡面' },
      ]),
    );
    wrapper.findAllComponents(Select)[1]!.vm.$emit('update:value', 'credit');
    await flushPromises();
    expect(api.listCoverTemplates).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, cardType: 'credit' }),
    );
    old.resolve(pageResult([{ ...original, id: '25' }], 48));
    await flushPromises();
    expect(wrapper.findAll('.cover-item')).toHaveLength(1);
    expect(wrapper.text()).toContain('信用卡面');
  });
  it('离页后的响应不继续分页', async () => {
    const pending = deferred<CoverTemplatePage>();
    api.listCoverTemplates.mockReturnValueOnce(pending.promise);
    const wrapper = await render();
    wrapper.unmount();
    pending.resolve(pageResult(firstPage, 48));
    await flushPromises();
    reachBottom();
    expect(api.listCoverTemplates).toHaveBeenCalledTimes(1);
  });
});

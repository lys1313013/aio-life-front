import type { CoverTemplate } from '#/api/bank-card/covers';

import { flushPromises, shallowMount } from '@vue/test-utils';

import { Form, Popconfirm, Switch } from 'ant-design-vue';
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
          inheritAttrs: false,
          emits: ['confirm'],
          template: '<div><slot /></div>',
        },
        AInput: { inheritAttrs: false, template: '<input />' },
        AInputNumber: { inheritAttrs: false, template: '<input />' },
        ASelect: { inheritAttrs: false, template: '<div />' },
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
  api.listCoverTemplates.mockImplementation(async () => [{ ...original }]);
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
    const list = deferred<CoverTemplate[]>();
    api.deleteCoverTemplate.mockReturnValueOnce(deletion.promise);
    wrapper.findComponent(Popconfirm).vm.$emit('confirm');
    api.listCoverTemplates.mockReturnValueOnce(list.promise);
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    deletion.resolve();
    await flushPromises();
    expect(wrapper.find('.cover-item').exists()).toBe(false);
    list.resolve([{ ...original }]);
    await flushPromises();
    expect(wrapper.find('.cover-item').exists()).toBe(false);
  });
  it('启停结果不被旧列表回滚', async () => {
    const wrapper = await render();
    const update = deferred<CoverTemplate>();
    const list = deferred<CoverTemplate[]>();
    api.setCoverEnabled.mockReturnValueOnce(update.promise);
    wrapper.findComponent(Switch).vm.$emit('change', false);
    api.listCoverTemplates.mockReturnValueOnce(list.promise);
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    update.resolve({ ...original, isEnabled: 0 });
    await flushPromises();
    list.resolve([{ ...original }]);
    await flushPromises();
    expect(wrapper.findComponent(Switch).props('checked')).toBe(false);
  });
  it('后发查询优先，过期错误不覆盖成功状态', async () => {
    const wrapper = await render();
    const old = deferred<CoverTemplate[]>();
    api.listCoverTemplates.mockReturnValueOnce(old.promise);
    await wrapper.get('[aria-label="刷新卡面"]').trigger('click');
    api.listCoverTemplates.mockResolvedValueOnce([
      { ...original, name: '新卡面' },
    ]);
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

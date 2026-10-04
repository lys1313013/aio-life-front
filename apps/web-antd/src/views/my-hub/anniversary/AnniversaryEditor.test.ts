import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AnniversaryEditor from './AnniversaryEditor.vue';

vi.mock('ant-design-vue', () => {
  const field = {
    props: ['value', 'checked'],
    template: '<div><slot /></div>',
  };
  return {
    DatePicker: field,
    FormItem: field,
    Input: { ...field, TextArea: field },
    InputNumber: field,
    Select: field,
    SelectOption: field,
    Switch: field,
    message: { success: vi.fn() },
    Form: {
      name: 'TestForm',
      props: ['model'],
      methods: { validate: async () => {} },
      template: '<form><slot /></form>',
    },
  };
});
vi.mock('#/components/app-modal', () => ({
  AppModal: {
    name: 'TestModal',
    props: ['open', 'confirmLoading'],
    emits: ['ok'],
    template:
      '<div><slot /><slot name="footer-leading" /><button data-save @click="$emit(\'ok\')">save</button></div>',
  },
  AppModalFooter: {
    emits: ['confirm'],
    template:
      '<div><slot name="leading" /><button data-footer-save @click="$emit(\'confirm\')">save</button></div>',
  },
  AppModalDelete: {
    props: ['action'],
    template: '<button data-delete @click="action()">delete</button>',
  },
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
});
const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('#/api/my-hub/anniversary', () => ({
  createAnniversaryRecord: api.create,
  updateAnniversaryRecord: api.update,
  deleteAnniversaryRecords: api.delete,
}));
const existing = {
  id: '9007199254740993999',
  title: '过去的倒数日',
  targetDate: '2025-01-02',
  type: 'countdown' as const,
  note: '保持备注',
  icon: '🎂',
  color: 'from-cyan-400 to-blue-500',
  isPinned: 1 as const,
};
describe('纪念日复用编辑器', () => {
  it('首页新增默认固定，业务页新增默认不固定，并传递保存结果', async () => {
    const wrapper = mount(AnniversaryEditor);
    wrapper.vm.open(undefined, true);
    await flushPromises();
    const form = wrapper.getComponent({ name: 'TestForm' });
    expect(form.props('model').isPinned).toBe(1);
    form.props('model').title = '新纪念日';
    api.create.mockResolvedValue({ ...existing, title: '新纪念日' });
    await wrapper.get('[data-footer-save]').trigger('click');
    await flushPromises();
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: '新纪念日', isPinned: 1 }),
    );
    expect(wrapper.emitted('saved')?.[0]).toEqual([
      { ...existing, title: '新纪念日' },
    ]);
    wrapper.vm.open();
    await flushPromises();
    expect(form.props('model').isPinned).toBe(0);
  });
  it('已有记录保存保留日期、原类型、备注、图标、主题与固定状态', async () => {
    const wrapper = mount(AnniversaryEditor);
    wrapper.vm.open(existing);
    await flushPromises();
    api.update.mockResolvedValue(existing);
    await wrapper.get('[data-footer-save]').trigger('click');
    await flushPromises();
    expect(api.update).toHaveBeenCalledWith(existing);
    expect(api.create).not.toHaveBeenCalled();
    expect(wrapper.emitted('saved')).toEqual([[existing]]);
  });
  it('删除使用字符串ID，成功后关闭并通知父页面', async () => {
    api.delete.mockResolvedValue(undefined);
    const wrapper = mount(AnniversaryEditor);
    wrapper.vm.open(existing);
    await flushPromises();
    await wrapper.get('[data-delete]').trigger('click');
    await flushPromises();
    expect(api.delete).toHaveBeenCalledWith([existing.id]);
    expect(wrapper.emitted('deleted')).toEqual([[existing.id]]);
    expect(wrapper.getComponent({ name: 'TestModal' }).props('open')).toBe(
      false,
    );
  });
});

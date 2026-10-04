import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GoalEditor from './GoalEditor.vue';

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
vi.mock('#/api/core/goal', () => ({
  createGoal: api.create,
  updateGoal: api.update,
  deleteGoals: api.delete,
}));
const existing = {
  id: '9007199254740993123',
  title: '季度目标',
  type: 4,
  status: 'in_progress' as const,
  progress: 0,
  targetValue: 24,
  currentValue: 7,
  startDate: '2026-01-12 12:34:56',
  endDate: '2026-08-19 13:20:00',
  description: '保持说明',
  tags: '["阅读","运动"]',
  isPinned: 1 as const,
};
describe('目标复用编辑器', () => {
  it('首页新增默认固定，业务页新增默认不固定，并发出服务端保存结果', async () => {
    const wrapper = mount(GoalEditor);
    wrapper.vm.open(undefined, true);
    await flushPromises();
    const form = wrapper.getComponent({ name: 'TestForm' });
    expect(form.props('model').isPinned).toBe(1);
    form.props('model').title = '首页新目标';
    api.create.mockResolvedValue({ ...existing, title: '首页新目标' });
    await wrapper.get('[data-save]').trigger('click');
    await flushPromises();
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: '首页新目标', isPinned: 1 }),
    );
    expect(wrapper.emitted('saved')?.[0]).toEqual([
      { ...existing, title: '首页新目标' },
    ]);
    wrapper.vm.open();
    await flushPromises();
    expect(form.props('model').isPinned).toBe(0);
  });
  it('编辑类型不同的已有目标保留日期、数值、标签和固定状态', async () => {
    const wrapper = mount(GoalEditor);
    wrapper.vm.open(existing);
    await flushPromises();
    api.update.mockResolvedValue(existing);
    await wrapper.get('[data-save]').trigger('click');
    await flushPromises();
    expect(api.update).toHaveBeenCalledWith(existing);
    expect(api.create).not.toHaveBeenCalled();
    expect(wrapper.emitted('saved')).toEqual([[existing]]);
  });
  it('删除使用字符串ID，成功后关闭并通知父页面', async () => {
    api.delete.mockResolvedValue(undefined);
    const wrapper = mount(GoalEditor);
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

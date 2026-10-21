import type { Slots } from 'vue';

import type { Detail, Task } from '#/api/core/todo';

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { h } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TaskDetailRow from './task-detail-row.vue';
import TaskEditModal from './task-edit-modal.vue';

const api = vi.hoisted(() => ({
  addTaskDetail: vi.fn(),
  deleteTaskDetail: vi.fn(),
  getTaskDetail: vi.fn(),
  reSortTaskDetail: vi.fn(),
  starTaskDetail: vi.fn(),
  unstarTaskDetail: vi.fn(),
  updateTask: vi.fn(),
  updateTaskDetail: vi.fn(),
}));
vi.mock('#/api/core/todo', () => api);
vi.mock('#/components/app-modal', () => ({
  AppModal: {
    name: 'TestAppModal',
    props: {
      open: Boolean,
      width: String,
      footer: Boolean,
      submitOnEnter: Boolean,
    },
    setup(props: { open: boolean }, { slots }: { slots: Slots }) {
      return () => (props.open ? h('div', slots.default?.()) : null);
    },
  },
}));
vi.mock('vuedraggable', () => ({
  default: {
    props: { modelValue: { type: Array, required: true } },
    setup(props: { modelValue: Detail[] }, { slots }: { slots: Slots }) {
      return () =>
        h(
          'div',
          props.modelValue.map((element: Detail) => slots.item?.({ element })),
        );
    },
  },
}));

const task: Task = {
  id: '9007199254740993101',
  columnId: '9007199254740993102',
  content: '任务 A',
};
const detail: Detail = {
  id: '9007199254740993103',
  taskId: task.id,
  content: '已有明细',
  priority: 20,
  isCompleted: 0,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
async function openEditor() {
  const wrapper = mount(TaskEditModal, {
    props: { open: true, task: { ...task }, columnTitle: '进行中' },
  });
  await flushPromises();
  return wrapper;
}
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.resetAllMocks();
  api.getTaskDetail.mockResolvedValue([]);
  api.updateTask.mockResolvedValue(true);
  api.updateTaskDetail.mockResolvedValue(true);
});

describe('任务明细编辑', () => {
  it('使用居中弹窗容器，明细回车不触发全局提交', async () => {
    const wrapper = await openEditor();
    const modal = wrapper.getComponent({ name: 'TestAppModal' });
    expect(modal.props('width')).toBe('min(760px, calc(100vw - 32px))');
    expect(modal.props('footer')).toBe(false);
    expect(modal.props('submitOnEnter')).toBe(false);
    await wrapper.get('[aria-label="关闭任务详情"]').trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('按钮和回车连续新增，保存中去重，保留字符串 ID 并局部更新计数', async () => {
    const request = deferred<Detail>();
    api.addTaskDetail
      .mockReturnValueOnce(request.promise)
      .mockResolvedValueOnce({
        ...detail,
        id: '9007199254740993104',
        content: '第二条',
      });
    const wrapper = await openEditor();
    await wrapper.get('[aria-label="新增明细"]').setValue(' 第一条 ');
    await wrapper.get('[aria-label="添加明细"]').trigger('click');
    await wrapper
      .get('[aria-label="新增明细"]')
      .trigger('keydown', { key: 'Enter' });
    expect(api.addTaskDetail).toHaveBeenCalledTimes(1);
    expect(api.addTaskDetail).toHaveBeenCalledWith({
      content: '第一条',
      taskId: task.id,
      isCompleted: 0,
      priority: 20,
    });
    expect(
      wrapper.get('[aria-label="添加明细"]').attributes('disabled'),
    ).toBeDefined();
    request.resolve({ ...detail, content: '第一条' });
    await flushPromises();
    expect(
      (wrapper.get('[aria-label="新增明细"]').element as HTMLTextAreaElement)
        .value,
    ).toBe('');
    await wrapper.get('[aria-label="新增明细"]').setValue('第二条');
    await wrapper
      .get('[aria-label="新增明细"]')
      .trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(wrapper.findAllComponents(TaskDetailRow)).toHaveLength(2);
    expect(wrapper.emitted('updated')?.at(-1)).toEqual([
      { id: task.id, unCompletedCount: 2 },
    ]);
    expect(api.getTaskDetail).toHaveBeenCalledTimes(1);
  });

  it('中文输入法确认和换行不提交，失败保留草稿后可以重试', async () => {
    api.addTaskDetail
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(detail);
    const wrapper = await openEditor();
    const input = wrapper.get('[aria-label="新增明细"]');
    await input.setValue('保留这条');
    await input.trigger('keydown', { key: 'Enter', isComposing: true });
    await input.trigger('keydown', { key: 'Enter', keyCode: 229 });
    await input.trigger('keydown', { key: 'Enter', shiftKey: true });
    await input.trigger('keydown', { key: 'Enter', repeat: true });
    expect(api.addTaskDetail).not.toHaveBeenCalled();
    await input.trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect((input.element as HTMLTextAreaElement).value).toBe('保留这条');
    await wrapper.get('[aria-label="添加明细"]').trigger('click');
    await flushPromises();
    expect(api.addTaskDetail).toHaveBeenCalledTimes(2);
  });

  it('旧任务加载响应与新增响应不会污染新任务，切回时保留未提交草稿', async () => {
    const oldLoad = deferred<Detail[]>();
    api.getTaskDetail
      .mockReturnValueOnce(oldLoad.promise)
      .mockResolvedValue([]);
    const wrapper = mount(TaskEditModal, {
      props: { open: true, task: { ...task } },
    });
    const otherTask = { ...task, id: '9007199254740993201', content: '任务 B' };
    await wrapper.setProps({ task: otherTask });
    await flushPromises();
    oldLoad.resolve([detail]);
    await flushPromises();
    expect(wrapper.findAllComponents(TaskDetailRow)).toHaveLength(0);
    await wrapper.get('[aria-label="新增明细"]').setValue('B 草稿');
    await wrapper.setProps({ task: { ...task } });
    await flushPromises();
    const creating = deferred<Detail>();
    api.addTaskDetail.mockReturnValueOnce(creating.promise);
    await wrapper.get('[aria-label="新增明细"]').setValue('A 新明细');
    await wrapper.get('[aria-label="添加明细"]').trigger('click');
    await wrapper.setProps({ task: otherTask });
    await flushPromises();
    creating.resolve(detail);
    await flushPromises();
    expect(wrapper.findAllComponents(TaskDetailRow)).toHaveLength(0);
    expect(
      (wrapper.get('[aria-label="新增明细"]').element as HTMLTextAreaElement)
        .value,
    ).toBe('B 草稿');
    expect(wrapper.emitted('updated')?.at(-1)).toEqual([
      { id: task.id, unCompletedCount: 1 },
    ]);
  });

  it('加载失败可原地重试，恢复后才允许新增', async () => {
    api.getTaskDetail
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([detail]);
    const wrapper = await openEditor();
    expect(wrapper.text()).toContain('明细加载失败');
    expect(
      wrapper.get('[aria-label="新增明细"]').attributes('disabled'),
    ).toBeDefined();
    await wrapper.get('[aria-label="重新加载明细"]').trigger('click');
    await flushPromises();
    expect(wrapper.findAllComponents(TaskDetailRow)).toHaveLength(1);
    expect(
      wrapper.get('[aria-label="新增明细"]').attributes('disabled'),
    ).toBeUndefined();
  });

  it('编辑明细保存真实内容，完成失败回滚，成功后可展开并恢复', async () => {
    api.getTaskDetail.mockResolvedValue([{ ...detail }]);
    const wrapper = await openEditor();
    const row = wrapper.getComponent(TaskDetailRow);
    await row.get('[aria-label="明细内容"]').setValue('修改后的长明细\n第二行');
    await row.get('[aria-label="明细内容"]').trigger('blur');
    await flushPromises();
    expect(api.updateTaskDetail).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: detail.id,
        content: '修改后的长明细\n第二行',
      }),
    );
    api.updateTaskDetail.mockRejectedValueOnce(new Error('network'));
    await row.get('input[type="checkbox"]').setValue(true);
    await flushPromises();
    expect(
      wrapper.getComponent(TaskDetailRow).props('detail').isCompleted,
    ).toBe(0);
    expect(wrapper.text()).toContain('修改未保存');
    await wrapper
      .getComponent(TaskDetailRow)
      .get('input[type="checkbox"]')
      .setValue(true);
    await flushPromises();
    expect(wrapper.text()).toContain('全部完成');
    expect(wrapper.findAllComponents(TaskDetailRow)).toHaveLength(0);
    await wrapper.get('.completed-toggle').trigger('click');
    await wrapper
      .getComponent(TaskDetailRow)
      .get('input[type="checkbox"]')
      .setValue(false);
    await flushPromises();
    expect(
      wrapper.getComponent(TaskDetailRow).props('detail').isCompleted,
    ).toBe(0);
    expect(wrapper.emitted('updated')?.at(-1)).toEqual([
      { id: task.id, unCompletedCount: 1 },
    ]);
  });

  it('连续编辑按顺序保存，空标题不发请求，关闭后仍完成已发起的保存', async () => {
    const first = deferred<boolean>();
    api.updateTask.mockReturnValueOnce(first.promise).mockResolvedValue(true);
    const wrapper = await openEditor();
    const title = wrapper.get('[aria-label="任务标题"]');
    await title.setValue('第一次修改');
    await title.trigger('blur');
    await title.setValue('第二次修改');
    await title.trigger('blur');
    expect(api.updateTask).toHaveBeenCalledTimes(1);
    first.resolve(true);
    await flushPromises();
    expect(
      api.updateTask.mock.calls.map(([payload]) => payload.content),
    ).toEqual(['第一次修改', '第二次修改']);
    await title.setValue('  ');
    await title.trigger('blur');
    expect(api.updateTask).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('任务标题不能为空');
    await title.setValue('最后修改');
    await title.trigger('blur');
    await wrapper.setProps({ open: false });
    await flushPromises();
    expect(wrapper.emitted('updated')?.at(-1)?.[0]).toEqual(
      expect.objectContaining({ id: task.id, content: '最后修改' }),
    );
  });
});

import { flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TimeSlotEditForm from './TimeSlotEditForm.vue';
import TimeTrackerModal from './TimeTrackerModal.vue';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  update: vi.fn(),
  recommendNext: vi.fn(),
  query: vi.fn(),
  getById: vi.fn(),
  info: vi.fn(),
  loading: vi.fn(),
  hideLoading: vi.fn(),
}));

vi.mock('#/api/core/time-tracker', () => ({
  recommendNext: mocks.recommendNext,
  query: mocks.query,
  getById: mocks.getById,
  deleteData: vi.fn(),
  save: mocks.save,
  update: mocks.update,
}));

vi.mock('#/api/core/time-tracker-category', () => ({
  listCategories: async () => [],
}));

vi.mock('ant-design-vue', () => ({
  message: { info: mocks.info, loading: mocks.loading },
  Modal: {
    props: ['open'],
    template: '<div v-if="open" data-test="modal"><slot /></div>',
  },
  Spin: { template: '<div><slot /></div>' },
}));

vi.mock('./TimeSlotEditForm.vue', () => ({
  default: { props: ['slot'], template: '<div data-test="editor" />' },
}));

function recommendation(startTime: number, endTime: number) {
  return {
    id: '',
    date: '2026-09-12',
    categoryId: 'read',
    startTime,
    endTime,
  };
}

describe('新增时迹前检查当天剩余时间', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loading.mockReturnValue(mocks.hideLoading);
    mocks.query.mockResolvedValue({ items: [], total: 0 });
    mocks.getById.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('满日仅提示，等待检查结果时也不创建编辑弹窗', async () => {
    const result = {
      recommend: null,
      records: [{ startTime: 0, endTime: 1439 }],
    };
    let resolve!: (value: typeof result) => void;
    mocks.recommendNext.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const wrapper = mount(TimeTrackerModal);

    const opening = wrapper.vm.open(undefined, '2026-09-12');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="modal"]').exists()).toBe(false);
    expect(wrapper.findComponent(TimeSlotEditForm).exists()).toBe(false);
    expect(mocks.loading).toHaveBeenCalled();

    await wrapper.vm.open(undefined, '2026-09-12');
    expect(mocks.recommendNext).toHaveBeenCalledTimes(1);
    resolve(result);
    await opening;
    await wrapper.vm.$nextTick();
    expect(mocks.info).toHaveBeenCalledWith('当天已记满，没有可添加的时间段');
    expect(mocks.hideLoading).toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
    expect(wrapper.findComponent(TimeSlotEditForm).exists()).toBe(false);
    expect(wrapper.find('[data-test="modal"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it.each([1439, 719])('只剩第 %i 分钟时仍允许新增', async (minute) => {
    mocks.recommendNext.mockResolvedValue({
      recommend: recommendation(minute, minute),
      records: [],
    });
    const wrapper = mount(TimeTrackerModal);
    await wrapper.vm.open(undefined, '2026-09-12');
    await wrapper.vm.$nextTick();
    expect(mocks.recommendNext).toHaveBeenCalledWith({ date: '2026-09-12' });
    expect(wrapper.find('[data-test="modal"]').exists()).toBe(true);
    expect(wrapper.findComponent(TimeSlotEditForm).props('slot')).toMatchObject(
      { startTime: minute, endTime: minute },
    );
    expect(mocks.info).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('普通空闲区间检查完成后打开预填的新增表单', async () => {
    mocks.recommendNext.mockResolvedValue({
      recommend: recommendation(540, 569),
      records: [],
    });
    const wrapper = mount(TimeTrackerModal);
    await wrapper.vm.open(undefined, '2026-09-12', []);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(TimeSlotEditForm).props('slot')).toMatchObject(
      { startTime: 540, endTime: 569 },
    );
    expect(mocks.query).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('检查失败保持弹窗关闭，并允许再次点击重试', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.recommendNext.mockRejectedValueOnce(new Error('network'));
    const wrapper = mount(TimeTrackerModal);
    await wrapper.vm.open(undefined, '2026-09-12');
    expect(wrapper.findComponent(TimeSlotEditForm).exists()).toBe(false);
    expect(mocks.hideLoading).toHaveBeenCalled();
    expect(mocks.info).not.toHaveBeenCalled();

    mocks.recommendNext.mockResolvedValue({
      recommend: recommendation(0, 29),
      records: [],
    });
    await wrapper.vm.open(undefined, '2026-09-12');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(TimeSlotEditForm).exists()).toBe(true);
    wrapper.unmount();
  });

  it('全天已满仍可编辑已有记录', async () => {
    const record = { ...recommendation(0, 1439), id: 'existing' };
    const wrapper = mount(TimeTrackerModal);
    await wrapper.vm.open(record, undefined, [record]);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(TimeSlotEditForm).props('slot')).toMatchObject(
      record,
    );
    expect(mocks.recommendNext).not.toHaveBeenCalled();
    expect(mocks.info).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});

describe('时迹服务端 ID', () => {
  it('新增不发送临时 ID，成功事件使用后端返回的 ID', async () => {
    mocks.query.mockResolvedValue({ items: [], total: 0 });
    mocks.recommendNext.mockResolvedValue({
      recommend: recommendation(540, 569),
    });
    mocks.save.mockResolvedValue('2099999999999999999');
    const wrapper = mount(TimeTrackerModal);
    await wrapper.vm.open(undefined, '2026-09-12', []);
    const editor = wrapper.findComponent(TimeSlotEditForm);
    expect(editor.props('slot').id).toBe('');
    editor.vm.$emit('save', {
      ...recommendation(540, 569),
      id: 'client-id',
      title: '',
    });
    await flushPromises();
    expect(mocks.save.mock.calls.at(-1)?.[0]).not.toHaveProperty('id');
    expect(wrapper.emitted('success')?.[0]?.[0]).toMatchObject({
      action: 'add',
      slot: { id: '2099999999999999999' },
    });
    wrapper.unmount();
  });
  it('编辑保留历史 ID，保存失败不发出成功事件', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const record = { ...recommendation(540, 569), id: 'legacy-id' };
    mocks.getById.mockResolvedValue(record);
    mocks.update.mockRejectedValueOnce(new Error('network'));
    const wrapper = mount(TimeTrackerModal);
    await wrapper.vm.open(record, undefined, [record]);
    wrapper
      .findComponent(TimeSlotEditForm)
      .vm.$emit('save', { ...record, title: '' });
    await flushPromises();
    expect(mocks.update.mock.calls.at(-1)?.[0].id).toBe('legacy-id');
    expect(wrapper.emitted('success')).toBeUndefined();
    expect(wrapper.find('[data-test="modal"]').exists()).toBe(true);
    wrapper.unmount();
    vi.restoreAllMocks();
  });
});

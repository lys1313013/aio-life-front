import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import MemoEditorModal from './MemoEditorModal.vue';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
}));
vi.mock('#/api/core/memo', () => ({
  createMemoApi: mocks.create,
  getMemoApi: mocks.get,
  updateMemoApi: mocks.update,
}));
vi.mock('@vben/preferences', () => ({
  usePreferences: () => ({ isMobile: { value: false } }),
}));
vi.mock('#/components/app-modal', () => ({
  AppModal: {
    props: ['open', 'okButtonProps', 'confirmLoading'],
    emits: ['ok', 'update:open'],
    template: `<section v-if="open"><slot /><slot name="footer-leading" /><button data-save :disabled="okButtonProps?.disabled || confirmLoading" @click="$emit('ok')">保存</button></section>`,
  },
}));
vi.mock('#/components/ContentLoading.vue', () => ({
  default: { template: '<div data-loading />' },
}));
enableAutoUnmount(afterEach);
beforeEach(() => vi.clearAllMocks());

const memo = {
  id: '9007199254740993',
  title: '隐藏笔记',
  content: '完整正文',
  hiddenContent: true,
  createTime: '2026-10-20 12:00:00',
  updateTime: '2026-10-22 12:00:00',
};

it('摘要入口先加载详情，保存保持隐藏正文状态和字符串 ID', async () => {
  let resolve!: (value: typeof memo) => void;
  mocks.get.mockImplementationOnce(() => new Promise((ok) => (resolve = ok)));
  const wrapper = mount(MemoEditorModal, {
    props: { open: true, memoId: memo.id },
  });
  expect(wrapper.find('[data-loading]').exists()).toBe(true);
  expect(wrapper.get('[data-save]').attributes('disabled')).toBeDefined();
  resolve(memo);
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('完整正文');
  await wrapper.get('[data-save]').trigger('click');
  await flushPromises();
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({
      id: memo.id,
      content: '完整正文',
      hiddenContent: true,
    }),
  );
  expect(wrapper.emitted('saved')).toHaveLength(1);
});

it('切换笔记后旧详情返回不会覆盖新笔记', async () => {
  let resolve!: (value: typeof memo) => void;
  mocks.get.mockImplementationOnce(() => new Promise((ok) => (resolve = ok)));
  mocks.get.mockResolvedValueOnce({
    ...memo,
    id: '9007199254740995',
    content: '新笔记正文',
  });
  const wrapper = mount(MemoEditorModal, {
    props: { open: true, memoId: memo.id },
  });
  await wrapper.setProps({ memoId: '9007199254740995' });
  await flushPromises();
  resolve(memo);
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('新笔记正文');
});

it('详情失败禁止空内容覆盖，可重试后编辑', async () => {
  mocks.get
    .mockRejectedValueOnce(new Error('failed'))
    .mockResolvedValueOnce(memo);
  const wrapper = mount(MemoEditorModal, {
    props: { open: true, memoId: memo.id },
  });
  await flushPromises();
  expect(wrapper.get('[data-save]').attributes('disabled')).toBeDefined();
  expect(wrapper.find('textarea').exists()).toBe(false);
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(wrapper.get('textarea').element.value).toBe('完整正文');
  expect(mocks.update).not.toHaveBeenCalled();
});

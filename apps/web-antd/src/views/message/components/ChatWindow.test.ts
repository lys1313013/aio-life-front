import type { Message } from '#/api/core/message';

import { enableAutoUnmount, mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ChatWindow from './ChatWindow.vue';

vi.mock('@vben/utils', () => ({
  formatDate: (value: string) => value,
  formatDateTime: () => '',
}));
vi.mock('@ant-design/icons-vue', () => ({
  ArrowLeftOutlined: { template: '<span />' },
}));
vi.mock('ant-design-vue', () => ({
  Avatar: { template: '<span><slot /></span>' },
  Button: { template: '<button><slot /></button>' },
  Input: { TextArea: { template: '<textarea />' } },
  message: { success: vi.fn() },
}));
vi.mock('#/api/core/message', () => ({ deleteMessageApi: vi.fn() }));
vi.mock('#/components/app-modal', () => ({
  AppModal: { template: '<div />' },
}));

enableAutoUnmount(afterEach);
beforeEach(() => {
  // happy-dom 没有布局引擎，按已渲染的消息模拟滚动高度。
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      return this.querySelectorAll('.space-y-6 > div').length * 100;
    },
  );
});
afterEach(() => vi.restoreAllMocks());

function messages(count: number, senderId = '9007199254740993'): Message[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${senderId}-${index}`,
    senderId,
    receiverId: '9007199254740995',
    title: '',
    content: `消息 ${index}`,
    type: 1,
    isRead: true,
    createTime: '2026-10-14T10:00:00',
  }));
}

function mountChat(rows: Message[], loading = false) {
  const wrapper = mount(ChatWindow, {
    props: {
      messages: rows,
      myId: '9007199254740995',
      targetId: '9007199254740993',
      loading,
    },
  });
  const list = wrapper.get('.overflow-y-auto').element as HTMLElement;
  return { wrapper, list };
}

describe('聊天记录初始定位', () => {
  it('首次打开已加载的会话直接显示最新消息', async () => {
    const { list } = mountChat(messages(20));
    await nextTick();
    expect(list.scrollTop).toBe(2000);
  });

  it('消息先返回、loading 后结束时，等待消息实际渲染再滚动', async () => {
    const { wrapper, list } = mountChat([], true);
    await wrapper.setProps({ messages: messages(20) });
    expect(list.scrollTop).toBe(0);
    expect(list.scrollHeight).toBe(0);

    await wrapper.setProps({ loading: false });
    expect(list.scrollTop).toBe(2000);
  });

  it('切换同样消息数量的会话后重新定位到底部', async () => {
    const { wrapper, list } = mountChat(messages(20));
    await nextTick();
    list.scrollTop = 100;
    await wrapper.setProps({
      targetId: '9007199254740997',
      messages: messages(20, '9007199254740997'),
    });
    expect(list.scrollTop).toBe(2000);
  });

  it('发送后追加消息，按更新后的内容高度滚动', async () => {
    const { wrapper, list } = mountChat(messages(20));
    await nextTick();
    await wrapper.setProps({ messages: messages(21) });
    expect(list.scrollTop).toBe(2100);
  });

  it('空会话加载结束后保持空态', async () => {
    const { wrapper, list } = mountChat([], true);
    await wrapper.setProps({ loading: false });
    expect(wrapper.text()).toContain('暂无消息');
    expect(list.scrollTop).toBe(0);
  });
});

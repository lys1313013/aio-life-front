import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MessagePage from './index.vue';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  getMessages: vi.fn(),
  getUser: vi.fn(),
  isMobile: { value: false },
  markRead: vi.fn(),
  push: vi.fn(),
  query: {} as Record<string, string>,
  remove: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mocks.query }),
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
}));
vi.mock('@vben/preferences', () => ({
  usePreferences: () => ({ isMobile: mocks.isMobile }),
}));
vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { userId: '1' } }),
}));
vi.mock('ant-design-vue', () => ({
  message: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('#/api/core/message', () => ({
  createMessageApi: mocks.create,
  deleteMessageApi: mocks.remove,
  getMessageListApi: mocks.getMessages,
  markAsReadApi: mocks.markRead,
}));
vi.mock('#/api/core/user', () => ({ getUserBasicInfoApi: mocks.getUser }));
vi.mock('./components/ConversationList.vue', () => ({
  default: {
    name: 'ConversationList',
    props: ['conversations', 'selectedUserId'],
    emits: ['select', 'delete'],
    template: '<div data-testid="conversations" />',
  },
}));
vi.mock('./components/ChatWindow.vue', () => ({
  default: {
    name: 'ChatWindow',
    props: ['messages', 'targetId', 'sending'],
    emits: ['send', 'delete', 'back'],
    template: '<div data-testid="chat" />',
  },
}));

enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query = {};
  mocks.isMobile.value = false;
  mocks.getMessages.mockResolvedValue([
    {
      id: '10',
      senderId: '2',
      receiverId: '1',
      content: '你好',
      isRead: false,
      createTime: '2026-10-04T10:00:00',
    },
  ]);
  mocks.getUser.mockResolvedValue({ nickname: '好友', avatar: '' });
  mocks.markRead.mockResolvedValue(undefined);
});

describe('普通消息中心', () => {
  it.each([false, true])(
    '旧 AI 会话链接仍显示私信列表（移动端：%s）',
    async (mobile) => {
      mocks.isMobile.value = mobile;
      mocks.query = { conversationId: 'old-session' };
      const wrapper = mount(MessagePage);
      await flushPromises();

      const list = wrapper.findComponent({ name: 'ConversationList' });
      expect(list.props('conversations')).toEqual([
        expect.objectContaining({
          userId: '2',
          username: '好友',
          unreadCount: 1,
        }),
      ]);
      expect(wrapper.findComponent({ name: 'ChatWindow' }).exists()).toBe(
        false,
      );
      list.vm.$emit('select', '2');
      expect(mocks.push).toHaveBeenCalledWith({
        query: { conversationId: undefined, userId: '2' },
      });
    },
  );

  it('移动端私信支持已读、发送和返回列表', async () => {
    mocks.isMobile.value = true;
    mocks.query = { userId: '2' };
    mocks.create.mockResolvedValue({
      id: '11',
      senderId: '1',
      receiverId: '2',
      content: '收到',
      isRead: true,
      createTime: '2026-10-04T10:01:00',
    });
    const wrapper = mount(MessagePage);
    await flushPromises();

    expect(wrapper.findComponent({ name: 'ConversationList' }).exists()).toBe(
      false,
    );
    expect(mocks.markRead).toHaveBeenCalledWith('10');
    const chat = wrapper.findComponent({ name: 'ChatWindow' });
    chat.vm.$emit('send', '收到');
    await flushPromises();
    expect(mocks.create).toHaveBeenCalledWith({
      receiverId: '2',
      content: '收到',
      title: 'Chat Message',
      type: 1,
    });
    expect(chat.props('messages')).toHaveLength(2);
    expect(chat.props('sending')).toBe(false);

    chat.vm.$emit('back');
    expect(mocks.push).toHaveBeenCalledWith({
      query: { userId: undefined, conversationId: undefined },
    });
  });
});

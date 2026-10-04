<script setup lang="ts">
import type { Message } from '#/api/core/message';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePreferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { message as antMessage } from 'ant-design-vue';

import {
  createMessageApi,
  deleteMessageApi,
  getMessageListApi,
  markAsReadApi,
} from '#/api/core/message';
import { getUserBasicInfoApi } from '#/api/core/user';

import ChatWindow from './components/ChatWindow.vue';
import ConversationList from './components/ConversationList.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { isMobile } = usePreferences();

const messages = ref<Message[]>([]);
const loading = ref(false);
const sendingMessage = ref(false);
const tempConversation = ref<any>(null);

// Current user ID
const myId = computed(() => {
  const info = userStore.userInfo as any;
  return String(info?.userId || info?.id || '');
});

// Selected conversation user ID
const selectedUserId = computed(() => {
  const id = route.query.userId;
  return id ? String(id) : undefined;
});

// Mark conversation as read
const markConversationAsRead = async (senderId: string) => {
  if (!myId.value) return;

  const unreadMessages = messages.value.filter(
    (m) =>
      String(m.senderId) === senderId &&
      String(m.receiverId) === myId.value &&
      !m.isRead,
  );

  if (unreadMessages.length > 0) {
    try {
      await Promise.all(unreadMessages.map((msg) => markAsReadApi(msg.id)));
      unreadMessages.forEach((msg) => (msg.isRead = true));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }
};

const checkUser = async (userId: string) => {
  const existing = messages.value.some(
    (m) => String(m.senderId) === userId || String(m.receiverId) === userId,
  );

  if (existing) {
    tempConversation.value = null;
    return;
  }

  if (userCache.value.has(userId)) {
    const info = userCache.value.get(userId);
    tempConversation.value = {
      userId,
      username: info?.nickname || `User ${userId}`,
      avatar: info?.avatar,
      lastMessage: '',
      time: new Date().toISOString(),
      unreadCount: 0,
    };
    return;
  }

  try {
    const info = await getUserBasicInfoApi(userId);
    if (info) {
      userCache.value.set(userId, {
        nickname: info.nickname,
        avatar: info.avatar,
      });
      tempConversation.value = {
        userId,
        username: info.nickname || `User ${userId}`,
        avatar: info.avatar,
        lastMessage: '',
        time: new Date().toISOString(),
        unreadCount: 0,
      };
    } else {
      throw new Error('User not found');
    }
  } catch {
    antMessage.error('用户不存在');
    router.replace({ query: { ...route.query, userId: undefined } });
    tempConversation.value = null;
  }
};

const fetchMessages = async () => {
  try {
    loading.value = true;
    messages.value = await getMessageListApi();
    if (selectedUserId.value) {
      await markConversationAsRead(selectedUserId.value);
      await checkUser(selectedUserId.value);
    }
  } finally {
    loading.value = false;
  }
};

const userCache = ref(new Map<string, { avatar: string; nickname: string }>());
const fetchingUserIds = new Set<string>();

const conversationCache = new Map<string, any>();

const fetchUserInfo = async (userId: string) => {
  if (userCache.value.has(userId) || fetchingUserIds.has(userId)) {
    return;
  }

  fetchingUserIds.add(userId);
  try {
    const info = await getUserBasicInfoApi(userId);
    const data = {
      nickname: info.nickname || `User ${userId}`,
      avatar: info.avatar || '',
    };
    userCache.value.set(userId, data);
  } catch {
    userCache.value.set(userId, { nickname: `User ${userId}`, avatar: '' });
  } finally {
    fetchingUserIds.delete(userId);
  }
};

const conversations = computed(() => {
  const groups = new Map<string, Message[]>();

  messages.value.forEach((msg) => {
    const otherId =
      String(msg.senderId) === String(myId.value)
        ? String(msg.receiverId)
        : String(msg.senderId);
    if (!groups.has(otherId)) {
      groups.set(otherId, []);
    }
    groups.get(otherId)?.push(msg);
  });

  const list = [...groups.entries()]
    .map(([userId, msgs]) => {
      msgs.sort(
        (a, b) =>
          new Date(b.createTime).getTime() - new Date(a.createTime).getTime(),
      );
      const lastMsg = msgs[0];

      if (!lastMsg) {
        return null;
      }

      const unreadCount = msgs.filter(
        (m) => String(m.receiverId) === String(myId.value) && !m.isRead,
      ).length;

      const userInfo = userCache.value.get(userId);

      const username = userInfo?.nickname || `User ${userId}`;
      const avatar = userInfo?.avatar;
      const lastMessage = lastMsg.content;
      const time = lastMsg.createTime;

      const cached = conversationCache.get(userId);
      if (
        cached &&
        cached.username === username &&
        cached.avatar === avatar &&
        cached.lastMessage === lastMessage &&
        cached.time === time &&
        cached.unreadCount === unreadCount
      ) {
        return cached;
      }

      const newConversation = {
        userId,
        username,
        avatar,
        lastMessage,
        time,
        unreadCount,
      };
      conversationCache.set(userId, newConversation);
      return newConversation;
    })
    .filter((item) => item !== null);

  if (
    tempConversation.value &&
    !list.some((c) => c?.userId === tempConversation.value.userId)
  ) {
    list.push(tempConversation.value);
  }

  return list.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
});

watch(
  () => conversations.value,
  (newConversations) => {
    newConversations.forEach((c) => {
      if (!userCache.value.has(c.userId)) {
        fetchUserInfo(c.userId);
      }
    });
  },
  { immediate: true, deep: true },
);

const currentChatMessages = computed(() => {
  if (!selectedUserId.value) return [];
  return messages.value
    .filter(
      (m) =>
        (String(m.senderId) === String(myId.value) &&
          String(m.receiverId) === String(selectedUserId.value)) ||
        (String(m.senderId) === String(selectedUserId.value) &&
          String(m.receiverId) === String(myId.value)),
    )
    .sort(
      (a, b) =>
        new Date(a.createTime).getTime() - new Date(b.createTime).getTime(),
    );
});

const handleSelectConversation = (userId: string) => {
  router.push({ query: { ...route.query, userId, conversationId: undefined } });
};

const handleBack = () => {
  router.push({
    query: { ...route.query, userId: undefined, conversationId: undefined },
  });
};

watch(
  () => selectedUserId.value,
  async (newId) => {
    if (newId) {
      await markConversationAsRead(newId);
      await checkUser(newId);
    }
  },
);

const handleSendMessage = async (content: string) => {
  if (!selectedUserId.value) return;

  try {
    sendingMessage.value = true;
    const newMessages = await createMessageApi({
      receiverId: selectedUserId.value,
      content,
      title: 'Chat Message',
      type: 1,
    });

    if (newMessages) {
      if (Array.isArray(newMessages)) {
        messages.value.push(...newMessages);
      } else {
        messages.value.push(newMessages);
      }
      tempConversation.value = null;
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  } finally {
    sendingMessage.value = false;
  }
};

const handleDeleteMessage = (id: string) => {
  messages.value = messages.value.filter((m) => m.id !== id);
};

const handleDeleteConversation = async (userId: string) => {
  const conversationMessages = messages.value.filter(
    (m) => String(m.senderId) === userId || String(m.receiverId) === userId,
  );

  try {
    loading.value = true;
    await Promise.all(
      conversationMessages.map((msg) => deleteMessageApi(msg.id)),
    );
    messages.value = messages.value.filter(
      (m) => String(m.senderId) !== userId && String(m.receiverId) !== userId,
    );
    if (selectedUserId.value === userId) {
      handleBack();
    }
    antMessage.success('会话已删除');
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    antMessage.error('删除会话失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchMessages();
});
</script>

<template>
  <div
    :class="[
      isMobile ? 'h-[calc(100vh-48px)] p-0' : 'h-[calc(100vh-100px)] p-4',
    ]"
  >
    <div
      class="flex h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      :class="{ 'rounded-none border-0': isMobile }"
    >
      <div
        v-if="!isMobile || !selectedUserId"
        class="flex flex-col border-r border-border bg-card"
        :class="isMobile ? 'w-full flex-1' : 'w-72'"
      >
        <ConversationList
          :conversations="conversations"
          :selected-user-id="selectedUserId"
          @select="handleSelectConversation"
          @delete="handleDeleteConversation"
        />
      </div>
      <div
        v-if="!isMobile || selectedUserId"
        class="flex min-h-0 flex-1 flex-col bg-card"
      >
        <ChatWindow
          v-if="selectedUserId"
          :messages="currentChatMessages"
          :target-id="selectedUserId"
          :target-name="
            userCache.get(selectedUserId)?.nickname || `User ${selectedUserId}`
          "
          :my-id="myId"
          :my-avatar="userStore.userInfo?.avatar"
          :loading="loading"
          :sending="sendingMessage"
          :is-mobile="isMobile"
          @send="handleSendMessage"
          @delete="handleDeleteMessage"
          @back="handleBack"
        />
        <div
          v-else
          class="flex h-full flex-col items-center justify-center bg-muted text-muted-foreground"
        >
          <div
            class="i-ant-design:message-outlined mb-4 text-6xl opacity-20"
          ></div>
          <p>选择一个会话开始聊天</p>
        </div>
      </div>
    </div>
  </div>
</template>

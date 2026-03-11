<script setup lang="ts">
import type { Message } from '#/api/core/message';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useUserStore } from '@vben/stores';

import {
  createMessageApi,
  getMessageListApi,
  markAsReadApi,
} from '#/api/core/message';

import { getUserBasicInfoApi } from '#/api/core/user';

import ChatWindow from './components/ChatWindow.vue';
import ConversationList from './components/ConversationList.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const messages = ref<Message[]>([]);
const loading = ref(false);
const activeMenu = ref('my-messages');

// Mock menu items
const menuItems = [
  { key: 'my-messages', label: '我的消息', icon: 'ant-design:message-outlined' },
];

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
      !m.isRead
  );

  if (unreadMessages.length > 0) {
    try {
      await Promise.all(unreadMessages.map((msg) => markAsReadApi(msg.id)));
      // Optimistically update local state
      unreadMessages.forEach(msg => msg.isRead = true);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }
};

// Fetch messages
const fetchMessages = async () => {
  try {
    loading.value = true;
    messages.value = await getMessageListApi();
    if (selectedUserId.value) {
      markConversationAsRead(selectedUserId.value);
    }
  } finally {
    loading.value = false;
  }
};

const userCache = ref(new Map<string, { nickname: string; avatar: string }>());

// Fetch user info helper
const getUserInfo = async (userId: string) => {
  if (userCache.value.has(userId)) {
    return userCache.value.get(userId);
  }
  try {
    const info = await getUserBasicInfoApi(userId);
    const data = {
      nickname: info.nickname || `User ${userId}`,
      avatar: info.avatar || '',
    };
    userCache.value.set(userId, data);
    return data;
  } catch (e) {
    return { nickname: `User ${userId}`, avatar: '' };
  }
};

// Group messages into conversations
const conversations = computed(() => {
  const groups = new Map<string, Message[]>();

  messages.value.forEach((msg) => {
    const otherId = String(msg.senderId) === String(myId.value) ? String(msg.receiverId) : String(msg.senderId);
    if (!groups.has(otherId)) {
      groups.set(otherId, []);
    }
    groups.get(otherId)?.push(msg);
  });

  const list = Array.from(groups.entries()).map(([userId, msgs]) => {
    // Sort messages by time desc to get the last one
    msgs.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
    const lastMsg = msgs[0];
    
    if (!lastMsg) {
      return null;
    }
    
    // Count unread
    const unreadCount = msgs.filter((m) => String(m.receiverId) === String(myId.value) && !m.isRead).length;

    // Trigger fetch user info if not in cache
    if (!userCache.value.has(userId)) {
      getUserInfo(userId);
    }
    const userInfo = userCache.value.get(userId);

    return {
      userId,
      username: userInfo?.nickname || `User ${userId}`,
      avatar: userInfo?.avatar,
      lastMessage: lastMsg.content,
      time: lastMsg.createTime,
      unreadCount,
    };
  }).filter((item) => item !== null);

  // Sort conversations by last message time
  return list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
});

// Current chat messages
const currentChatMessages = computed(() => {
  if (!selectedUserId.value) return [];
  return messages.value
    .filter(
      (m) =>
        (String(m.senderId) === String(myId.value) && String(m.receiverId) === String(selectedUserId.value)) ||
        (String(m.senderId) === String(selectedUserId.value) && String(m.receiverId) === String(myId.value)),
    )
    .sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());
});

// Handle conversation selection
const handleSelectConversation = (userId: string) => {
  router.push({ query: { ...route.query, userId } });
};

watch(
  () => selectedUserId.value,
  (newId) => {
    if (newId) {
      markConversationAsRead(newId);
    }
  },
  { immediate: true }
);

// Handle sending message
const handleSendMessage = async (content: string) => {
  if (!selectedUserId.value) return;

  try {
    const newMessages = await createMessageApi({
      receiverId: selectedUserId.value,
      content,
      title: 'Chat Message', // Optional title
      type: 1, // Assume 1 is chat
    });
    
    if (newMessages) {
      if (Array.isArray(newMessages)) {
        messages.value.push(...newMessages);
      } else {
        messages.value.push(newMessages);
      }
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};

// Initial fetch
onMounted(() => {
  fetchMessages();
});

// Poll for new messages (optional, or rely on websocket if available, but for now simple polling or manual refresh)
// For simplicity, just fetch on mount.
</script>

<template>
  <div class="h-[calc(100vh-100px)] p-4">
    <div class="flex h-full bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <!-- Left Sidebar: Menu -->
      <div class="w-48 bg-gray-50/50 border-r border-gray-100 flex flex-col py-2">
        <div class="px-4 py-3 font-bold text-lg text-gray-800 flex items-center gap-2">
           <span class="i-ant-design:message-filled text-blue-500"></span>
           消息中心
        </div>
        <div class="flex-1 space-y-1 px-2 mt-2">
          <div
            v-for="item in menuItems"
            :key="item.key"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm font-medium"
            :class="
              activeMenu === item.key
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            "
            @click="activeMenu = item.key"
          >
            <span :class="item.icon" class="text-lg"></span>
            {{ item.label }}
          </div>
        </div>
      </div>

      <!-- Middle Sidebar: Conversation List -->
      <div class="w-72 border-r border-gray-100 flex flex-col bg-white">
        <ConversationList
          :conversations="conversations"
          :selected-user-id="selectedUserId"
          @select="handleSelectConversation"
        />
      </div>

      <!-- Right Content: Chat Window -->
      <div class="flex-1 flex flex-col bg-white">
        <!-- Debug Info (Temporary) -->
        <div v-if="false" class="bg-yellow-100 p-2 text-xs">
          myId: {{ myId }} ({{ typeof myId }}) <br>
          selectedUserId: {{ selectedUserId }} ({{ typeof selectedUserId }}) <br>
          messages count: {{ messages.length }} <br>
          currentChatMessages count: {{ currentChatMessages.length }}
        </div>

        <ChatWindow
          v-if="selectedUserId"
          :messages="currentChatMessages"
          :target-id="selectedUserId"
          :target-name="userCache.get(selectedUserId)?.nickname || `User ${selectedUserId}`"
          :my-id="myId"
          :my-avatar="userStore.userInfo?.avatar"
          :loading="loading"
          @send="handleSendMessage"
        />
        <div v-else class="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50/30">
          <div class="i-ant-design:message-outlined text-6xl opacity-20 mb-4"></div>
          <p>选择一个会话开始聊天</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar styles if needed */
</style>

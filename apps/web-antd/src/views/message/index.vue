<script setup lang="ts">
import type { ChatMessage as AIChatMessage, ChatSession } from '#/api/core/llm';
import type { Message } from '#/api/core/message';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePreferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { message as antMessage } from 'ant-design-vue';
import { marked } from 'marked';

import {
  chatWithLLMApi,
  chatWithLLMStreamApi,
  createChatSessionApi,
  deleteChatSessionApi,
  getChatHistoryApi,
  getChatSessionsApi,
  summarizeTimeRecordsApi,
  updateChatSessionApi,
} from '#/api/core/llm';
import {
  createMessageApi,
  getMessageListApi,
  markAsReadApi,
} from '#/api/core/message';
import { getUserBasicInfoApi } from '#/api/core/user';

import ChatSessionList from './components/ChatSessionList.vue';
import ChatWindow from './components/ChatWindow.vue';
import ConversationList from './components/ConversationList.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { isMobile } = usePreferences();

const messages = ref<Message[]>([]);
const loading = ref(false);
const sendingMessage = ref(false);
const activeMenu = ref(route.query.conversationId ? 'ai-chat' : 'my-messages');
const tempConversation = ref<any>(null);

// Menu items
const menuItems = [
  {
    key: 'my-messages',
    label: '我的消息',
    icon: 'i-ant-design:message-outlined',
  },
  { key: 'ai-chat', label: 'AI 对话', icon: 'i-ant-design:robot-outlined' },
];

const handleMenuClick = (key: string) => {
  activeMenu.value = key;
  if (key === 'ai-chat') {
    // Keep conversationId if already in URL, otherwise clear userId
    router.push({ query: { ...route.query, userId: undefined } });
  } else {
    // Clear conversationId when switching back to messages
    router.push({ query: { ...route.query, conversationId: undefined } });
  }
};

// AI chat state
const isAIChat = computed(() => activeMenu.value === 'ai-chat');
const aiSessions = ref<ChatSession[]>([]);
const selectedConversationId = ref<string | undefined>(
  route.query.conversationId as string,
);
const aiChatMessages = ref<AIChatMessage[]>([]);
const aiChatLoading = ref(false);
const aiChatInput = ref('');
const aiChatContext = ref('');
const streamingContent = ref('');
const isStreaming = ref(false);
const summarizeLoading = ref(false);

const fetchAISessions = async () => {
  try {
    aiSessions.value = await getChatSessionsApi();
    if (
      aiSessions.value.length > 0 &&
      !selectedConversationId.value &&
      !isMobile.value
    ) {
      handleSelectSession(aiSessions.value[0]?.id as string);
    }
  } catch (error) {
    console.error('Failed to fetch AI sessions:', error);
  }
};

const handleSelectSession = (conversationId: string) => {
  router.push({ query: { ...route.query, conversationId, userId: undefined } });
};

const fetchAIChatHistory = async (conversationId: string) => {
  try {
    aiChatLoading.value = true;
    aiChatMessages.value = await getChatHistoryApi(conversationId);
    updateContext();
  } catch (error) {
    console.error('Failed to fetch AI chat history:', error);
  } finally {
    aiChatLoading.value = false;
  }
};

const handleCreateSession = async () => {
  try {
    const newSession = await createChatSessionApi('新会话');
    aiSessions.value.unshift(newSession);
    handleSelectSession(newSession.id);
  } catch (error) {
    console.error('Failed to create AI session:', error);
  }
};

const handleDeleteSession = async (conversationId: string) => {
  try {
    await deleteChatSessionApi(conversationId);
    aiSessions.value = aiSessions.value.filter((s) => s.id !== conversationId);
    if (selectedConversationId.value === conversationId) {
      if (aiSessions.value.length > 0) {
        handleSelectSession(aiSessions.value[0]?.id as string);
      } else {
        router.push({ query: { ...route.query, conversationId: undefined } });
      }
    }
  } catch (error) {
    console.error('Failed to delete AI session:', error);
  }
};

const handleUpdateSessionTitle = async (
  conversationId: string,
  title: string,
) => {
  try {
    await updateChatSessionApi(conversationId, title);
    const session = aiSessions.value.find((s) => s.id === conversationId);
    if (session) {
      session.title = title;
    }
  } catch (error) {
    console.error('Failed to update AI session title:', error);
  }
};

watch(
  activeMenu,
  (newMenu) => {
    if (newMenu === 'ai-chat') {
      fetchAISessions();
    }
  },
  { immediate: true },
);

watch(
  () => route.query.conversationId,
  async (newId) => {
    if (newId) {
      selectedConversationId.value = String(newId);
      activeMenu.value = 'ai-chat';
      await fetchAIChatHistory(String(newId));
    } else {
      selectedConversationId.value = undefined;
      aiChatMessages.value = [];
    }
  },
  { immediate: true },
);

watch(
  () => route.query.userId,
  (newUserId) => {
    if (newUserId) {
      activeMenu.value = 'my-messages';
    }
  },
);

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

const aiMessageRef = ref<Message | null>(null);

const handleAISendMessage = async () => {
  if (!aiChatInput.value.trim() || isStreaming.value) return;

  const content = aiChatInput.value.trim();
  aiChatInput.value = '';

  // If no session selected, create one first
  if (!selectedConversationId.value) {
    try {
      const newSession = await createChatSessionApi(
        content.slice(0, 20) || '新会话',
      );
      aiSessions.value.unshift(newSession);
      selectedConversationId.value = newSession.id;
      handleSelectSession(newSession.id);
    } catch (error) {
      console.error('Failed to create session:', error);
      antMessage.error('创建会话失败');
      return;
    }
  }

  const userMessage: AIChatMessage = {
    id: Date.now().toString(),
    userId: Number(myId.value),
    conversationId: selectedConversationId.value,
    role: 'user',
    content,
    modelName: '',
    createTime: new Date().toISOString(),
  };
  aiChatMessages.value.push(userMessage);

  const aiMessage: AIChatMessage = {
    id: (Date.now() + 1).toString(),
    userId: Number(myId.value),
    conversationId: selectedConversationId.value,
    role: 'assistant',
    content: '',
    modelName: '',
    createTime: new Date().toISOString(),
  };
  aiChatMessages.value.push(aiMessage);

  streamingContent.value = '';
  isStreaming.value = true;
  aiChatLoading.value = true;

  try {
    chatWithLLMStreamApi(
      content,
      aiChatContext.value,
      selectedConversationId.value,
      (token) => {
        streamingContent.value += token;
        const lastMsg = aiChatMessages.value[aiChatMessages.value.length - 1];
        if (lastMsg) {
          lastMsg.content = streamingContent.value;
        }
      },
      () => {
        isStreaming.value = false;
        aiChatLoading.value = false;
        updateContext();

        // Update session title if it's the first message
        const currentSession = aiSessions.value.find(
          (s) => s.id === selectedConversationId.value,
        );
        if (currentSession && currentSession.title === '新会话') {
          handleUpdateSessionTitle(currentSession.id, content.slice(0, 30));
        }
      },
      (error) => {
        console.error('Failed to send message to AI:', error);
        antMessage.error('发送消息失败，请检查大模型配置');
        const lastMsg = aiChatMessages.value[aiChatMessages.value.length - 1];
        if (lastMsg) {
          lastMsg.content = error;
        }
        isStreaming.value = false;
        aiChatLoading.value = false;
      },
    ).start();
  } catch (error) {
    console.error('Failed to send message to AI:', error);
    antMessage.error('发送消息失败，请检查大模型配置');
    isStreaming.value = false;
    aiChatLoading.value = false;
  }
};

const updateContext = () => {
  aiChatContext.value = aiChatMessages.value
    .slice(-10)
    .map((msg) => {
      return `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`;
    })
    .join('\n');
};

const handleSummarizeTimeRecords = async (type: 'today' | 'week') => {
  try {
    summarizeLoading.value = true;

    // If no session selected, create one first
    if (!selectedConversationId.value) {
      const newSession = await createChatSessionApi(
        `${type === 'today' ? '今日' : '本周'}时迹总结`,
      );
      aiSessions.value.unshift(newSession);
      selectedConversationId.value = newSession.id;
      handleSelectSession(newSession.id);
    }

    const summary = await summarizeTimeRecordsApi(type);

    const summaryMessage: AIChatMessage = {
      id: Date.now().toString(),
      userId: Number(myId.value),
      conversationId: selectedConversationId.value,
      role: 'assistant',
      content: summary,
      modelName: 'AI Summary',
      createTime: new Date().toISOString(),
    };
    aiChatMessages.value.push(summaryMessage);

    // Also save this summary to the database as a message
    await chatWithLLMApi(
      `请记录以下总结：\n${summary}`,
      undefined,
      selectedConversationId.value,
    );
  } catch (error) {
    console.error('Failed to summarize time records:', error);
    antMessage.error('总结时迹记录失败，请检查大模型配置');
  } finally {
    summarizeLoading.value = false;
  }
};

const renderMarkdown = (content: string) => {
  return marked.parse(content, {
    breaks: true,
    gfm: true,
  }) as string;
};

const chatMessagesContainer = ref<HTMLElement | null>(null);

watch(
  aiChatMessages,
  async () => {
    await nextTick();
    if (chatMessagesContainer.value) {
      chatMessagesContainer.value.scrollTop =
        chatMessagesContainer.value.scrollHeight;
    }
  },
  { deep: true },
);

// Context Menu for AI Messages
const aiMessageContextMenuVisible = ref(false);
const aiMessageContextMenuPosition = ref({ x: 0, y: 0 });
const selectedAiMessage = ref<AIChatMessage | null>(null);

const handleAiMessageContextMenu = (e: MouseEvent, msg: AIChatMessage) => {
  e.preventDefault();
  selectedAiMessage.value = msg;
  aiMessageContextMenuPosition.value = { x: e.clientX, y: e.clientY };
  aiMessageContextMenuVisible.value = true;
};

const closeAiMessageContextMenu = () => {
  aiMessageContextMenuVisible.value = false;
};

const handleDeleteAiMessage = () => {
  if (selectedAiMessage.value) {
    aiChatMessages.value = aiChatMessages.value.filter(
      (m) => m.id !== selectedAiMessage.value?.id,
    );
    // Since there's no single message delete API for AI, we just update local state
    // and maybe the user will add it later.
    antMessage.success('已从本地移除消息');
    updateContext();
  }
  closeAiMessageContextMenu();
};

onMounted(() => {
  fetchMessages();
  document.addEventListener('click', closeAiMessageContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeAiMessageContextMenu);
});
</script>

<template>
  <div
    :class="[
      isMobile ? 'h-[calc(100vh-48px)] p-0' : 'h-[calc(100vh-100px)] p-4',
    ]"
  >
    <div
      class="flex h-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
      :class="{ 'rounded-none border-0': isMobile }"
    >
      <div
        v-if="!isMobile"
        class="flex w-48 flex-col border-r border-gray-100 bg-gray-50/50 py-2"
      >
        <div
          class="flex items-center gap-2 px-4 py-3 text-lg font-bold text-gray-800"
        >
          <span class="i-ant-design:message-filled text-blue-500"></span>
          消息中心
        </div>
        <div class="mt-2 flex-1 space-y-1 px-2">
          <div
            v-for="item in menuItems"
            :key="item.key"
            class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
            :class="
              activeMenu === item.key
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            "
            @click="handleMenuClick(item.key)"
          >
            <span :class="item.icon" class="text-lg"></span>
            {{ item.label }}
          </div>
        </div>
      </div>

      <div
        v-if="!isMobile || (!selectedUserId && !selectedConversationId)"
        class="flex flex-col border-r border-gray-100 bg-white"
        :class="isMobile ? 'w-full flex-1' : 'w-72'"
      >
        <!-- Mobile Switcher -->
        <div
          v-if="isMobile"
          class="flex border-b border-gray-100 bg-gray-50/30"
        >
          <div
            v-for="item in menuItems"
            :key="item.key"
            class="flex flex-1 cursor-pointer items-center justify-center gap-2 py-3.5 text-center font-medium transition-all"
            :class="
              activeMenu === item.key
                ? 'border-b-2 border-blue-600 bg-white text-blue-600'
                : 'text-gray-500 hover:bg-gray-50'
            "
            @click="handleMenuClick(item.key)"
          >
            <span :class="item.icon" class="text-lg"></span>
            {{ item.label }}
          </div>
        </div>
        <ChatSessionList
          v-if="isAIChat"
          :sessions="aiSessions"
          :selected-session-id="selectedConversationId"
          @select="handleSelectSession"
          @create="handleCreateSession"
          @delete="handleDeleteSession"
          @update-title="handleUpdateSessionTitle"
        />
        <ConversationList
          v-else
          :conversations="conversations"
          :selected-user-id="selectedUserId"
          @select="handleSelectConversation"
          @delete="handleDeleteConversation"
        />
      </div>

      <div
        v-if="
          !isMobile || selectedUserId || (isAIChat && selectedConversationId)
        "
        class="flex flex-1 flex-col bg-white"
      >
        <div
          v-if="isAIChat && selectedConversationId"
          class="flex flex-1 flex-col"
        >
          <div
            class="flex items-center justify-between border-b border-gray-100 px-4 py-3"
          >
            <div class="flex items-center gap-3">
              <button
                v-if="isMobile"
                class="-ml-1 p-1 text-gray-400 hover:text-gray-600"
                @click="handleBack"
              >
                <span class="i-ant-design:left-outlined text-lg"></span>
              </button>
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100"
              >
                <span
                  class="i-ant-design:robot-outlined text-lg text-blue-500"
                ></span>
              </div>
              <div>
                <h3 class="font-medium text-gray-800">
                  {{
                    aiSessions.find((s) => s.id === selectedConversationId)
                      ?.title || 'AI 助手'
                  }}
                </h3>
                <p class="text-xs text-gray-500">智能对话与时迹分析</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                class="rounded-lg bg-green-100 px-3 py-1 text-sm text-green-800 transition-colors hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleSummarizeTimeRecords('today')"
                :disabled="summarizeLoading || isStreaming"
              >
                <span
                  v-if="summarizeLoading"
                  class="i-ant-design:loading-3-quarters-outlined mr-1 animate-spin"
                ></span>
                总结今日
              </button>
              <button
                class="rounded-lg bg-green-100 px-3 py-1 text-sm text-green-800 transition-colors hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50"
                @click="handleSummarizeTimeRecords('week')"
                :disabled="summarizeLoading || isStreaming"
              >
                <span
                  v-if="summarizeLoading"
                  class="i-ant-design:loading-3-quarters-outlined mr-1 animate-spin"
                ></span>
                总结本周
              </button>
            </div>
          </div>

          <div
            ref="chatMessagesContainer"
            class="min-h-0 flex-1 overflow-y-auto"
            :class="isMobile ? 'space-y-3 px-3 py-2' : 'space-y-4 p-4'"
          >
            <div
              v-for="msg in aiChatMessages"
              :key="msg.id"
              class="flex"
              :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
              @contextmenu="handleAiMessageContextMenu($event, msg)"
            >
              <div
                class="max-w-[70%] rounded-lg p-3"
                :class="
                  msg.role === 'user'
                    ? 'bg-blue-100 text-gray-800'
                    : 'bg-gray-100 text-gray-800'
                "
              >
                <div
                  v-if="msg.role !== 'user' && msg.content"
                  v-html="renderMarkdown(msg.content)"
                  class="prose prose-sm max-w-none"
                ></div>
                <div
                  v-else-if="msg.role !== 'user' && !msg.content"
                  class="flex items-center gap-1.5 px-1 py-1"
                >
                  <div
                    class="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]"
                  ></div>
                  <div
                    class="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]"
                  ></div>
                  <div
                    class="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                  ></div>
                </div>
                <p v-else>{{ msg.content }}</p>
                <p class="mt-1 text-xs text-gray-500">
                  {{ new Date(msg.createTime).toLocaleTimeString() }}
                </p>
              </div>
            </div>
            <div
              v-if="aiChatMessages.length === 0"
              class="flex h-full flex-col items-center justify-center text-gray-400"
            >
              <div
                class="i-ant-design:robot-outlined mb-4 text-6xl opacity-20"
              ></div>
              <p>开始与 AI 助手对话</p>
              <p class="mt-2 text-sm">可以尝试让 AI 总结你的时迹记录</p>
            </div>
          </div>

          <div class="border-t border-gray-100 p-4">
            <div class="flex gap-2">
              <input
                v-model="aiChatInput"
                type="text"
                class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入消息..."
                @keyup.enter="handleAISendMessage"
                :disabled="isStreaming"
              />
              <button
                class="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                @click="handleAISendMessage"
                :disabled="aiChatLoading || !aiChatInput.trim() || isStreaming"
              >
                <span
                  v-if="aiChatLoading"
                  class="i-ant-design:loading-3-quarters-outlined animate-spin"
                ></span>
                <span v-else>发送</span>
              </button>
            </div>
          </div>
        </div>

        <ChatWindow
          v-else-if="selectedUserId"
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
          class="flex h-full flex-col items-center justify-center bg-gray-50/30 text-gray-400"
        >
          <div
            class="i-ant-design:message-outlined mb-4 text-6xl opacity-20"
          ></div>
          <p>选择一个会话开始聊天</p>
        </div>
      </div>
    </div>

    <!-- AI Message Context Menu -->
    <Teleport to="body">
      <div
        v-if="aiMessageContextMenuVisible"
        class="fixed z-50 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        :style="{
          left: `${aiMessageContextMenuPosition.x}px`,
          top: `${aiMessageContextMenuPosition.y}px`,
        }"
        @click.stop
      >
        <div
          class="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
          @click="handleDeleteAiMessage"
        >
          <span class="i-ant-design:delete-outlined"></span>
          删除消息
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.prose {
  max-width: none;
}

.prose :deep(p) {
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
}

.prose :deep(h1) {
  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.prose :deep(h2) {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.prose :deep(h3) {
  margin-top: 0.875rem;
  margin-bottom: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
}

.prose :deep(code) {
  padding: 0.125rem 0.375rem;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
  font-size: 0.875rem;
  background-color: #f3f4f6;
  border-radius: 0.375rem;
}

.prose :deep(pre) {
  padding: 1rem;
  margin: 0.75rem 0;
  overflow-x: auto;
  color: #e5e7eb;
  background-color: #1f2937;
  border-radius: 0.5rem;
}

.prose :deep(pre code) {
  padding: 0;
  background-color: transparent;
}

.prose :deep(ul) {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.prose :deep(ol) {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.prose :deep(li) {
  margin: 0.25rem 0;
}

.prose :deep(blockquote) {
  padding-left: 1rem;
  margin: 0.75rem 0;
  font-style: italic;
  color: #4b5563;
  border-left: 4px solid #3b82f6;
}

.prose :deep(a) {
  color: #3b82f6;
  text-decoration: underline;
}

.prose :deep(a:hover) {
  color: #1d4ed8;
}

.prose :deep(table) {
  width: 100%;
  margin: 0.75rem 0;
  border-collapse: collapse;
}

.prose :deep(th),
.prose :deep(td) {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
}

.prose :deep(th) {
  font-weight: 600;
  background-color: #f3f4f6;
}
</style>

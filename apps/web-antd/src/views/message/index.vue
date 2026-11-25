<script setup lang="ts">
import type { Message } from '#/api/core/message';
import type { MessageConversationVO } from '#/api/payload';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePreferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { message as antMessage } from 'ant-design-vue';

import {
  createMessageApi,
  deleteConversationApi,
  getConversationMessagesApi,
  getConversationsApi,
  markConversationReadApi,
  SYSTEM_CONVERSATION_ID,
} from '#/api/core/message';
import { getUserBasicInfoApi } from '#/api/core/user';

import ChatWindow from './components/ChatWindow.vue';
import ConversationList from './components/ConversationList.vue';

const PAGE_SIZE = 30;
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { isMobile } = usePreferences();

const summaries = ref<MessageConversationVO[]>([]);
const conversationLoading = ref(false);
const conversationError = ref(false);
const moreConversations = ref(true);
let conversationPage = 1;
let summaryRevision = 0;

const messages = ref<Message[]>([]);
const loading = ref(false);
const loadingOlder = ref(false);
const chatError = ref(false);
const moreMessages = ref(false);
const sendingMessage = ref(false);
const deletingConversation = ref('');
const peerInfo = ref<{ avatar: string; nickname: string; userId: string }>();
let chatRevision = 0;
let beforeId: string | undefined;

const myId = computed(() =>
  String(userStore.userInfo?.userId || userStore.userInfo?.id || ''),
);
const selectedUserId = computed(() =>
  typeof route.query.userId === 'string' ? route.query.userId : undefined,
);
const selectedSummary = computed(() =>
  summaries.value.find((row) => row.userId === selectedUserId.value),
);
const selectedConversationName = computed(() => {
  const peer = selectedUserId.value;
  if (peer === SYSTEM_CONVERSATION_ID) return '系统通知';
  return (
    selectedSummary.value?.username ||
    peerInfo.value?.nickname ||
    `User ${peer}`
  );
});

const conversations = computed(() =>
  summaries.value.map((row) => ({
    userId: row.userId || '',
    username:
      row.userId === SYSTEM_CONVERSATION_ID
        ? '系统通知'
        : row.username || `User ${row.userId}`,
    avatar: row.avatarUrl || undefined,
    time: row.time || '',
    lastMessage: row.lastMessage || '',
    unreadCount: row.unreadCount,
  })),
);

async function fetchConversations(reset = false) {
  if (!reset && (conversationLoading.value || !moreConversations.value)) return;
  const revision = ++summaryRevision;
  const page = reset ? 1 : conversationPage;
  conversationLoading.value = true;
  conversationError.value = false;
  try {
    const result = await getConversationsApi(page, PAGE_SIZE);
    if (revision !== summaryRevision) return;
    const previous = reset ? [] : summaries.value;
    const known = new Set(previous.map((row) => row.userId));
    summaries.value = [
      ...previous,
      ...result.items.filter((row) => !known.has(row.userId)),
    ];
    moreConversations.value = result.items.length === PAGE_SIZE;
    conversationPage = page + 1;
  } catch {
    if (revision === summaryRevision) conversationError.value = true;
  } finally {
    if (revision === summaryRevision) conversationLoading.value = false;
  }
}

async function fetchChat(older = false) {
  const peer = selectedUserId.value;
  if (
    !peer ||
    (older && (!moreMessages.value || loadingOlder.value || loading.value))
  )
    return;
  const revision = ++chatRevision;
  const pending = older ? loadingOlder : loading;
  pending.value = true;
  chatError.value = false;
  try {
    const rows = await getConversationMessagesApi(
      peer,
      PAGE_SIZE,
      older ? beforeId : undefined,
    );
    if (revision !== chatRevision) return;
    beforeId = rows.at(-1)?.id;
    moreMessages.value = rows.length === PAGE_SIZE;
    const known = new Set(older ? messages.value.map((row) => row.id) : []);
    const chronological = rows.filter((row) => !known.has(row.id)).toReversed();
    messages.value = older
      ? [...chronological, ...messages.value]
      : chronological;
    if (!older && rows.length > 0) {
      await markConversationReadApi(peer);
      if (revision !== chatRevision) return;
      const summary = summaries.value.find((row) => row.userId === peer);
      if (summary) summary.unreadCount = 0;
    }
    if (
      !older &&
      rows.length === 0 &&
      peer !== SYSTEM_CONVERSATION_ID &&
      !selectedSummary.value
    ) {
      const info = await getUserBasicInfoApi(peer);
      if (revision === chatRevision)
        peerInfo.value = {
          userId: peer,
          nickname: info.nickname,
          avatar: info.avatar,
        };
    }
  } catch {
    if (revision === chatRevision) chatError.value = true;
  } finally {
    if (revision === chatRevision) pending.value = false;
  }
}

function handleSelectConversation(userId: string) {
  void router.push({
    query: { ...route.query, userId, conversationId: undefined },
  });
}

function handleBack() {
  void router.push({
    query: { ...route.query, userId: undefined, conversationId: undefined },
  });
}

watch(
  selectedUserId,
  () => {
    chatRevision++;
    peerInfo.value = undefined;
    messages.value = [];
    loading.value = false;
    loadingOlder.value = false;
    chatError.value = false;
    moreMessages.value = false;
    beforeId = undefined;
    void fetchChat();
  },
  { immediate: true },
);

async function handleSendMessage(content: string) {
  const peer = selectedUserId.value;
  if (!peer || peer === SYSTEM_CONVERSATION_ID || sendingMessage.value) return;
  sendingMessage.value = true;
  try {
    const row = await createMessageApi({
      receiverId: peer,
      content,
      title: 'Chat Message',
      type: 1,
    });
    if (
      selectedUserId.value === peer &&
      !messages.value.some((item) => item.id === row.id)
    )
      messages.value.push(row);
    const previous = summaries.value.find((item) => item.userId === peer);
    summaries.value = [
      {
        userId: peer,
        username:
          previous?.username ||
          (peerInfo.value?.userId === peer ? peerInfo.value.nickname : null),
        avatarUrl:
          previous?.avatarUrl ||
          (peerInfo.value?.userId === peer ? peerInfo.value.avatar : null),
        time: row.createTime,
        lastMessage: row.content.slice(0, 180),
        unreadCount: previous?.unreadCount || 0,
      },
      ...summaries.value.filter((item) => item.userId !== peer),
    ];
  } finally {
    sendingMessage.value = false;
  }
}

function handleDeleteMessage(id: string) {
  messages.value = messages.value.filter((row) => row.id !== id);
  // 被删除的消息可能正是会话摘要所展示的最后一条。
  void fetchConversations(true);
}

async function handleDeleteConversation(peer: string) {
  if (deletingConversation.value) return;
  deletingConversation.value = peer;
  try {
    await deleteConversationApi(peer);
    summaries.value = summaries.value.filter((row) => row.userId !== peer);
    if (selectedUserId.value === peer) {
      chatRevision++;
      messages.value = [];
      handleBack();
    }
    void fetchConversations(true);
    antMessage.success('会话已删除');
  } finally {
    deletingConversation.value = '';
  }
}

onMounted(() => {
  void fetchConversations();
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
          :loading="conversationLoading"
          :load-error="conversationError"
          :has-more="moreConversations"
          :deleting="deletingConversation"
          :selected-user-id="selectedUserId"
          @select="handleSelectConversation"
          @load-more="fetchConversations()"
          @delete="handleDeleteConversation"
        />
      </div>
      <div
        v-if="!isMobile || selectedUserId"
        class="flex min-h-0 flex-1 flex-col bg-card"
      >
        <ChatWindow
          v-if="selectedUserId"
          :messages="messages"
          :has-older="moreMessages"
          :loading-older="loadingOlder"
          :load-error="chatError"
          :target-avatar="selectedSummary?.avatarUrl || peerInfo?.avatar"
          :target-id="selectedUserId"
          :target-name="selectedConversationName"
          :my-id="myId"
          :my-avatar="userStore.userInfo?.avatar"
          :loading="loading"
          :sending="sendingMessage"
          :is-mobile="isMobile"
          :read-only="selectedUserId === SYSTEM_CONVERSATION_ID"
          @send="handleSendMessage"
          @load-older="fetchChat(true)"
          @retry="fetchChat(moreMessages)"
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

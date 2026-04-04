<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { formatDate } from '@vben/utils';

import {
  Modal as AModal,
  Avatar,
  List,
  ListItem,
  ListItemMeta,
  TypographyText,
} from 'ant-design-vue';

interface Conversation {
  userId: string;
  username: string;
  avatar?: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
}

const props = defineProps<{
  conversations: Conversation[];
  selectedUserId?: string;
}>();

const emit = defineEmits<{
  (e: 'select', userId: string): void;
  (e: 'delete', userId: string): void;
}>();

const handleSelect = (userId: string) => {
  emit('select', userId);
};

// Context Menu
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const selectedUserIdForMenu = ref<null | string>(null);
const deleteModalVisible = ref(false);

const handleContextMenu = (e: MouseEvent, userId: string) => {
  e.preventDefault();
  selectedUserIdForMenu.value = userId;
  contextMenuPosition.value = { x: e.clientX, y: e.clientY };
  contextMenuVisible.value = true;
};

const closeContextMenu = () => {
  contextMenuVisible.value = false;
};

const openDeleteConfirm = () => {
  closeContextMenu();
  deleteModalVisible.value = true;
};

const handleDeleteConversation = () => {
  if (selectedUserIdForMenu.value) {
    emit('delete', selectedUserIdForMenu.value);
    deleteModalVisible.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu);
});

// Scroll to selected user
watch(
  () => props.selectedUserId,
  (newId) => {
    if (newId) {
      nextTick(() => {
        const el = document.getElementById(`conversation-${newId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="border-b border-gray-100 p-4 text-lg font-medium">我的消息</div>
    <div class="flex-1 overflow-y-auto">
      <List item-layout="horizontal" :data-source="conversations">
        <template #renderItem="{ item }">
          <ListItem
            :id="`conversation-${item.userId}`"
            class="cursor-pointer !py-3 px-4 transition-colors hover:bg-gray-50"
            :class="{ 'bg-blue-50': selectedUserId === item.userId }"
            @click="handleSelect(item.userId)"
            @contextmenu="handleContextMenu($event, item.userId)"
          >
            <ListItemMeta>
              <template #avatar>
                <Avatar :src="item.avatar" :size="40">
                  {{ item.username?.[0]?.toUpperCase() }}
                </Avatar>
              </template>
              <template #title>
                <div class="flex items-center justify-between">
                  <span class="truncate font-medium">{{ item.username }}</span>
                  <span class="text-xs text-gray-400">{{
                    formatDate(item.time, 'MM-DD HH:mm')
                  }}</span>
                </div>
              </template>
              <template #description>
                <div class="flex items-center justify-between">
                  <TypographyText
                    type="secondary"
                    class="w-32 truncate text-xs"
                    :content="item.lastMessage"
                  />
                  <span
                    v-if="item.unreadCount > 0"
                    class="min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs text-white"
                  >
                    {{ item.unreadCount }}
                  </span>
                </div>
              </template>
            </ListItemMeta>
          </ListItem>
        </template>
      </List>
    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="contextMenuVisible"
        class="fixed z-50 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        :style="{
          left: `${contextMenuPosition.x}px`,
          top: `${contextMenuPosition.y}px`,
        }"
        @click.stop
      >
        <div
          class="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
          @click="openDeleteConfirm"
        >
          <span class="i-ant-design:delete-outlined"></span>
          删除会话
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <AModal
      v-model:open="deleteModalVisible"
      title="确认删除"
      @ok="handleDeleteConversation"
    >
      <p>确定要删除与该用户的会话吗？这将删除所有聊天记录且无法恢复。</p>
    </AModal>
  </div>
</template>

<style scoped>
:deep(.ant-list-item-meta-title) {
  margin-bottom: 4px !important;
}
</style>

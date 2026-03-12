<script setup lang="ts">
import type { Message } from '#/api/core/message';

import { computed, nextTick, watch } from 'vue';

import { formatDate } from '@vben/utils';

import { Avatar, List, ListItem, ListItemMeta, TypographyText } from 'ant-design-vue';

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
}>();

const handleSelect = (userId: string) => {
  emit('select', userId);
};

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
  <div class="h-full flex flex-col">
    <div class="p-4 border-b border-gray-100 font-medium text-lg">我的消息</div>
    <div class="flex-1 overflow-y-auto">
      <List item-layout="horizontal" :data-source="conversations">
        <template #renderItem="{ item }">
          <ListItem
            :id="`conversation-${item.userId}`"
            class="cursor-pointer hover:bg-gray-50 transition-colors px-4 !py-3"
            :class="{ 'bg-blue-50': selectedUserId === item.userId }"
            @click="handleSelect(item.userId)"
          >
            <ListItemMeta>
              <template #avatar>
                <Avatar :src="item.avatar" :size="40">
                  {{ item.username?.[0]?.toUpperCase() }}
                </Avatar>
              </template>
              <template #title>
                <div class="flex justify-between items-center">
                  <span class="font-medium truncate">{{ item.username }}</span>
                  <span class="text-xs text-gray-400">{{ formatDate(item.time, 'MM-DD HH:mm') }}</span>
                </div>
              </template>
              <template #description>
                <div class="flex justify-between items-center">
                  <TypographyText type="secondary" class="truncate w-32 text-xs" :content="item.lastMessage" />
                  <span
                    v-if="item.unreadCount > 0"
                    class="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center"
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
  </div>
</template>

<style scoped>
:deep(.ant-list-item-meta-title) {
  margin-bottom: 4px !important;
}
</style>

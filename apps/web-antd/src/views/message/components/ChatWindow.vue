<script setup lang="ts">
import type { Message } from '#/api/core/message';

import { ref, watch } from 'vue';

import { formatDate, formatDateTime } from '@vben/utils';

import { Avatar, Button, Input } from 'ant-design-vue';

const props = defineProps<{
  messages: Message[];
  targetId: string;
  targetName?: string;
  myId: string;
  myAvatar?: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'send', content: string): void;
}>();

const inputContent = ref('');
const listRef = ref<HTMLDivElement>();

const handleSend = () => {
  if (!inputContent.value.trim()) return;
  emit('send', inputContent.value);
  inputContent.value = '';
};

// Auto scroll to bottom when messages change
watch(
  () => props.messages,
  () => {
    setTimeout(() => {
      if (listRef.value) {
        listRef.value.scrollTop = listRef.value.scrollHeight;
      }
    }, 100);
  },
  { deep: true },
);
</script>

<template>
  <div class="flex flex-col h-full bg-white">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="font-medium text-lg">{{ targetName || `User ${targetId}` }}</span>
      </div>
      <div class="text-gray-400 text-sm">
        {{ formatDateTime(new Date()) }}
      </div>
    </div>

    <!-- Messages -->
    <div ref="listRef" class="flex-1 overflow-y-auto p-6 bg-gray-50/50">
      <div v-if="loading" class="flex justify-center py-4">
        <span class="text-gray-400">Loading...</span>
      </div>
      <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
        <span>暂无消息</span>
      </div>
      
      <div v-else class="space-y-6">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex w-full"
          :class="String(msg.senderId) === String(myId) ? 'justify-end' : 'justify-start'"
        >
          <!-- Other User Avatar -->
          <Avatar
            v-if="String(msg.senderId) !== String(myId)"
            :src="msg.avatar"
            class="mr-3 mt-1 flex-shrink-0"
            :size="40"
          >
            {{ targetName?.[0]?.toUpperCase() || targetId }}
          </Avatar>

          <div class="flex flex-col max-w-[70%]" :class="String(msg.senderId) === String(myId) ? 'items-end' : 'items-start'">
            <!-- Message Content -->
            <div
              class="px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm max-w-full break-words"
              :class="
                String(msg.senderId) === String(myId)
                  ? 'bg-[#95EC69] text-black border border-[#7CD958]'
                  : 'bg-white text-gray-800 border border-gray-100'
              "
            >
              {{ msg.content }}
            </div>
            <!-- Time -->
            <span class="text-xs text-gray-400 mt-1.5 px-1">
              {{ formatDate(msg.createTime, 'MM-DD HH:mm') }}
            </span>
          </div>

          <!-- My Avatar -->
          <Avatar
            v-if="String(msg.senderId) === String(myId)"
            :src="myAvatar || msg.avatar"
            class="ml-3 mt-1 flex-shrink-0"
            :size="40"
          >
            Me
          </Avatar>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="p-4 bg-white border-t border-gray-100">
      <div class="relative">
        <Input.TextArea
          v-model:value="inputContent"
          :rows="4"
          placeholder="请输入消息内容..."
          :bordered="false"
          class="resize-none !bg-gray-50 rounded-xl !p-3 focus:!bg-white focus:!shadow-none transition-all"
          @press-enter.prevent="handleSend"
        />
        <div class="absolute bottom-3 right-3 flex items-center gap-2">
           <span class="text-xs text-gray-400">{{ inputContent.length }}/500</span>
           <Button type="primary" @click="handleSend" :disabled="!inputContent.trim()">
             发送
           </Button>
        </div>
      </div>
    </div>
  </div>
</template>

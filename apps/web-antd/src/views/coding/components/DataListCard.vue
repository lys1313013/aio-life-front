<script lang="ts" setup>
import { Card, Spin } from 'ant-design-vue';

interface Props {
  title?: string;
  loading?: boolean;
  isEmpty?: boolean;
  emptyText?: string;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  isEmpty: false,
  emptyText: '暂无数据',
});
</script>

<template>
  <div class="flex flex-col h-full">
    <h3
      v-if="title"
      class="mb-4 text-lg font-medium text-gray-800 dark:text-gray-200"
    >
      {{ title }}
    </h3>
    <Card
      :bordered="false"
      class="flex min-h-0 flex-1 flex-col shadow-sm"
      :body-style="{
        padding: '0',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }"
    >
      <div v-if="loading" class="flex justify-center p-8">
        <Spin />
      </div>
      <div
        v-else-if="isEmpty"
        class="p-8 text-center text-gray-500"
      >
        {{ emptyText }}
      </div>
      <div v-else class="flex-1 overflow-y-auto">
        <slot></slot>
      </div>
    </Card>
  </div>
</template>

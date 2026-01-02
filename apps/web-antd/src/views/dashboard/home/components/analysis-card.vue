<script setup lang="ts">
import type { Component } from 'vue';

import { Card, Skeleton } from 'ant-design-vue';
import { VbenIcon } from '@vben/common-ui';

interface Props {
  icon?: Component | string;
  loading?: boolean;
  title?: string;
  totalTitle?: string;
  totalValue?: number | string;
  url?: string;
  value?: number | string;
  valueColor?: string;
}

defineOptions({
  name: 'AnalysisCard',
});

const props = withDefaults(defineProps<Props>(), {
  icon: '',
  loading: false,
  title: '',
  totalTitle: '',
  totalValue: 0,
  url: '',
  value: 0,
  valueColor: '',
});

function handleIconClick() {
  if (props.url) {
    window.open(props.url, '_blank');
  }
}
</script>

<template>
  <Card class="w-full">
    <template v-if="loading">
      <Skeleton active :paragraph="{ rows: 3 }" />
    </template>
    <template v-else>
      <div class="mb-4 text-base font-semibold">{{ title }}</div>
      <div class="flex items-center justify-between">
        <span
          :style="{ color: valueColor }"
          class="text-xl font-bold"
        >
          {{ value }}
        </span>
        <VbenIcon
          :class="{ 'cursor-pointer hover:opacity-80': !!url }"
          :icon="icon"
          class="size-8 flex-shrink-0"
          @click="handleIconClick"
        />
      </div>
      <div class="mt-4 flex justify-between text-sm text-gray-500">
        <span>{{ totalTitle }}</span>
        <span>{{ totalValue }}</span>
      </div>
    </template>
  </Card>
</template>

<style scoped>
/* 移除原有的 head-title 样式，因为不再使用 Card 的 title 属性 */
</style>

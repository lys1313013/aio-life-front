<script setup lang="ts">
import type { Component } from 'vue';

import { Card, Skeleton } from 'ant-design-vue';
import { VbenIcon } from '@vben/common-ui';

interface Props {
  icon?: Component | string;
  iconClickUrl?: string;
  loading?: boolean;
  title?: string;
  titleClickUrl?: string;
  totalTitle?: string;
  totalValue?: number | string;
  value?: number | string;
  valueColor?: string;
}

defineOptions({
  name: 'AnalysisCard',
});

const props = withDefaults(defineProps<Props>(), {
  icon: '',
  iconClickUrl: '',
  loading: false,
  title: '',
  titleClickUrl: '',
  totalTitle: '',
  totalValue: 0,
  value: 0,
  valueColor: '',
});

function handleIconClick(e: MouseEvent) {
  if (props.iconClickUrl) {
    e.stopPropagation();
    window.open(props.iconClickUrl, '_blank');
  }
}

function handleTitleClick(e: MouseEvent) {
  if (props.titleClickUrl) {
    e.stopPropagation();
    window.open(props.titleClickUrl, '_blank');
  }
}
</script>

<template>
  <Card :body-style="{ padding: '16px' }" class="w-full">
    <template v-if="loading">
      <Skeleton
        active
        :paragraph="{ rows: 2, width: ['60%', '100%'] }"
        :title="{ width: '40%' }"
      />
    </template>
    <template v-else>
      <div
        :class="{ 'cursor-pointer hover:text-primary transition-colors': !!titleClickUrl }"
        class="mb-2 text-sm font-medium sm:mb-4 sm:text-base sm:font-semibold"
        @click="handleTitleClick"
      >
        {{ title }}
      </div>
      <div class="flex items-center justify-between">
        <span
          :style="{ color: valueColor }"
          class="text-lg font-bold sm:text-xl"
        >
          {{ value }}
        </span>
        <VbenIcon
          :class="{ 'cursor-pointer hover:opacity-80': !!iconClickUrl }"
          :icon="icon"
          class="size-6 flex-shrink-0 sm:size-8"
          @click="handleIconClick"
        />
      </div>
      <div class="mt-2 flex justify-between text-xs text-gray-500 sm:mt-4 sm:text-sm">
        <span>{{ totalTitle }}</span>
        <span>{{ totalValue }}</span>
      </div>
    </template>
  </Card>
</template>

<style scoped>
/* 移除原有的 head-title 样式，因为不再使用 Card 的 title 属性 */
</style>

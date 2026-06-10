<script setup lang="ts">
import type { Component } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import { Card, Skeleton } from 'ant-design-vue';

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
  diffValue?: string;
  diffColor?: string;
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
  diffValue: '',
  diffColor: '',
});

const emit = defineEmits<{
  (e: 'title-click', url: string): void;
}>();

function handleIconClick(e: MouseEvent) {
  if (props.iconClickUrl) {
    e.stopPropagation();
    window.open(props.iconClickUrl, '_blank');
  }
}

function handleTitleClick(e: MouseEvent) {
  if (props.titleClickUrl) {
    e.stopPropagation();
    if (props.titleClickUrl.startsWith('action:')) {
      emit('title-click', props.titleClickUrl);
    } else {
      window.open(props.titleClickUrl, '_blank');
    }
  }
}
</script>

<template>
  <Card :body-style="{ padding: 0 }" class="w-full select-none">
    <div class="p-2.5 sm:p-3">
      <div
        :class="{
          'cursor-pointer transition-colors hover:text-primary':
            !!titleClickUrl,
        }"
        class="mb-1.5 text-xs font-medium sm:mb-2 sm:text-sm sm:font-semibold"
        @click="handleTitleClick"
      >
        {{ title }}
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <template v-if="loading">
            <Skeleton.Button
              active
              :style="{ width: '100px', height: '24px' }"
            />
          </template>
          <span
            v-else
            :style="{ color: valueColor }"
            class="text-xs font-bold sm:text-lg"
          >
            {{ value }}
          </span>
        </div>
        <div
          v-if="diffValue"
          :style="{ color: diffColor }"
          class="flex items-center text-[10px] font-normal"
        >
          {{ diffValue }}
        </div>
        <VbenIcon
          v-else-if="icon"
          :class="{ 'cursor-pointer hover:opacity-80': !!iconClickUrl }"
          :icon="icon"
          class="size-5 flex-shrink-0 sm:size-6"
          @click="handleIconClick"
        />
      </div>
      <div
        v-if="totalTitle"
        class="mt-1.5 flex justify-between text-[10px] text-gray-500 sm:mt-2 sm:text-xs"
      >
        <span>{{ totalTitle }}</span>
        <div class="flex items-center">
          <template v-if="loading">
            <Skeleton.Button
              active
              size="small"
              :style="{ width: '60px', height: '20px' }"
            />
          </template>
          <span v-else>{{ totalValue }}</span>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
/* 移除原有的 head-title 样式，因为不再使用 Card 的 title 属性 */
</style>

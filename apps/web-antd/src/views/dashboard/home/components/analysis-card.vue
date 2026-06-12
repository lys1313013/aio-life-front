<script setup lang="ts">
import type { Component } from 'vue';

import { computed } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import { Card } from 'ant-design-vue';

interface Props {
  icon?: Component | string;
  iconClickUrl?: string;
  loading?: boolean;
  refreshing?: boolean;
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
  refreshing: false,
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

// 首次加载（loading）也用同一套滑动条样式：保留高度，只把数值换成 "—" 占位
const isUpdating = computed(() => props.loading || props.refreshing);

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
  <Card
    :body-style="{ padding: 0 }"
    class="analysis-card w-full select-none"
    :class="{ 'is-updating': isUpdating }"
  >
    <!-- 顶部 2px 静默刷新进度条：transform scaleX 动画，不触发 reflow -->
    <div v-if="isUpdating" class="analysis-card-progress" aria-hidden="true">
      <div class="analysis-card-progress-bar" />
    </div>

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
        <div class="flex min-h-[20px] items-center">
          <span
            :style="{ color: valueColor }"
            class="analysis-card-value text-xs font-bold sm:text-lg"
          >
            {{ loading && !value ? '—' : value }}
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
        v-if="totalTitle || isUpdating"
        class="mt-1.5 flex justify-between text-[10px] text-gray-500 sm:mt-2 sm:text-xs"
      >
        <span>{{ totalTitle || '—' }}</span>
        <div class="flex min-h-[16px] items-center">
          <span>{{ loading && !totalValue ? '—' : totalValue }}</span>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
/* 静默刷新态：整卡轻微降透明，给出"正在更新"的视觉反馈 */
.analysis-card {
  position: relative;
  overflow: hidden;
  /* 高度兜底：保证首屏/无 totalTitle 的卡片与正常态等高
     mobile ~ 12+18+6+18+6+15+12 = 87px  → 88px
     sm+   ~ 12+21+8+27+8+18+12 = 106px → 108px */
  min-height: 88px;
}

@media (min-width: 640px) {
  .analysis-card {
    min-height: 108px;
  }
}

.analysis-card.is-updating {
  opacity: 0.85;
  transition: opacity 200ms ease-out;
}

/* 顶部 2px 进度条轨道：absolute 不占布局 */
.analysis-card-progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  overflow: hidden;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  background: hsl(var(--border) / 0.5);
  pointer-events: none;
  z-index: 1;
}

.analysis-card-progress-bar {
  height: 100%;
  width: 35%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    hsl(var(--primary)) 50%,
    transparent 100%
  );
  transform-origin: left center;
  animation: analysis-card-progress 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes analysis-card-progress {
  0% {
    transform: translateX(-100%) scaleX(1);
  }
  100% {
    transform: translateX(380%) scaleX(1);
  }
}

/* 数值用 opacity 过渡，data 切换时平滑 fade */
.analysis-card-value {
  transition: opacity 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .analysis-card-progress-bar {
    animation-duration: 2s;
  }
  .analysis-card.is-updating {
    transition: none;
  }
  .analysis-card-value {
    transition: none;
  }
}
</style>

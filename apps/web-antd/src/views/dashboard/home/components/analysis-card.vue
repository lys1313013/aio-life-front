<script setup lang="ts">
import type { Component } from 'vue';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { VbenIcon } from '@vben/common-ui';

import { Card } from 'ant-design-vue';

import RefreshButton from './RefreshButton.vue';

interface Props {
  error?: boolean;
  icon?: Component | string;
  iconColor?: string;
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
  error: false,
  icon: '',
  iconColor: '',
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
  (e: 'retry'): void;
  (e: 'title-click', url: string): void;
}>();

const router = useRouter();

// 首次加载（loading）也用同一套滑动条样式：保留高度，只把数值换成 "—" 占位
const isUpdating = computed(() => props.loading || props.refreshing);

// 内部路由（以 / 开头）走应用内跳转，外部 http 链接新开窗口
function navigate(url: string) {
  if (url.startsWith('http')) {
    window.open(url, '_blank');
  } else {
    router.push(url);
  }
}

function handleIconClick(e: MouseEvent) {
  if (props.iconClickUrl) {
    e.stopPropagation();
    navigate(props.iconClickUrl);
  }
}

function handleTitleClick(e: MouseEvent) {
  if (props.titleClickUrl) {
    e.stopPropagation();
    if (props.titleClickUrl.startsWith('action:')) {
      emit('title-click', props.titleClickUrl);
    } else {
      navigate(props.titleClickUrl);
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
      <div class="analysis-card-progress-bar"></div>
    </div>

    <div class="flex min-h-[80px] flex-col p-2.5 sm:min-h-[92px] sm:p-3">
      <div class="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
        <div class="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span
            v-if="icon"
            :class="{
              'cursor-pointer hover:text-primary': !!iconClickUrl,
            }"
            class="analysis-card-icon inline-flex size-5 flex-shrink-0 items-center justify-center text-muted-foreground transition-colors sm:size-6"
            @click="handleIconClick"
          >
            <VbenIcon
              :icon="icon"
              :class="{
                'analysis-card-weread-icon': icon === 'simple-icons:weread',
              }"
              :style="{ color: iconColor || undefined }"
              class="size-4 sm:size-5"
            />
          </span>
          <span
            :class="{
              'cursor-pointer transition-colors hover:text-primary':
                !!titleClickUrl,
            }"
            class="truncate text-xs font-medium sm:text-sm sm:font-semibold"
            @click="handleTitleClick"
          >
            {{ title }}
          </span>
        </div>
        <div class="flex min-w-0 max-w-[55%] items-center gap-1">
          <span
            :style="{ color: valueColor }"
            class="analysis-card-value truncate text-xs font-bold leading-5 sm:text-base"
          >
            {{ (loading && !value) || (error && value === '') ? '—' : value }}
          </span>
          <RefreshButton
            v-if="error"
            :disabled="isUpdating"
            :aria-label="`${title}加载失败，重试`"
            title="加载失败，点击重试"
            class="shrink-0 disabled:cursor-wait"
            @mousedown.stop
            @touchstart.stop
            @click.stop="emit('retry')"
          />
        </div>
      </div>
      <div
        v-if="totalTitle || diffValue || isUpdating"
        class="mt-auto flex min-w-0 items-end justify-between gap-2 pt-2 text-[10px] text-muted-foreground sm:text-xs"
      >
        <span class="truncate">{{ totalTitle || '—' }}</span>
        <span
          v-if="diffValue"
          :style="{ color: diffColor }"
          class="flex-shrink-0 font-medium tabular-nums"
        >
          {{ diffValue }}
        </span>
        <span v-else class="flex-shrink-0 font-medium tabular-nums">
          {{
            (loading && !totalValue) || (error && totalValue === '')
              ? '—'
              : totalValue
          }}
        </span>
      </div>
    </div>
  </Card>
</template>

<style scoped>
/* 品牌图标的镂空部分固定为白色，避免透出深色卡片背景。 */
.analysis-card-weread-icon {
  background-color: #fff;
  border-radius: 21.3333%;
}

/* 静默刷新态：整卡轻微降透明，给出"正在更新"的视觉反馈 */
.analysis-card {
  position: relative;
  overflow: hidden;

  min-height: 80px;
}

@media (min-width: 640px) {
  .analysis-card {
    min-height: 92px;
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

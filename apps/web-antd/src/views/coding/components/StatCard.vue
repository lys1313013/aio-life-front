<script lang="ts" setup>
import { computed } from 'vue';

import { Card, Skeleton } from 'ant-design-vue';

interface Props {
  loading?: boolean;
  title: string;
  value?: number | string;
  unit?: string;
  subValue?: string;
  color?: 'blue' | 'cyan' | 'gray' | 'green' | 'orange' | 'red' | 'yellow';
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  color: 'blue',
});

const colorClasses = computed(() => {
  const map: Record<string, { bg: string; text: string }> = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-600 dark:text-yellow-400',
    },
    orange: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
    },
    cyan: {
      bg: 'bg-cyan-100 dark:bg-cyan-900/30',
      text: 'text-cyan-600 dark:text-cyan-400',
    },
    gray: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
    },
  };
  return map[props.color ?? 'blue'] || map.blue || { bg: '', text: '' };
});
</script>

<template>
  <Card :bordered="false" class="shadow-sm" :body-style="{ padding: '12px' }">
    <template v-if="loading">
      <div class="flex items-start gap-2 md:items-center md:gap-3">
        <Skeleton.Avatar active shape="circle" size="small" class="md:hidden" />
        <Skeleton.Avatar
          active
          shape="circle"
          size="large"
          class="hidden md:block"
        />
        <div class="w-full min-w-0">
          <Skeleton
            active
            :paragraph="{ rows: 1, width: '100%' }"
            :title="{ width: '60%' }"
          />
        </div>
      </div>
    </template>
    <template v-else>
      <div class="flex items-start gap-2 md:items-center md:gap-3">
        <div
          v-if="$slots.icon"
          class="shrink-0 rounded-full p-1.5 md:p-2"
          :class="colorClasses.bg"
        >
          <div
            class="flex items-center justify-center text-base md:text-lg"
            :class="colorClasses.text"
          >
            <slot name="icon"></slot>
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-xs text-gray-500 md:text-sm">
            {{ title }}
          </div>
          <div class="mt-0.5 flex items-baseline gap-1">
            <span class="text-sm font-bold tabular-nums md:text-base">{{
              value ?? '-'
            }}</span>
            <span v-if="unit" class="text-xs text-gray-500">{{ unit }}</span>
            <slot name="extra"></slot>
          </div>
          <div v-if="subValue" class="truncate text-xs text-gray-400">
            {{ subValue }}
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

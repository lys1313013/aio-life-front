<script setup lang="ts">
import type { ExerciseDashboardTrendPointVO } from '#/api/core/exerciseRecord';

import { computed } from 'vue';

import { Popover } from 'ant-design-vue';

const props = defineProps<{
  color: string;
  label: string;
  trend: ExerciseDashboardTrendPointVO[];
}>();

const points = computed(() => {
  const values = props.trend.map((point) => point.count);
  const min = Math.min(...values);
  const range = Math.max(...values) - min;
  return values.map((value, index) => ({
    x: values.length === 1 ? 76 : 4 + (index * 72) / (values.length - 1),
    y: range === 0 ? 14 : 21 - ((value - min) / range) * 14,
  }));
});
const polyline = computed(() =>
  points.value.map(({ x, y }) => `${x},${y}`).join(' '),
);
const end = computed(() => points.value.at(-1));
</script>

<template>
  <Popover :trigger="['hover', 'focus', 'click']" placement="topRight">
    <template #content>
      <div class="space-y-1 text-xs tabular-nums">
        <div
          v-for="point in trend"
          :key="point.date"
          class="flex justify-between gap-5"
        >
          <span class="text-muted-foreground">{{ point.date }}</span>
          <span>{{ point.count }}</span>
        </div>
      </div>
    </template>
    <button
      type="button"
      class="flex h-8 w-full items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      :aria-label="`${label}，最近 ${trend.length} 次：${trend.map((point) => `${point.date} ${point.count}`).join('，')}`"
      :style="{ color }"
    >
      <svg
        viewBox="0 0 80 28"
        class="h-6 w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          v-if="points.length > 1"
          :points="polyline"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          opacity="0.7"
          vector-effect="non-scaling-stroke"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle
          v-if="end"
          :cx="end.x"
          :cy="end.y"
          r="1.8"
          fill="currentColor"
        />
      </svg>
    </button>
  </Popover>
</template>

<script setup lang="ts">
import type { FinancePeriod } from '#/api/core/home-sections';

import { VbenIcon } from '@vben/common-ui';

defineProps<{
  loading: boolean;
  pending: FinancePeriod;
  title: string;
  value: FinancePeriod;
}>();
const emit = defineEmits<{ select: [period: FinancePeriod] }>();
const options: { label: string; value: FinancePeriod }[] = [
  { label: '本月', value: 'month' },
  { label: '本年', value: 'year' },
  { label: '全部', value: 'all' },
];
</script>
<template>
  <div
    class="flex shrink-0 gap-1 px-3 pb-2"
    role="group"
    :aria-label="`${title}统计范围`"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="relative min-h-9 flex-1 rounded-md px-2 text-xs transition-colors hover:bg-secondary"
      :class="
        value === option.value
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground'
      "
      :aria-label="`${title}范围：${option.label}`"
      :aria-pressed="value === option.value"
      :aria-busy="loading && pending === option.value"
      @click="emit('select', option.value)"
    >
      <span>{{ option.label }}</span>
      <VbenIcon
        v-if="loading && pending === option.value"
        icon="mdi:loading"
        class="absolute right-1 top-1/2 size-3 -translate-y-1/2 animate-spin"
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { membershipProviderIconUrl } from '#/api/membership/providers';

import { CATEGORIES } from './constants';

const props = withDefaults(
  defineProps<{
    category?: string;
    iconKey?: null | string;
    name?: string;
  }>(),
  { category: 'other', iconKey: null, name: '' },
);
const failed = ref(false);
const categoryIcon = computed(
  () =>
    CATEGORIES.find((item) => item.value === props.category)?.icon ??
    'mdi:shape-outline',
);
watch(
  () => props.iconKey,
  () => {
    failed.value = false;
  },
);
</script>

<template>
  <span
    class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground"
    role="img"
    :aria-label="name || '会员平台'"
  >
    <img
      v-if="iconKey && !failed"
      :src="membershipProviderIconUrl(iconKey)"
      alt=""
      class="h-full w-full rounded-lg bg-white object-contain p-1"
      loading="lazy"
      @error="failed = true"
    />
    <IconifyIcon v-else :icon="categoryIcon" class="text-xl" />
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { usePreferences } from '@vben/preferences';

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
const { isDark } = usePreferences();
const src = computed(() =>
  props.iconKey ? membershipProviderIconUrl(props.iconKey, isDark.value) : '',
);
const categoryIcon = computed(
  () =>
    CATEGORIES.find((item) => item.value === props.category)?.icon ??
    'mdi:shape-outline',
);
watch(src, () => {
  failed.value = false;
});
</script>

<template>
  <span
    class="inline-flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground"
    :class="{ 'rounded-lg bg-secondary': !iconKey || failed }"
    role="img"
    :aria-label="name || '会员平台'"
  >
    <img
      v-if="iconKey && !failed"
      :src="src"
      alt=""
      class="h-full w-full object-contain"
      loading="lazy"
      @error="failed = true"
    />
    <IconifyIcon v-else :icon="categoryIcon" class="text-xl" />
  </span>
</template>

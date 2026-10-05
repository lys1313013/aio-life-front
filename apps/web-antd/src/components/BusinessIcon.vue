<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import { useMenuVisualsStore } from '#/store/menu-visuals';

const props = defineProps<{ cardKey: string }>();
const visuals = useMenuVisualsStore();
const visual = computed(() => visuals.visual(props.cardKey));
onMounted(() => visuals.load());
</script>

<template>
  <VbenIcon
    :icon="visual.icon"
    :style="{ color: visual.iconColor || 'hsl(var(--foreground))' }"
    :aria-busy="visuals.loading"
  />
</template>

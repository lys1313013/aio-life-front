<script setup lang="ts">
import type { Component } from 'vue';

import { ref, watch } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import { useAuthImageUrl } from '#/composables/useAuthImageUrl';

const props = defineProps<{
  fileId?: string;
  icon: Component | string;
  url?: string;
}>();
const { blobUrl } = useAuthImageUrl(
  () => props.fileId,
  () => (props.fileId ? undefined : props.url),
);
const failed = ref(false);
watch(blobUrl, () => {
  failed.value = false;
});
</script>

<template>
  <span
    class="flex h-[60px] w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary text-muted-foreground"
  >
    <img
      v-if="blobUrl && !failed"
      :src="blobUrl"
      alt=""
      class="h-full w-full object-cover"
      @error="failed = true"
    />
    <VbenIcon v-else :icon="icon" class="size-5" />
  </span>
</template>

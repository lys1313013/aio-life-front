<script setup lang="ts">
import type { Component } from 'vue';

import { ref, watch } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import { useAuthImageUrl } from '#/composables/useAuthImageUrl';

const props = defineProps<{
  fileId?: string;
  icon: Component | string;
  naturalRatio?: boolean;
  url?: string;
}>();
const { blobUrl } = useAuthImageUrl(
  () => props.fileId,
  () => (props.fileId ? undefined : props.url),
);
const failed = ref(false);
const aspectRatio = ref(2 / 3);
watch(blobUrl, () => {
  failed.value = false;
  aspectRatio.value = 2 / 3;
});
function onLoad(event: Event) {
  const image = event.target as HTMLImageElement;
  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
    aspectRatio.value = image.naturalWidth / image.naturalHeight;
  }
}
function onError() {
  failed.value = true;
  aspectRatio.value = 2 / 3;
}
</script>

<template>
  <span
    class="flex shrink-0 items-center justify-center overflow-hidden bg-secondary text-muted-foreground"
    :class="naturalRatio ? 'rounded-[1px]' : 'h-12 w-8 rounded-md'"
    :style="naturalRatio ? { aspectRatio } : undefined"
  >
    <img
      v-if="blobUrl && !failed"
      :src="blobUrl"
      alt=""
      class="h-full w-full"
      :class="naturalRatio ? 'object-contain' : 'object-cover'"
      @load="onLoad"
      @error="onError"
    />
    <VbenIcon v-else :icon="icon" class="size-5" />
  </span>
</template>

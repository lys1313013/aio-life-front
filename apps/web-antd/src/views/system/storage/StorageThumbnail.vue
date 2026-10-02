<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import { Button, Spin } from 'ant-design-vue';

import { readStorageObject } from '#/api/system/storage';

const props = defineProps<{ objectKey: string }>();
const emit = defineEmits<{ preview: [url: string] }>();
const host = ref<HTMLElement>();
const src = ref('');
const loading = ref(false);
const failed = ref(false);
const controller = new AbortController();
let observer: IntersectionObserver | undefined;

async function load() {
  if (loading.value || controller.signal.aborted) return;
  loading.value = true;
  failed.value = false;
  try {
    const blob = await readStorageObject(
      props.objectKey,
      false,
      controller.signal,
    );
    if (!controller.signal.aborted) src.value = URL.createObjectURL(blob);
  } catch {
    failed.value = !controller.signal.aborted;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer?.disconnect();
      void load();
    }
  });
  if (host.value) observer.observe(host.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  controller.abort();
  if (src.value) URL.revokeObjectURL(src.value);
});
</script>

<template>
  <div ref="host" class="flex h-full items-center justify-center">
    <Spin v-if="loading" />
    <Button v-else-if="failed" aria-label="重试图片加载" @click="load">
      <VbenIcon icon="lucide:refresh-cw" />
    </Button>
    <button
      v-else-if="src"
      type="button"
      class="h-full w-full cursor-zoom-in"
      :aria-label="`预览 ${objectKey}`"
      @click="emit('preview', src)"
    >
      <img :src="src" :alt="objectKey" class="h-full w-full object-contain" />
    </button>
    <VbenIcon v-else icon="lucide:image" class="size-8 text-muted-foreground" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useAccessStore } from '@vben/stores';
import { ReloadOutlined, VideoCameraOutlined } from '@ant-design/icons-vue';
import { getFilePreviewUrl } from '#/utils/file';
const props = defineProps<{ fileId?: string; state?: string; title: string }>();
const emit = defineEmits<{ retry: [] }>();
const access = useAccessStore();
const source = ref(''),
  loading = ref(false),
  failed = ref(false),
  revision = ref(0);
let generation = 0;
let controller: AbortController | undefined;
function release() {
  controller?.abort();
  if (source.value) URL.revokeObjectURL(source.value);
  source.value = '';
}
watch(
  () => [props.fileId, access.accessToken, revision.value],
  async () => {
    const current = ++generation;
    release();
    failed.value = false;
    loading.value = !!props.fileId && !!access.accessToken;
    if (!loading.value) return;
    controller = new AbortController();
    try {
      const response = await fetch(getFilePreviewUrl(props.fileId), {
        headers: { Authorization: `Bearer ${access.accessToken}` },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('封面加载失败');
      const blob = await response.blob();
      if (current !== generation) return;
      source.value = URL.createObjectURL(blob);
    } catch {
      if (current === generation) {
        failed.value = true;
        loading.value = false;
      }
    }
  },
  { immediate: true },
);
function retry() {
  if (props.state === 'FAILED') emit('retry');
  else revision.value++;
}
onUnmounted(() => {
  generation++;
  release();
});
</script>
<template>
  <div class="absolute inset-0 bg-muted/30">
    <img
      v-if="source && !failed"
      :src="source"
      :alt="title"
      class="h-full w-full object-cover"
      @load="loading = false"
      @error="
        failed = true;
        loading = false;
      "
    />
    <div
      v-if="!source || loading || failed"
      class="absolute inset-0 flex items-center justify-center"
      :class="{ 'animate-pulse': loading || state === 'PENDING' }"
    >
      <VideoCameraOutlined class="text-3xl text-muted-foreground opacity-20" />
    </div>
    <button
      v-if="failed || state === 'FAILED'"
      type="button"
      aria-label="重试封面"
      class="absolute left-1/2 top-1/2 z-20 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground"
      @click.stop="retry"
    >
      <ReloadOutlined />
    </button>
  </div>
</template>

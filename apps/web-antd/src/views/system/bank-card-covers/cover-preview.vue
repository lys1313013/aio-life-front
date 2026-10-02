<script setup lang="ts">
import { ref } from 'vue';

import {
  LoadingOutlined,
  PictureOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import { useAuthImageUrl } from '#/composables/useAuthImageUrl';
import { clearImageCache } from '#/utils/file';

const props = defineProps<{ fileId?: string; name: string }>();
const retry = ref(0);
const { blobUrl, error, loading } = useAuthImageUrl(() => {
  void retry.value;
  return props.fileId;
});
function retryImage() {
  clearImageCache(props.fileId);
  retry.value++;
}
</script>

<template>
  <div class="cover-preview" :aria-busy="loading">
    <span v-if="loading" role="status" aria-label="加载卡面">
      <LoadingOutlined spin />
    </span>
    <button
      v-else-if="error"
      type="button"
      class="cover-retry"
      :aria-label="`重试${name}图片`"
      @click.stop="retryImage"
    >
      <ReloadOutlined />
    </button>
    <img v-else-if="blobUrl" :src="blobUrl" :alt="name" @error="error = true" />
    <PictureOutlined v-else role="img" aria-label="待上传卡面" />
  </div>
</template>

<style scoped>
.cover-preview {
  display: grid;
  width: 100%;
  aspect-ratio: 1.586;
  overflow: hidden;
  place-items: center;
  border-radius: 12px;
  background: hsl(var(--muted) / 50%);
  color: hsl(var(--muted-foreground));
  font-size: 24px;
}
.cover-preview img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  object-fit: contain;
}
.cover-retry {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.cover-retry:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
</style>

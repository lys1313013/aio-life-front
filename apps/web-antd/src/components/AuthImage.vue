<script setup lang="ts">
import { useAuthImageUrl } from '#/composables/useAuthImageUrl';

const props = defineProps<{
  fileId?: number | string | null;
}>();

const { blobUrl, loading } = useAuthImageUrl(() => props.fileId);
</script>

<template>
  <img
    v-if="blobUrl"
    :src="blobUrl"
    v-bind="$attrs"
  />
  <div
    v-else
    v-bind="$attrs"
    class="auth-image-placeholder"
    :class="{ loading: loading }"
    aria-hidden="true"
  />
</template>

<style scoped>
.auth-image-placeholder {
  background: var(--color-fill-tertiary, #f5f5f5);
  min-height: 40px;
}

.auth-image-placeholder.loading {
  animation: auth-image-pulse 1.5s ease-in-out infinite;
}

@keyframes auth-image-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
</style>

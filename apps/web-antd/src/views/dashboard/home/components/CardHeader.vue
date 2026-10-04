<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  disabled?: boolean;
  label: string;
  loading?: boolean;
  refresh: () => unknown;
  showIndicator?: boolean;
}>();
const pending = ref(false);

async function handleRefresh() {
  if (pending.value || props.loading || props.disabled) return;
  pending.value = true;
  try {
    await props.refresh();
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <header
    class="card-header relative flex shrink-0 items-center justify-between"
  >
    <button
      type="button"
      class="card-header-refresh absolute inset-0 rounded-t-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      :aria-label="label"
      :aria-busy="pending || loading"
      :disabled="pending || loading || disabled"
      @mousedown.stop
      @touchstart.stop
      @click.stop="handleRefresh"
    ></button>
    <slot></slot>
    <span
      v-if="showIndicator !== false && (pending || loading)"
      class="card-header-progress pointer-events-none absolute inset-x-3 bottom-0 h-0.5 animate-pulse rounded bg-primary/40 motion-reduce:animate-none"
      aria-hidden="true"
    ></span>
  </header>
</template>

<style scoped>
/* 标题和操作位于空白刷新区域上方，互不触发。 */
.card-header > :deep(:not(.card-header-refresh, .card-header-progress)) {
  position: relative;
  z-index: 1;
}
</style>

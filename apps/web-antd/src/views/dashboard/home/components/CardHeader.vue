<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  disabled?: boolean;
  error?: boolean;
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
      @click.stop="handleRefresh"
    ></button>
    <slot></slot>
    <button
      v-if="error"
      type="button"
      class="card-header-error absolute right-10 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-destructive hover:bg-accent"
      :aria-label="`${label.replace(/^刷新/, '')}加载失败，重试`"
      :disabled="pending || loading || disabled"
      @click.stop="handleRefresh"
    >
      <svg
        aria-hidden="true"
        class="size-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5"
        />
      </svg>
    </button>
    <span
      v-if="showIndicator !== false && (pending || loading)"
      class="card-header-progress pointer-events-none absolute inset-x-3 bottom-0 h-0.5 animate-pulse rounded bg-primary/40 motion-reduce:animate-none"
      aria-hidden="true"
    ></span>
  </header>
</template>

<style scoped>
/* 标题和操作位于空白刷新区域上方，互不触发。 */
.card-header
  > :deep(
    :not(.card-header-refresh, .card-header-progress, .card-header-error)
  ) {
  position: relative;
  z-index: 1;
}
</style>

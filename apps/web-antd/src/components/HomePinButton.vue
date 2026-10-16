<script setup lang="ts">
import { computed } from 'vue';

import {
  LoadingOutlined,
  PushpinFilled,
  PushpinOutlined,
} from '@ant-design/icons-vue';

const props = defineProps<{
  disabled?: boolean;
  loading?: boolean;
  pinned: boolean;
  revealOnHover?: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();
const label = computed(() => (props.pinned ? '取消首页固定' : '固定到首页'));
</script>

<template>
  <button
    type="button"
    class="home-pin-button"
    :class="{
      'home-pin-button--active': pinned,
      'home-pin-button--loading': loading,
      'home-pin-button--reveal': revealOnHover && !pinned && !loading,
    }"
    :disabled="disabled || loading"
    :aria-label="label"
    :aria-pressed="pinned"
    :aria-busy="loading || undefined"
    :title="label"
    @click.stop="emit('toggle')"
  >
    <LoadingOutlined v-if="loading" spin aria-hidden="true" />
    <PushpinFilled v-else-if="pinned" aria-hidden="true" />
    <PushpinOutlined v-else aria-hidden="true" />
  </button>
</template>

<style scoped>
.home-pin-button {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 15px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    opacity 0.15s ease;
}

.home-pin-button--active {
  color: hsl(var(--primary));
}

.home-pin-button:hover:not(:disabled) {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 8%);
}

.home-pin-button:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.home-pin-button:disabled {
  cursor: default;
}

@media (hover: hover) and (pointer: fine) {
  .home-pin-button--reveal {
    opacity: 0;
  }

  :global(.home-pin-surface:hover .home-pin-button--reveal),
  :global(.home-pin-surface:focus-within .home-pin-button--reveal),
  .home-pin-button--reveal:focus-visible {
    opacity: 1;
  }
}

@media (pointer: coarse) {
  .home-pin-button {
    width: 44px;
    height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-pin-button {
    transition: none;
  }
}
</style>

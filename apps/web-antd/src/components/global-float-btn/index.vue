<script setup lang="ts">
import { PlusOutlined } from '@ant-design/icons-vue';

// 定义组件的 props 和 emits
defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['click']);

const handleClick = (disabled: boolean) => {
  if (!disabled) {
    emit('click');
  }
};
</script>

<template>
  <button
    type="button"
    aria-label="新增"
    class="global-floating-btn"
    :class="{ 'is-disabled': disabled }"
    :disabled="disabled"
    @click="handleClick(disabled)"
  >
    <PlusOutlined class="global-plus-icon" />
  </button>
</template>

<style scoped lang="less">
.global-floating-btn {
  --float-btn-bg: rgb(255 255 255 / 85%);
  --float-btn-hover-bg: rgb(255 255 255 / 95%);
  --float-btn-color: rgb(82 88 102);
  --float-btn-border: rgb(82 88 102 / 15%);
  --float-btn-inset: rgb(255 255 255 / 20%);
  --float-btn-shadow: rgb(0 0 0 / 15%);

  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 0;
  color: var(--float-btn-color);
  cursor: pointer;
  user-select: none;
  background-color: var(--float-btn-bg);
  border: 1px solid var(--float-btn-border);
  border-radius: 50%;
  box-shadow:
    0 4px 16px var(--float-btn-shadow),
    inset 0 1px 0 var(--float-btn-inset);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);

  .global-plus-icon {
    font-size: 24px;
    color: inherit;
  }

  &:not(.is-disabled):hover {
    background-color: var(--float-btn-hover-bg);
    box-shadow:
      0 6px 20px var(--float-btn-shadow),
      inset 0 1px 0 var(--float-btn-inset);
    transform: scale(1.05);
  }

  &:not(.is-disabled):active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 3px solid rgb(156 163 175);
    outline-offset: 4px;
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.45;
    box-shadow: none;
  }
}

:global(.dark .global-floating-btn) {
  --float-btn-bg: rgb(255 255 255 / 8%);
  --float-btn-hover-bg: rgb(255 255 255 / 14%);
  --float-btn-color: rgb(229 231 235);
  --float-btn-border: rgb(255 255 255 / 22%);
  --float-btn-inset: rgb(255 255 255 / 14%);
  --float-btn-shadow: rgb(0 0 0 / 25%);
}

/* 移动端适配 */
@media (max-width: 1024px) {
  .global-floating-btn {
    right: 24px;
    bottom: 24px;
    width: 48px;
    height: 48px;

    .global-plus-icon {
      font-size: 20px;
    }
  }
}
</style>

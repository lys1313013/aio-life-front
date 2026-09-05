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
  <div
    class="global-floating-btn"
    :class="{ 'is-disabled': disabled }"
    @click="handleClick(disabled)"
  >
    <PlusOutlined class="global-plus-icon" />
  </div>
</template>

<style scoped lang="less">
.global-floating-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  cursor: pointer;
  user-select: none;
  background-color: var(--global-float-btn-bg, rgb(24 144 255 / 45%));
  border-radius: 50%;
  box-shadow: 0 4px 16px rgb(0 0 0 / 15%);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);

  .global-plus-icon {
    font-size: 24px;
    color: white;
  }

  &:not(.is-disabled):hover {
    background-color: var(--global-float-btn-hover-bg, rgb(24 144 255 / 55%));
    box-shadow: 0 6px 20px rgb(0 0 0 / 20%);
    transform: scale(1.05);
  }

  &:not(.is-disabled):active {
    transform: scale(0.95);
  }

  &.is-disabled {
    cursor: not-allowed;
    background-color: rgb(150 150 150 / 60%);
    box-shadow: none;
  }
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
